# GitHub Actions 与腾讯云部署

仓库：`linjunsen470-a11y/zhaoshang`。当前目标是腾讯云测试环境 `/opt/zhaoshang-test`，域名 `https://api.cqwushi.com`。

后台容器、本地测试与 CI 统一使用 Node.js 24；测试命令中的 `--test-isolation=none` 不支持旧 Node 22。

## 日常流程

1. 在工作分支修改代码并创建 PR。
2. `CI and deploy` 检查客户端/后端单元测试、CMS 测试、ESLint、ShellCheck，并构建生产镜像（包含 TypeScript 检查）。
3. PR 通过后合入 `main`。流水线重新检查，将应用及工具镜像发布到腾讯云镜像仓库，以完整 commit SHA 标记。
4. 部署 job 使用专用 SSH 密钥和固定主机公钥，服务器从腾讯云仓库拉取已构建的镜像，备份数据库，再更新后台；不执行 npm/pnpm 安装或应用编译。
5. 等待容器健康检查，验证 HTTPS 房源 API、登录页以及匿名访问员工 API 必须被拒绝。失败自动恢复之前的 `.env`、Compose 和镜像。

也可在 Actions 页面手动运行 `CI and deploy`，选择 `main`。部署环境 `tencent-test` 仅允许 `main`。同一分支的发布不会互相中断，服务器另有文件锁防止并发部署。

## 配置

Environment `tencent-test` 的 Secrets：

| 名称 | 用途 |
| --- | --- |
| `DEPLOY_HOST` | SSH 主机 |
| `DEPLOY_PORT` | SSH 端口 |
| `DEPLOY_USER` | SSH 用户 |
| `DEPLOY_SSH_KEY` | 本项目专用私钥 |
| `DEPLOY_KNOWN_HOSTS` | 已核实的服务器公钥，禁止跳过主机验证 |

同一 Environment 的 Variables：`DEPLOY_PATH=/opt/zhaoshang-test`、`PUBLIC_URL=https://api.cqwushi.com`。
SSH 私钥写入前自动去除 Windows 回车符。Docker 生产依赖独立裁剪并缓存，业务代码修改不会重新裁剪依赖。

Repository Variables：`REGISTRY_HOST=ccr.ccs.tencentyun.com`、`REGISTRY_IMAGE=ccr.ccs.tencentyun.com/jinyi_zhaoshang/wechat_app`。
Repository Secrets：`REGISTRY_USER`、`REGISTRY_PASSWORD`，供 main 构建推送及部署拉取使用。PR 构建不登录或推送仓库，部署仍受 tencent-test 的 main 分支限制。

应用镜像为 `<REGISTRY_IMAGE>:<commit>`，工具镜像为 `<REGISTRY_IMAGE>-tools:<commit>`。仓库命名空间必须预先创建，仓库可在首次推送时创建。镜像层复用，服务器直接走腾讯云仓库，避免依赖 GitHub/GHCR 跨境大文件下载。拉取凭据通过 SSH 标准输入传输，临时 Docker 登录配置用后删除，不写入服务器业务 `.env`。

初次联调曾使用 GitHub 成品镜像经 SSH + rsync 验证完整发布，并一次性初始化缓存；最终常规流程统一使用腾讯云仓库，避免保留两套发布方式。

数据库密码、微信 AppSecret、Payload 密钥仍保存在服务器 `.env`，不会写进镜像、Actions 参数或公开日志。腾讯文档 Token 保存在持久化同步卷。根目录 `.env.example` 是云端模板；`backend/.env.example` 是本地开发模板。更新服务器应用密钥后按需重新创建应用容器，更新腾讯 Token 使用后台“连接设置”。

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

HTTPS 证书目前通过 DNS 手动签发，Actions 不负责证书续期；到期前需完成续签或单独配置 DNS 自动续期。

## 数据库处理建议（当前未正式上线）

- **现在**：PostgreSQL 继续运行在现有腾讯云私有 Compose 网络中，数据写入独立卷；GitHub runner 不持有数据库密码、不连接业务库，也不打包数据。应用发布只读用现有库，不恢复演示库、不重新初始化。
- **普通更新**：自动做 `pg_dump -Fc`，只替换应用镜像。不要随代码发布升级 PostgreSQL 大版本。
- **字段变化**：先在独立测试库确认当前 Schema 和数据，再暂停写入及同步任务、备份数据库与媒体，从 GitHub 已构建好的 tools 镜像显式执行结构变更。检查通过后启动对应应用并恢复写入；该步骤目前不自动执行。
- **正式上线前**：将可重建演示数据与真实业务库分开；若结构变更变得频繁，再采用提交到仓库的版本化迁移脚本。没有必要现在引入复杂的多环境数据库平台。
- **备份建议**：日常全量备份并保留最近 7 天、每周一份保留 4 周；复制到另一台机器或对象存储，并定期演练恢复。当前流水线已实现发布前备份，定时和异地备份尚未配置，不应把“已有备份文件”等同于已验证可恢复。
- **失败恢复**：应用回退和数据库恢复分开处理。只有确认数据库结构/数据本身需要恢复时才使用备份，恢复前保留当前库；不能为了回退前端或接口代码就覆盖数据库，避免丢掉发布后新增咨询。

服务器运行的是成品容器。`tools` 镜像包含必要的维护脚本及已安装依赖，但服务器不执行包安装或应用编译。
