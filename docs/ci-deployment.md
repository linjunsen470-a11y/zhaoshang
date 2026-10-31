# GitHub Actions 与腾讯云部署

仓库：`linjunsen470-a11y/zhaoshang`。当前目标是腾讯云测试环境 `/opt/zhaoshang-test`，域名 `https://api.cqwushi.com`。

后台容器、本地测试与 CI 统一使用 Node.js 24；测试命令中的 `--test-isolation=none` 不支持旧 Node 22。

## 日常流程

1. 在工作分支修改代码并创建 PR。
2. `CI and deploy` 先判断变更范围。代码变更执行单元测试、CMS 测试、ESLint、TypeScript、ShellCheck；后端运行代码、依赖或发布配置变化时，才构建应用和工具镜像。
3. PR 通过后合入 `main`。需要发布时将镜像推送到腾讯云仓库，以完整 commit SHA 标记；小程序、静态官网、测试文件或文档单独变化不触发后端镜像发布。
4. 部署 job 使用专用 SSH 密钥和固定主机公钥，服务器从腾讯云仓库拉取已构建的镜像，备份数据库，再更新后台；不执行 npm/pnpm 安装或应用编译。
5. 等待容器健康检查，验证 HTTPS 房源 API、登录页以及匿名访问员工 API 必须被拒绝。失败自动恢复之前的 `.env`、Compose 和镜像。

也可在 Actions 页面手动运行 `CI and deploy`，选择 `main`，显式执行完整检查、构建和发布。部署环境 `tencent-test` 仅允许 `main`。新 PR 提交取消同一 PR 的旧运行；主分支仍串行执行，正在进行的发布不会被取消，服务器另有文件锁防止并发部署。

### 变更范围与发布基线

`scripts/ci-plan.mjs` 使用现有 `tencent-test` 成功部署记录作为主分支发布基线，检查此后累计的后端和发布配置变化。因此，即使中间某次运行失败或排队任务被新提交替换，也不会因为最新提交只改文档而漏发之前的后端修改。PR 使用其目标分支基线，只验证、不发布。首次没有成功记录时检查完整源码树。部署记录查询失败会使检查失败，不会放行发布。

仅文档变更保留轻量计划任务，跳过依赖安装和后续任务。小程序、静态官网、测试、环境示例及 lint 配置变化执行检查，但不单独触发后端发布。`backend/` 的其余运行输入，以及 `docker-compose.yml`、`deploy/deploy.sh`、`deploy/check.sh`、CI 工作流和计划脚本变化，执行完整链路。发布配置单独变化仍通过 BuildKit 复用已有内容并生成新 SHA 标签，保持现有镜像版本规则。

镜像上下文排除测试和环境示例；测试类型检查在 `checks` job 中执行，应用镜像构建继续验证运行代码。应用启动期间每 5 秒检查健康状态，保留 90 秒启动宽限和正常运行的 30 秒检查间隔；公开接口、登录页和匿名访问限制使用有上限的短重试验收。数据库备份、卷、回退及独立官网发布入口保持原样。

## 配置

变量含义、本机与服务器的区别见 [环境变量说明](configuration.md)。仅文档或无行为变化的清理提交可加 `[skip ci]`，跳过本次 push 的构建和部署；正常功能发布不要使用。

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

### 镜像上传与依赖层复用

2026-10-31 的 `ccb7e89` 发布中，应用编译约 32 秒完成，GitHub 构建缓存导出也已完成；任务随后停留在腾讯仓库的 `pushing layers`，直到 35 分钟 job 上限取消。两次尝试使用美国 runner，日志没有提供上传失败的具体 HTTP 错误，因此只能定位到该上传链路或上传会话，不能进一步断言是限流、DNS 或某个网络设备的问题。

此次新上传层中，约 18 MB 来自应用输出，另有约 156.5 MB 来自完整生产依赖目录。依赖清单没有变化，但后者原来在应用输出之后使用普通 `COPY`，会随前面层的变化失去缓存复用；GitHub 构建缓存命中也不等于腾讯仓库已有对应镜像层。

生产依赖目录现使用 `COPY --link --chown=1001:1001`，让这一大层独立于应用输出复用，保留原有完整依赖及 Sharp/libvips 修复。这样日常业务代码变化不再要求重新复制该依赖层；首次生成新层或确实更新依赖时仍需上传。该优化减少大文件跨境上传的频率，不改变仓库、runner 或部署流程，也不增加常驻中转、代理和重试脚本。`--link` 的行为见 [Dockerfile 文档](https://docs.docker.com/reference/dockerfile/#copy---link)。

[独立 CI 验证](https://github.com/linjunsen470-a11y/zhaoshang/actions/runs/41193793961) 构建了两份真实生产镜像，中间修改一个应用静态文件：镜像整体发生变化，但约 156.5 MB 的依赖层摘要完全一致；容器 UID、依赖目录权限、Next/Payload/Sharp 模块解析及 Sharp 原生 PNG 编码均通过。验证未上传镜像或更新测试环境，临时验证分支已清理。

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

- **现在**：PostgreSQL 继续运行在现有腾讯云私有 Compose 网络中，数据写入独立卷；GitHub runner 不持有数据库密码、不连接业务库，也不打包数据。应用发布继续使用现有库，不恢复演示库、不重新初始化。
- **普通更新**：自动做 `pg_dump -Fc`，只替换应用镜像。不要随代码发布升级 PostgreSQL 大版本。
- **字段变化**：先在独立测试库确认当前 Schema 和数据，再暂停写入及同步任务、备份数据库与媒体，从 GitHub 已构建好的 tools 镜像显式执行结构变更。检查通过后启动对应应用并恢复写入；该步骤目前不自动执行。
- **正式上线前**：将可重建演示数据与真实业务库分开；若结构变更变得频繁，再采用提交到仓库的版本化迁移脚本。没有必要现在引入复杂的多环境数据库平台。
- **备份建议**：日常全量备份并保留最近 7 天、每周一份保留 4 周；复制到另一台机器或对象存储，并定期演练恢复。当前流水线已实现发布前备份，定时和异地备份尚未配置，不应把“已有备份文件”等同于已验证可恢复。
- **失败恢复**：应用回退和数据库恢复分开处理。只有确认数据库结构/数据本身需要恢复时才使用备份，恢复前保留当前库；不能为了回退前端或接口代码就覆盖数据库，避免丢掉发布后新增咨询。

服务器运行的是成品容器。`tools` 镜像包含必要的维护脚本及已安装依赖，但服务器不执行包安装或应用编译。
