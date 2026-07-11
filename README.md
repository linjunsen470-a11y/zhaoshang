# 校园商铺招商平台

面向校园商铺房源展示、店铺转让、咨询收集和餐饮设备供需的小程序与管理后台。

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

登录 `http://localhost:3000/admin` 后直接进入房源管理：

- `房源管理`：搜索、筛选、快速修改、批量上下架和完整编辑。
- `咨询收件箱`：仅维护待联系、已联系、已结束和一条内部备注。
- `设备供需`：独立维护待整理、已发布和已下架。
- `系统设置`：管理员维护账号；媒体库仅管理员可见。

后台角色只有：

- `admin`：内容管理、账号管理和永久删除。
- `editor`：房源上下架、咨询处理和设备发布。

## 本地开发

安装依赖：

```bash
pnpm install
pnpm --dir backend install
```

复制环境变量并启动 PostgreSQL：

```bash
cp backend/.env.example backend/.env
docker compose up -d db
```

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
| POST | `/api/admin/inquiries/:id/create-property` | 转让咨询生成房源草稿 |

小程序 API 使用 Bearer Token 并按 `submitterOpenId` 隔离；管理 API 只接受 Payload 登录会话。

## 验证

```bash
pnpm backend:lint
pnpm --dir backend test:cms
node backend/node_modules/typescript/bin/tsc --noEmit -p backend/tsconfig.json
pnpm backend:build
```

微信开发者工具中应验证房源浏览、咨询提交与编辑、图片上传、设备列表、Token 刷新和隐私政策页面。

## 生产配置

- 必须设置强随机 `PAYLOAD_SECRET`。
- 必须使用真实 HTTPS `PAYLOAD_PUBLIC_SERVER_URL`。
- 生产设置 `WECHAT_AUTH_MODE=wechat` 并配置真实微信 AppID/AppSecret。
- 不提交 `.env`、`.next/`、`node_modules/`、上传目录或日志。

详细上线步骤见 [docs/miniprogram-launch-checklist.md](docs/miniprogram-launch-checklist.md)，后台设计说明见 [docs/payload-admin-ux-audit.md](docs/payload-admin-ux-audit.md)。
