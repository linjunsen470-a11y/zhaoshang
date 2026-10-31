# 环境变量与仓库维护

## 配置放在哪里

| 位置 | 用途 | 更新方式 |
| --- | --- | --- |
| 根目录 `.env` | 云端 Compose 参数，以及本机 SSH、仓库和 CMS 维护凭据 | 仅影响本机读取此文件的命令 |
| `backend/.env` | 本地 Next/Payload 开发，连接独立开发库 | 修改后重启本地开发进程 |
| 服务器 `/opt/zhaoshang-test/.env` | 线上容器运行配置 | 在服务器修改，按需重新创建相应容器 |
| GitHub Secrets / Variables | 镜像推送及 SSH 发布 | 在 GitHub 单独更新；不会自动读取本机 `.env` |
| CMS「腾讯文档同步 → 连接设置」 | 云端腾讯文档地址、Token 和工作表配置 | 保存到持久化同步卷，不随应用镜像替换 |

两份 `.env.example` 分别对应根目录和后台开发环境。复制模板只用于首次配置，不要用模板覆盖已有密钥。文件使用 UTF-8，注释单独占行；含 `#`、空格等特殊字符的值应正确加引号。凭据不写入 Markdown、截图或日志。

## 主要变量

- **镜像**：`APP_IMAGE` 与 `TOOLS_IMAGE` 使用同一提交的完整 SHA 标签。CI 负责更新服务器的值；本机值只是本机维护时的参考，不会跟随远端自动更新。
- **数据库**：`DATABASE_URI` 与 `POSTGRES_USER`、`POSTGRES_PASSWORD`、`POSTGRES_DB` 必须一致。云端容器使用主机名 `db`；本地开发填写独立数据库地址。连接串内的密码需要 URL 编码。修改 `.env` 不会自动修改已有 PostgreSQL 账号或数据库。
- **应用密钥**：`PAYLOAD_SECRET` 和 `MINIPROGRAM_TOKEN_SECRET` 使用不同的强随机值。更换会影响已有会话或令牌，不能当作普通排版操作。
- **运行模式**：云端 Compose 固定 `PAYLOAD_DB_PUSH=false`、`WECHAT_AUTH_MODE=wechat`。根环境文件保留相同值用于静态检查；仅修改根文件不能覆盖 Compose 中的固定设置。结构变更按 [数据库说明](schema-setup.md) 显式执行。
- **微信**：`WECHAT_APPID` 与小程序项目配置一致，AppSecret 属于该 AppID。`WECHAT_CODE_ENV_VERSION` 控制生成小程序码的目标版本，不控制客户端 API 地址；客户端地址在 `mp/config/environments.js`。
- **腾讯文档**：根 `.env` 的 MCP 地址及 Token 仅供本机维护，不由 Compose 自动传入容器。云端在 CMS 配置。本地 `backend/.env` 中非空的 MCP 变量优先于 CMS 保存值；如需通过后台修改连接，先清除对应环境变量并重启。
- **仓库**：`REGISTRY_HOST` 仅填主机名，`REGISTRY_IMAGE` 填完整仓库路径且不带标签。`REGISTRY_NAMESPACE` 仅便于查看，CI 使用完整路径。GitHub 变量、Secrets 的对应关系见 [持续部署说明](ci-deployment.md)。
- **维护账号**：SSH 和 `CMS_ADMIN_*` 仅供本机维护使用，不注入应用容器。填写 CMS 账号不会创建或重置后台用户。CI 使用专用 SSH 密钥。

## 仓库卫生

提交源码、锁文件、部署脚本和脱敏模板。`.env`、私钥、数据库 dump、媒体目录、同步凭据、构建缓存与测试产物由 `.gitignore` 排除。排除规则不会自动移除已经被 Git 跟踪的文件。

临时验证脚本放 `scratch/`，测试输出放 `test-results/`。不要把真实运行数据当作冗余文件清理；不要用 `git clean -fdx` 清空工作区。页面入口、Next.js 约定文件、锁文件和仍被测试使用的 Mock 工具应保留。

文档以根 README、本文、数据库说明和持续部署说明为当前入口；带日期的部署、迁移与验收记录只描述当时状态，不能替代当前命令。

## 提交但不构建

仅文档、注释或已验证无行为变化的清理，可使用：

```bash
git commit -m "Tidy configuration and repository files [skip ci]"
git push origin main
```

根据 [GitHub 官方说明](https://docs.github.com/en/actions/how-tos/manage-workflow-runs/skip-workflow-runs)，`[skip ci]` 跳过本次 push / pull_request 触发的 Actions，不会永久关闭工作流，也不阻止人工 `workflow_dispatch`。跳过后线上镜像仍是上一部署版本，这是预期结果。功能、依赖、权限或部署逻辑变更应正常运行 CI。
