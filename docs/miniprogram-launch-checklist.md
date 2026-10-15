# Demo 与正式发布检查清单

更新：2026-10-16。当前复验结果见 [demo 预上线审计](demo-prelaunch-audit-2026-10-16.md)；微信端操作说明见 [自动化测试](miniprogram-automation-test.md)。

## 本地 demo

- [ ] 微信开发者工具打开 `mp/project.config.json`，使用 develop 模式。
- [ ] 保持 `mp/config/environments.js` 中 develop 的 `useLocalMock: true`；演示数据保存在本机 Storage，不需要后端。
- [ ] 浏览校园、社区、文旅、购物中心，检查列表筛选、详情和父项目/子铺位跳转。
- [ ] 提交找铺、转让、设备、装修咨询，检查隐私同意、字段错误、查询/编辑/删除与成功页返回。
- [ ] 演示摄影保留「示意 / 非实拍」标识；顾问占位电话仅用于本地演示，勿拨打测试。
- [ ] 本地连续导航存在历史自动化超时记录，手工复核「提交成功 → 首页 → 其他场景」及「子铺位 → 返回列表」。

网站与 CMS 演示需单独准备 PostgreSQL，设置 `backend/.env` 后运行 `pnpm dev`。当前 Compose 只有后端服务，不提供数据库。已有数据库升级先备份，按 [商业迁移说明](商业项目接入-迁移与发布说明.md) 与根目录 [README](../README.md#数据迁移) 操作。

## 代码闸门

```bash
pnpm backend:lint
pnpm test:ci
pnpm --dir backend test:cms
pnpm backend:build
node scripts/mp-check-templates.mjs
```

`backend:build` 包含类型检查；模板编译需要微信开发者工具，可用 `MP_COMPILER_DIR` 指定编译器目录。`test:ci` 默认跳过真实 HTTP 契约；配置独立测试后端与两名测试用户后再执行集成测试，勿写入业务库。

## 体验版 / 正式发布

先补齐真实配置，再运行 `pnpm launch:check`。本轮静态检查的 9 项缺项：

- [ ] trial HTTPS API 地址：`mp/config/environments.js`。
- [ ] release HTTPS API 地址：同上；trial/release 保持关闭 Mock 与开发 OpenID。
- [ ] 真实顾问电话：`mp/config/index.js`。
- [ ] 独立随机 `MINIPROGRAM_TOKEN_SECRET`，至少 32 字符且与 `PAYLOAD_SECRET` 不同。
- [ ] `WECHAT_AUTH_MODE=wechat`。
- [ ] 真实 `WECHAT_APP_SECRET`。
- [ ] `WECHAT_APPID` 与 `mp/project.config.json` 的 appid 一致。
- [ ] 正式版 `WECHAT_CODE_ENV_VERSION=release`（体验版按对应环境配置）。
- [ ] 真实 HTTPS `PAYLOAD_PUBLIC_SERVER_URL`。

静态检查还会检查 `PAYLOAD_SECRET`、`DATABASE_URI` 与 `PAYLOAD_DB_PUSH=false`。目标部署环境须单独检查；本地检查结果不证明线上配置正确。

## 目标环境验收

- [ ] HTTPS、公众平台 request/uploadFile/downloadFile 合法域名已配置，开启域名校验复测。
- [ ] 真实微信 code 登录与两个账号的咨询/附件隔离通过。
- [ ] CMS admin/editor 权限、上架/下架、咨询处理与真实小程序码通过。
- [ ] iOS / Android 真机验证图片上传/预览、401 刷新、键盘、安全区、分享、电话与隐私授权。
- [ ] 已录入真实且获准展示的房源、联系方式、服务类目和隐私指引。
- [ ] 数据库迁移在隔离环境验证，并完成目标库与 media 卷的配套备份/恢复演练。
- [ ] 正常启动与镜像构建关闭自动 schema push；反向代理覆盖不可信的 IP 转发头。

真实 HTTP、容器和真机验收未完成时，不将本地 demo 成功写成正式发布通过。订阅消息、地图、对比、收藏云同步等增长功能可后续迭代。
