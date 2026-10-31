# 锦奕招商

微信小程序、Payload 员工后台和房源 API。当前为腾讯云测试环境，尚未正式上线。

- 后台：<https://api.cqwushi.com/admin>
- 小程序开发版直接连接云端；体验版与正式版地址仍需在 `mp/config/environments.js` 配置。
- 自动部署、备份和回退见 [持续部署说明](docs/ci-deployment.md)。日常操作见 [CMS 指南](docs/payload-cms-quickstart.md)。

## 结构

| 目录 | 用途 |
| --- | --- |
| `mp/` | 微信小程序，使用 `mp/project.config.json` 打开 |
| `backend/` | Payload CMS、Next.js 网站及 API |
| `website/` | 独立公司网站，不随本流水线部署 |
| `deploy/` | SSH 发布、上线检查及 Nginx 配置参考 |
| `docker-compose.yml` | 唯一云端编排：PostgreSQL、后台、维护工具和可选同步进程 |
| `server.js`、`data.json` | 本地 Mock API 与示例数据 |
| `docs/` | [文档索引](docs/README.md) |

## 本地开发

使用 Node.js 24+、pnpm 11.5.0，准备独立开发数据库：

```bash
pnpm install --frozen-lockfile
pnpm --dir backend install --frozen-lockfile
cp backend/.env.example backend/.env
# 填写本地 DATABASE_URI 和密钥后，首次显式初始化数据库
pnpm --dir backend schema:push
pnpm dev
```

本地后台为 `http://127.0.0.1:3000/admin`。可用 `pnpm backend:seed` 生成演示数据。
小程序连接只由 `mp/config/environments.js` 控制：本地模拟显式设置 `useLocalMock: true`；本地 HTTP 联调运行 `pnpm mock:api`。没有隐藏的 Storage 开关。

配置分组与更新方式见 [环境变量说明](docs/configuration.md)。根目录 `.env` 用于云端部署及本机运维，`backend/.env` 用于本地开发；不要把云端数据库改成本机测试库，或将真实密钥提交到 Git。

## 后台

- 运营工作台：录入、咨询跟进、分享。
- 项目与铺位：搜索、编辑、上下架；次级入口提供分享素材和上架检查。
- 咨询收件箱：搜索、类型/状态/日期筛选、时间升降序、快速跟进。
- 腾讯文档同步：手动同步、连接检测；管理员配置默认折叠。当前定时同步未启用。
- 用户管理：管理员与普通用户两级员工账号（内部值 `admin` / `editor`）。只有管理员能管理账号和系统设置。

微信客户使用独立的微信登录身份。公开 API 不暴露未公开房源，咨询只能由本人或有权限的员工访问。

## 检查与部署

```bash
pnpm test:ci
pnpm --dir backend test:cms
pnpm backend:lint
pnpm backend:build
```

PR 自动运行测试、lint 和 Docker 构建；合入 `main` 后，将相同提交的应用/工具镜像发布到腾讯云镜像仓库，再通过 SSH 让服务器拉取成品镜像并启动。发布前备份数据库，失败自动恢复上一个镜像与配置。数据库结构变更必须单独备份并显式执行，不随启动自动修改。

真实 HTTP 合约需要隔离测试环境；微信 E2E 需要带开发者工具的自托管 runner，按需运行。跳过的测试不代表通过。详见 [自动化测试](docs/miniprogram-automation-test.md)。

当前 Compose 保留原 `zhaoshang-test` 项目名和持久卷，应用仅监听服务器 `127.0.0.1:3300`，由现有 Nginx/HAProxy 提供 HTTPS；不会接管客户其他网站。

## 维护

仅维护当前数据模型，不提供旧字段/旧状态兼容层。上传素材、数据库、同步配置和 `.env` 是运行数据，不属于冗余文件。临时脚本与结果放入已忽略的 `scratch/`、`test-results/`；历史文档仅用于追溯，不作为当前部署步骤。

仅文档、配置注释或无行为变化的卫生整理，可在提交信息中加入 `[skip ci]`，避免重新构建和部署。此时仓库提交会领先线上版本；功能、依赖或部署逻辑变更仍应正常运行 CI。
