# 校园商铺招商平台

这是一个面向校园商铺招商、店铺转让和餐饮设备供需撮合的全栈项目。当前仓库包含微信小程序、Payload CMS 后台、Next.js 网站/API、本地 mock 服务和 Docker 部署配置。

## 项目结构

```text
admin/                 静态 mock 管理后台，配合根目录 server.js 使用
backend/               Payload CMS + Next.js 后台、网站和生产 API
backend/app/api/       小程序兼容 API、登录 API、上传 API
backend/collections/   Payload collections：项目、线索、媒体、跟进记录等
backend/scripts/       demo 数据和 seed 脚本
docs/                  产品和需求文档
mp/                    微信小程序客户端
mp/config.js           顾问电话、表单长度等客户端配置
mp/services/           小程序 API、登录和上传服务封装
mp/utils/              表单校验与编辑加载等共享工具
data.json              根目录 mock 服务数据文件
docker-compose.yml     Payload + PostgreSQL 容器编排
server.js              轻量 mock API/admin 服务
```

## 主要能力

- 项目展示：校园铺位、食堂档口、商业街铺位和店铺转让机会。
- 多图详情：项目详情支持多张图片左右滑动和预览。
- 线索提交：找铺咨询、店铺转让委托、设备出售/求购/回收需求。
- 线索管理：用户可查看、编辑、删除自己提交的咨询记录。
- 图片上传：小程序端压缩图片后上传，后端再次压缩并写入 Payload Media。
- 用户隔离：小程序提交记录按微信 `openid`（或本地 mock 的 `devOpenId`）隔离。
- 设备供需广场：公开列表展示设备线索，联系方式隐藏，区域与备注做截断脱敏。
- 隐私合规：小程序内置隐私政策页面。
- CMS 管理：Payload 后台维护项目、线索、跟进记录和媒体资源。
- 双模式调试：支持纯本地 mock 演示，也支持小程序直连本地 Payload CMS。

## 本地开发

### 1. 安装依赖

```bash
pnpm install
pnpm --dir backend install
```

### 2. 启动轻量 mock 服务

适合只调小程序界面和演示数据，不依赖 PostgreSQL。

```bash
pnpm dev
```

访问：

- Mock API: `http://localhost:5173/api`
- Mock admin: `http://localhost:5173/admin/index.html`

小程序使用该模式时，可在 [mp/app.js](mp/app.js) 中设置：

```js
useLocalMock: true
```

Mock 管理后台请求线索列表时会自动携带 `X-Admin-Access: local-admin` 请求头。可通过环境变量 `ADMIN_ACCESS_KEY` 覆盖默认值。

### 3. 启动 Payload CMS 联调

复制后端环境变量：

```bash
cp backend/.env.example backend/.env
```

本地调试建议配置：

```env
PAYLOAD_SECRET=local-development-secret
DATABASE_URI=postgres://payload:payload@localhost:5432/payload
PAYLOAD_PUBLIC_SERVER_URL=http://localhost:3000

WECHAT_AUTH_MODE=dev
WECHAT_AUTH_DEV_OPENID=dev-openid-local
WECHAT_APPID=wx22fb8f72be05d5c3
WECHAT_APP_SECRET=
```

启动数据库和后端：

```bash
docker compose up -d db
pnpm backend:dev
```

初始化 demo 数据和真实 demo 图片：

```bash
pnpm backend:seed
```

访问：

- Website: `http://localhost:3000`
- Payload admin: `http://localhost:3000/admin`
- 小程序 API: `http://localhost:3000/api/projects`

### 4. 微信小程序联调

用微信开发者工具导入 `mp/project.config.json`。

直连 Payload CMS 时，在 [mp/app.js](mp/app.js) 中设置：

```js
apiUrl: 'http://127.0.0.1:3000/api',
useLocalMock: false,
devOpenId: 'dev-openid-local'
```

本地调试需在微信开发者工具中关闭合法域名校验：`详情 -> 本地设置 -> 不校验合法域名、web-view、TLS 版本以及 HTTPS 证书`。

如需模拟不同用户，把 `devOpenId` 改成不同值，例如 `dev-user-b`。小程序历史记录会按该身份隔离。

仅在 `useLocalMock: true` 时，登录请求才会发送 `X-Dev-OpenId`；生产联调请勿依赖该请求头。

## Payload API

小程序主要使用以下兼容 API：

| 方法 | 路径 | 认证 | 说明 |
|------|------|------|------|
| POST | `/api/auth/wechat-login` | 否 | 换取 Bearer Token |
| GET | `/api/projects` | 否 | 项目列表，支持 `public=true` 等筛选 |
| GET | `/api/projects/:id` | 否 | 项目详情 |
| GET | `/api/leads` | 是 | 当前用户的线索列表 |
| GET | `/api/leads/:id` | 是 | 单条线索详情（校验所有权） |
| POST | `/api/leads` | 是 | 创建线索 |
| PUT | `/api/leads/:id` | 是 | 更新线索（仅用户可编辑字段） |
| DELETE | `/api/leads/:id` | 是 | 删除线索（校验所有权） |
| GET | `/api/equipments` | 否 | 设备供需公开列表（脱敏） |
| POST | `/api/uploads/lead-image` | 是 | 上传线索图片 |
| GET | `/api/stats` | 否 | 运营统计 |

认证说明：

- 线索相关接口要求 `Authorization: Bearer <token>`。
- 未带 Token 的 `GET /api/leads` 返回 `401`；不再返回全部线索。
- Token 过期时，小程序会自动清缓存并重新登录后重试一次。
- 本地 `WECHAT_AUTH_MODE=dev` 会签发开发 token；生产请使用 `WECHAT_AUTH_MODE=wechat` 并配置真实 `WECHAT_APPID`、`WECHAT_APP_SECRET`。

安全约束：

- 小程序创建线索时，`status` 固定为 `new`，不接受客户端传入 CRM 字段。
- 小程序更新线索时，仅允许修改称呼、联系方式、需求内容、附件等用户字段。
- 创建/更新线索时，后端会校验 `attachments` 中媒体 ID 的 `ownerOpenId` 归属。
- API 响应不返回 `submitterOpenId`、`owner`、`closedAmount` 等内部字段。

## 数据模型摘要

- `projects`：招商铺位和转让机会，支持封面图、多图、适合业态、费用、转让信息等。
- `leads`：统一线索池，支持 `leasing`、`transfer`、`equipment_sell`、`equipment_buy`、`equipment_recycle`、`brand_cooperation`。
- `leads.transferDetails`：店铺位置、费用、转让费、剩余合同期、是否含设备。
- `leads.equipmentDetails`：设备名称、规格、状态、期望价格。
- `leads.attachments`：用户上传图片，对应 Payload `media`。
- `leads.submitterOpenId`：小程序用户身份隔离字段（仅 CMS 内部使用，不下发客户端）。
- `media`：项目 demo 图片和用户上传图片，记录来源、`ownerOpenId`、压缩大小等。
- `follow-records`：招商顾问跟进时间线。

## 验证命令

```bash
pnpm backend:lint
pnpm backend:build
```

小程序 JS 语法检查可使用：

```powershell
Get-ChildItem -Path mp -Recurse -Filter *.js | ForEach-Object { node --check $_.FullName }
```

微信开发者工具中建议验证：

- 提交找铺/转让/设备线索并上传图片
- 在「我的咨询记录」中编辑、删除自己的线索
- Token 过期或重新登录后的接口重试
- 设备供需列表不展示联系方式
- 「我的」页可打开隐私政策

## Docker 部署

复制根环境变量：

```bash
cp .env.example .env
```

配置强密码和生产域名：

```env
PAYLOAD_SECRET=change-this-to-a-strong-random-value-in-production
PAYLOAD_PUBLIC_SERVER_URL=https://your-domain.example
POSTGRES_USER=payload
POSTGRES_PASSWORD=change-this-postgres-password
POSTGRES_DB=payload

WECHAT_AUTH_MODE=wechat
WECHAT_APPID=your-wechat-appid
WECHAT_APP_SECRET=your-wechat-app-secret
```

启动：

```bash
docker compose up -d --build
```

生产环境请通过 Nginx、Caddy 或云厂商负载均衡提供 HTTPS，再把小程序 `apiUrl` 改为 `https://your-domain.example/api`，并在微信公众平台配置 request/upload 合法域名。