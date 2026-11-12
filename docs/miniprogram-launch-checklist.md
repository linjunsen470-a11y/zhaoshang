# Demo 与正式发布检查清单

更新于 2026-11-12。企业信息、域名及备案步骤见 [企业备案与小程序上线准备](企业备案与小程序上线准备.md)；新企业账号切换见 [企业小程序切换](wechat-enterprise-switch-2026-11-02.md)；微信端操作说明见 [自动化测试](miniprogram-automation-test.md)。

## 本地 demo

- [ ] 微信开发者工具打开 `mp/project.config.json`，使用 develop 模式。
- [ ] 如需本地演示，显式将 `mp/config/environments.js` 中 develop 的 `useLocalMock` 设为 `true`；演示数据保存在本机 Storage，不需要后端。当前 develop 默认连接腾讯云 HTTPS API，演示结束后恢复实际配置。
- [ ] 浏览学校、工业园区、写字楼，检查列表筛选、详情和父项目/子铺位跳转。
- [ ] 提交找铺、转让、设备、装修咨询，检查隐私同意、字段错误、查询/编辑/删除与成功页返回。
- [ ] 演示摄影保留「示意 / 非实拍」标识；现已配置真实顾问电话，测试时避免误拨。
- [ ] 本地连续导航存在历史自动化超时记录，手工复核「提交成功 → 首页 → 其他场景」及「子铺位 → 返回列表」。

网站与 CMS 演示需单独准备 PostgreSQL，设置 `backend/.env` 后运行 `pnpm dev`。云端 Compose 包含独立数据库；本地开发数据库自行准备。已有数据库升级先备份，按 [数据库说明](schema-setup.md) 和 [持续部署说明](ci-deployment.md) 操作。

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

在微信开发者工具中导入 `mp/`，核对企业 AppID 后点击「上传」，填写版本号和说明。上传会生成开发版本。进入微信公众平台的版本管理，将该版本设为体验版。

当前三种版本连接同一业务库。上传前可用公开列表做只读检查；咨询提交、编辑和删除的自动化测试使用隔离库。提审前运行 `pnpm launch:check`，并完成下列验收。

11 月 12 日上传准备已验证三个环境的 API 配置、全部面积档的 4 套房源、各详情及封面。当前本机仍关闭域名校验。配置现用域名后再开启校验；小程序备案号按实际核发值填写，生成正式分享码时再将服务端 `WECHAT_CODE_ENV_VERSION` 切换为 `release`。

- [x] 三个环境共用 `https://api.cqwushi.com/api`，均关闭本地 Mock 与开发 OpenID。配置入口为 `mp/config/environments.js`。
- [ ] 在该 AppID 的公众平台「开发管理 → 开发设置 → 服务器域名」核对 request、uploadFile 和 downloadFile，填写 `https://api.cqwushi.com`（不带 `/api`）。开启开发者工具域名校验，再用关闭调试的体验版复测。
- [ ] 核对真实顾问电话，填写管局核发的小程序备案号：`mp/config/index.js`。
- [ ] 确认企业小程序 `wx4f94db3b93564c34` 的注册主体；按微信平台要求完成主体认证、服务类目和小程序备案。
- [ ] 独立随机 `MINIPROGRAM_TOKEN_SECRET`，至少 32 字符且与 `PAYLOAD_SECRET` 不同。
- [ ] `WECHAT_AUTH_MODE=wechat`。
- [ ] 真实 `WECHAT_APP_SECRET`。
- [ ] `WECHAT_APPID` 与根目录、`mp/` 两份 `project.config.json` 的 appid 一致，AppSecret 属于同一新账号；本机修改不代表服务器已切换。
- [ ] 新账号切换时更新独立的 `MINIPROGRAM_TOKEN_SECRET` 并重新创建应用容器，使旧登录及私密图片令牌失效；重新登录并重新生成分享码。
- [ ] 正式版 `WECHAT_CODE_ENV_VERSION=release`（体验版按对应环境配置）。
- [ ] 真实 HTTPS `PAYLOAD_PUBLIC_SERVER_URL`。

静态检查还会检查 `PAYLOAD_SECRET`、`DATABASE_URI` 与 `PAYLOAD_DB_PUSH=false`。目标部署环境须单独检查；本地检查结果不证明线上配置正确。

## 目标环境验收

- [ ] 新版收藏 API 已部署；备份后显式更新 favorites 结构，验证收藏增删、跨设备与双账号隔离。
- [ ] 原生 Payload 项目接口拒绝匿名读取，公开自定义接口保持脱敏。
- [ ] 新 tools 镜像发布后，按 [附件清理说明](attachment-cleanup.md)预览并启用每日任务。

- [ ] 体验版显示房源 19、20、21、22；逐套打开详情和封面，复测四档面积筛选。
- [ ] 真实微信 code 登录与两个账号的咨询/附件隔离通过。
- [ ] CMS admin/editor 权限、上架/下架、咨询处理与真实小程序码通过。
- [ ] iOS / Android 真机验证图片上传/预览、401 刷新、键盘、安全区、分享、电话与隐私授权。
- [ ] 已录入真实且获准展示的房源、联系方式、服务类目和隐私指引。
- [ ] 数据库迁移在隔离环境验证，并完成目标库与 media 卷的配套备份/恢复演练。
- [ ] 正常启动与镜像构建关闭自动 schema push；反向代理覆盖不可信的 IP 转发头。

真实 HTTP、容器和真机验收未完成时，不将本地 demo 成功写成正式发布通过。订阅消息、地图、对比等功能可后续迭代。收藏云同步代码已实现，仍需随新版后端部署并显式更新数据库结构。
