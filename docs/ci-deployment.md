# 构建、部署与回退

更新日期：2026-11-01。GitHub 为主仓库；用户手动处理 Gitee 同步及流水线。助手默认只推送 GitHub，不操作 Gitee，除非用户另行明确要求。

## 当前流程

- GitHub `.github/workflows/ci.yml` 只保留手动代码检查；微信 E2E 也是手动工作流。push / pull_request 不触发构建或部署。旧镜像构建、部署和发布基线判断代码已移除。
- 用户同步目标提交至 Gitee 后，手动运行 main 的 `.workflow/gitee-verify.yml`。两个 BuildKit 任务成功后，自动执行 SSH 部署阶段。
- 镜像经腾讯 CCR 到 VPS；不再使用 VPS registry 或镜像 tar 直传。试验 registry 容器和 Nginx `/v2/` 入口已移除，数据卷暂保留。
- 腾讯云后台由用户设置自动清理，保留最近 **10 个版本**。仓库不再维护清理脚本或要求 CAM 删除凭据。回退前应确认目标标签仍在 CCR 或本机。

## 构建与凭据

后台、本机与检查工作流使用 Node.js 24、pnpm 11.5.0。Gitee 复用 `image-build-plus@buildkitd`：Node 基础镜像使用 DaoCloud，Alpine 使用清华 TUNA，pnpm 使用 `PNPM_CONFIG_REGISTRY=https://registry.npmmirror.com`。`BUILD_TARGET=tools` 选择维护镜像，应用使用默认阶段。

两个仓库为 `ccr.ccs.tencentyun.com/jinyi_zhaoshang/wechat_app` 与 `wechat_app-tools`，均使用同一完整提交 SHA；`buildcache` 用于构建缓存。

- Gitee 仓库凭证：`tencent-ccr-zhaoshang`，仅授权本项目。
- Gitee 加密通用变量：`DEPLOY_SSH_KEY`，必须通过 YAML 顶层 `ref_variable` 关联；只保存变量而不关联无法供任务使用。
- `deploy/gitee-deploy.sh` 使用 `deploy/known_hosts` 固定主机指纹，上传发布文件至 VPS 的提交专属目录，关闭密钥回显。
- VPS `/opt/zhaoshang-test/ccr-pull.env` 保存 shell 引号正确转义的 `REGISTRY_USER`、`REGISTRY_PASSWORD`，文件权限 600；密码通过标准输入交给 `deploy/deploy.sh`。不得提交这些配置。
- 本机 `.env` 的 `GITEE_ACCESS_TOKEN` 供 CLI 使用，CLI 不会自动加载项目 `.env`；不要将 Token 输出到日志。

## 已验证发布

2026-11-01 [第 10 次流水线](https://gitee.com/linjunsen470/zhaoshang/gitee_go/pipelines/builds/5316100)全部成功，部署提交为 `300be11c8435889f8c60c9b97e02e8792b0d905d`。

VPS `/opt/zhaoshang-test` 的应用与同步进程均使用该 SHA 的 CCR 镜像，应用和数据库健康，HTTPS 项目 API、登录页与匿名权限检查通过。发布前数据库备份为 `backups/20261101T032143Z-300be11c8435/`。同步任务处理 12 条房源、5 条咨询，无错误；详细记录见 [腾讯文档验证](tencent-sync-verification-2026-11-01.md)。

以后文档或整理提交可以领先服务器；以 VPS `deployed-revision` 和容器实际镜像为准，不因 GitHub 推送自动更新。

## Compose 与数据库

根目录 `docker-compose.yml` 是唯一来源，部署时复制为服务器 `compose.yml`。项目名 `zhaoshang-test` 和卷名保持不变：`postgres-data`、`media`、`tencent-sync`。数据库不映射公网端口。

普通发布不做 Schema 变更，`PAYLOAD_DB_PUSH=false`。需要变更时先备份，在服务器显式运行：

```bash
cd /opt/zhaoshang-test
sudo docker compose run --rm -T tools node node_modules/tsx/dist/cli.mjs scripts/push-schema.ts
```

备份位于 `backups/<UTC时间>-<短提交>/`，包含数据库 dump、上版环境和 Compose。上传媒体及同步卷需另行定期备份；此次流水线不覆盖或清空它们。上线后应配置异地备份和保留周期。

同步 worker 默认关闭；如已经运行，发布时同步更新工具镜像并重启 worker。启用定时同步需要后台启用开关，再运行 `sudo docker compose --profile sync up -d sync`。

## 手动回退

自动回退只恢复应用配置，不自动回滚数据库。若以后发布涉及 Schema 变更，应单独制定数据库恢复步骤。

```bash
cd /opt/zhaoshang-test
# 替换成实际的备份目录
cp backups/<目录>/previous.env .env
cp backups/<目录>/compose.yml compose.yml
sudo docker compose up -d --no-deps --wait payload
# 仅在原本启用同步时执行：
# sudo docker compose --profile sync up -d --no-deps sync
```

旧镜像暂时保留，确认不再需要后再按版本清理；不要执行 `docker compose down -v`。

## 测试边界

CI 不连接业务数据库、不使用微信真实用户身份。真实 HTTP 合约在未配置隔离测试环境时明确跳过；微信开发者工具 E2E 不在 GitHub Linux runner 上执行。旧 E2E 工作流因没有 runner 而停用，积压任务已取消；配置自托管 Windows runner 并重新启用后才能手动运行。

HTTPS 证书目前通过 DNS 手动签发，发布流水线不负责证书续期；到期前需完成续签或单独配置 DNS 自动续期。

## 数据库处理建议（当前未正式上线）

- **现在**：PostgreSQL 继续运行在现有腾讯云私有 Compose 网络中，数据写入独立卷；Gitee runner 不持有数据库密码、不连接业务库，也不打包数据。应用发布继续使用现有库，不恢复演示库、不重新初始化。
- **普通更新**：自动做 `pg_dump -Fc`，只替换应用镜像。不要随代码发布升级 PostgreSQL 大版本。
- **字段变化**：先在独立测试库确认当前 Schema 和数据，再暂停写入及同步任务、备份数据库与媒体，从 Gitee 已构建好的 tools 镜像显式执行结构变更。检查通过后启动对应应用并恢复写入；该步骤目前不自动执行。
- **正式上线前**：将可重建演示数据与真实业务库分开；若结构变更变得频繁，再采用提交到仓库的版本化迁移脚本。没有必要现在引入复杂的多环境数据库平台。
- **备份建议**：日常全量备份并保留最近 7 天、每周一份保留 4 周；复制到另一台机器或对象存储，并定期演练恢复。当前流水线已实现发布前备份，定时和异地备份尚未配置，不应把“已有备份文件”等同于已验证可恢复。
- **失败恢复**：应用回退和数据库恢复分开处理。只有确认数据库结构/数据本身需要恢复时才使用备份，恢复前保留当前库；不能为了回退前端或接口代码就覆盖数据库，避免丢掉发布后新增咨询。

服务器运行的是成品容器。`tools` 镜像包含必要的维护脚本及已安装依赖，但服务器不执行包安装或应用编译。
