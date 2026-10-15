# 校园商铺招商平台

面向校园、社区、文旅街区和购物中心的项目/铺位展示、转让、咨询收集和设备供需的小程序与管理后台。

2026-10-16 demo 审计与验证限制见 [预上线审计](docs/demo-prelaunch-audit-2026-10-16.md)。本地演示默认使用小程序 Storage；体验版/正式版仍需补齐发布配置与真机验收。

## 项目结构

```text
backend/               Payload CMS、统一房源后台、网站和生产 API
backend/app/admin/     房源工作台、咨询收件箱、设备供需等自定义后台界面
backend/collections/   房源、咨询、媒体和后台账号数据模型
backend/scripts/       数据迁移、Schema push 和演示数据脚本
mp/                    微信小程序客户端
docs/                  产品、上线和体验文档
server.js              仅供小程序联调的轻量 Mock API
data.json              Mock API 数据
docker-compose.yml     Payload + PostgreSQL 容器编排
```

Payload 是唯一管理后台。旧静态 Mock 后台已删除，`server.js` 不提供 `/admin` 页面。

## 后台结构

登录 `http://localhost:3000/admin` 后进入运营工作台：

- `运营工作台`：三个日常入口与按提交时间排序的待联系咨询。
- `项目与铺位`：搜索、筛选、快速修改、批量上下架和完整编辑。
- `咨询收件箱`：仅维护待联系、已联系、已结束和一条内部备注。
- 设备供需：普通用户提交后先进入咨询收件箱，后台审核通过并设为“已发布”后才进入小程序公开列表；不再占用独立主导航。
- `分享素材` / `上架检查`：放在项目与铺位的工具入口，分别用于推广和发布资料核对。
- `系统设置`：管理员维护账号与媒体；editor 也可在业务编辑中使用媒体。

后台角色只有：

- `admin`：内容管理、账号管理和永久删除。
- `editor`：房源上下架、咨询处理和设备发布。

后台简明操作说明见 [Payload CMS 上手指南](docs/payload-cms-quickstart.md)。日常主导航为运营工作台、项目与铺位、咨询收件箱；系统设置仅管理员可见。

## 本地开发

安装依赖：

```bash
pnpm install
pnpm --dir backend install
```

先准备独立的 PostgreSQL 数据库，再复制环境变量：

```bash
cp backend/.env.example backend/.env
```

在 `backend/.env` 填写可用的 `DATABASE_URI` 和本地密钥；当前 Compose 只有后端服务，不创建 PostgreSQL。首次建库可显式执行 `pnpm --dir backend schema:push`，已有库升级需先备份并按下文迁移。

启动 Payload：

```bash
pnpm dev
```

常用地址：

- 网站：`http://localhost:3000`
- Payload 后台：`http://localhost:3000/admin`
- 小程序房源 API：`http://localhost:3000/api/projects`

需要纯 Mock API 时：

```bash
pnpm mock:api
```

Mock API 地址为 `http://localhost:5173/api`；访问 `/admin` 返回 404。

演示数据：

```bash
pnpm backend:seed
```

## 数据迁移

从旧 CRM 后台升级时，先备份并迁移数据，再推送新 Schema：

```bash
pnpm --dir backend migrate:property-cms
pnpm --dir backend exec tsx scripts/push-schema.ts
```

迁移脚本会：

- 在独立 `cms_backup` schema 中备份房源、咨询、账号、媒体及旧 CRM 表。
- 保留房源和媒体；不完整或未审核公开房源改回草稿。
- 将旧咨询状态映射为待联系、已联系、已结束。
- 将设备审核状态映射为待整理、已发布、已下架。
- 将旧 `advisor` 账号改为 `editor`。

Schema push 会删除已退出配置的商户档案、跟进记录和高级 CRM 字段。生产执行前请另做数据库快照。

生产 Compose 不会自动 push schema。需变更结构时，先备份数据库，再显式执行：

在维护环境中使用与目标数据库一致的 `DATABASE_URI`，执行 `pnpm --dir backend schema:push`。
当前 Compose 仅包含后端服务，数据库由 `DATABASE_URI` 指向外部 PostgreSQL。
不要在镜像构建期间推送业务数据库结构。

## 主要 API

| 方法 | 路径 | 用途 |
|------|------|------|
| POST | `/api/auth/wechat-login` | 小程序登录 |
| GET | `/api/projects` | 公开房源列表 |
| GET | `/api/projects/:id` | 公开房源详情 |
| GET/POST | `/api/leads` | 当前用户咨询列表/提交 |
| GET/PUT/DELETE | `/api/leads/:id` | 当前用户咨询详情与维护 |
| GET | `/api/equipments` | 已发布设备供需 |
| POST | `/api/uploads/lead-image` | 咨询图片上传 |
| GET/PATCH | `/api/admin/properties` | CMS 房源工作台 |
| GET/PATCH | `/api/admin/inquiries` | CMS 咨询收件箱 |
| GET/PATCH | `/api/admin/equipment` | CMS 设备供需 |
| GET | `/api/admin/wechat-code?projectId=...` | 为公开房源生成真实小程序码 |
| POST | `/api/admin/inquiries/:id/create-property` | 转让咨询生成房源草稿 |

小程序 API 使用 Bearer Token 并按 `submitterOpenId` 隔离；管理 API 只接受 Payload 登录会话。
普通用户提交的设备信息默认不公开；转让咨询只能生成草稿，且用户咨询附件不能直接作为公开房源图片。

## 验证

```bash
pnpm backend:lint
pnpm test:ci
pnpm --dir backend test:cms
pnpm backend:build
node scripts/mp-check-templates.mjs
pnpm launch:check
```

`backend:build` 包含 TypeScript 检查；模板编译需要微信开发者工具（非默认安装目录可设置 `MP_COMPILER_DIR`）。`test:ci` 默认跳过真实 HTTP 契约；需独立测试后端和两名测试用户，见 [自动化测试说明](docs/miniprogram-automation-test.md)。

历史安全与容器验收见 [2026-10-12 审计](docs/prelaunch-audit-2026-10-12.md)。
`launch:check` 检查发布配置，不输出密钥；开发环境配置未补齐时会返回非零退出码。

Payload 升级至 3.90.2 时，已有数据库需补充账号重置密码时间字段。先备份目标数据库，再预览和执行非破坏性迁移：

```bash
pnpm --dir backend migrate:payload-auth
pnpm --dir backend migrate:payload-auth -- --apply
```

确保维护环境的 `DATABASE_URI` 指向目标数据库，并在切换新版后端前完成迁移。

微信开发者工具中应验证房源浏览、咨询提交与编辑、图片上传、设备列表、Token 刷新和隐私政策页面。

## 生产配置

- 必须设置强随机 `PAYLOAD_SECRET`。
- 必须设置独立的强随机 `MINIPROGRAM_TOKEN_SECRET`；修改后现有小程序登录会话会失效并自动重新登录。
- 必须使用真实 HTTPS `PAYLOAD_PUBLIC_SERVER_URL`。
- 生产设置 `WECHAT_AUTH_MODE=wechat` 并配置真实微信 AppID/AppSecret。
- 保持 `PAYLOAD_DB_PUSH=false`；结构变更通过显式迁移执行。
- Compose 的 `payload-media` 卷用于持久化上传图片，备份时须与数据库一起处理。
- 不提交 `.env`、`.next/`、`node_modules/`、上传目录或日志。

详细上线步骤见 [docs/miniprogram-launch-checklist.md](docs/miniprogram-launch-checklist.md)，后台设计说明见 [docs/payload-admin-ux-audit.md](docs/payload-admin-ux-audit.md)。

## 分支约定

保留 `main`（已验证的 demo 基线）和 `codex/demo-prelaunch`（本轮集成与后续小修）；新功能按需临时开分支，合入后清理。旧 CMS、后台路由和小程序开发分支的提交应先确认已包含在 `main`，再删除分支引用。

## 文件维护

2026-10-16 清理了无引用的旧组件别名、重复 Schema 入口、5 张 Next 示例图、4 个闲置图标和 2 张旧演示 PNG。演示数据直接使用 `mp/images/demo/` 的四类摄影示意图；已有本地数据的旧图片地址仍会自动迁移。Schema 维护统一使用 `pnpm --dir backend schema:push`。

微信 `project.private.config.json` 保留在本机并停止跟踪；项目公共配置 `project.config.json`、`mp/project.config.json` 继续提交。`.gitignore` 排除环境文件、私钥、上传数据、编译缓存、测试报告、临时预览和编辑器备份；`.env.example`、API 上传路由、迁移脚本和测试源码继续纳入版本控制。

本机临时脚本放 `scratch/`，验证输出放 `test-results/`。这两个目录不提交；清理运行产物前确认不含仍需保留的验收证据。迁移文件、依赖锁文件及各层测试按用途保留。
