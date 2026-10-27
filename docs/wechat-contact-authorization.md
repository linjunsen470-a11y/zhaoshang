# 微信昵称与手机号授权

所有咨询表单（找铺、转让、设备、装修）以及「我的」联系资料均使用微信昵称快速填写和手机号授权。收藏、取消收藏不调用震动接口，也不播放缩放动效。

## 用户流程

1. 点选 `input type="nickname"`，从微信键盘提供的昵称中选择。
2. 点击 `button open-type="getPhoneNumber"`，同意微信手机号授权后，客户端把回调中的一次性 `code` 交给后端。
3. 后端返回经微信校验的手机号，表单自动回填。提交咨询后昵称和手机号会自动用于后续咨询；在「我的」保存的联系信息也会被各类表单带入。

昵称不能通过旧的 `getUserProfile` 静默获取，手机号也必须由用户主动点击授权按钮。取消授权不清空原有号码；授权失败可以重试；获取过程中禁止重复请求和提交表单。手机号授权不替代现有咨询隐私同意。

## 服务端

`POST /api/auth/wechat-phone` 接收 `{ "code": "微信手机号授权码" }`，必须携带现有小程序 Bearer 登录凭证，返回 `{ "phone": "...", "countryCode": "86" }`。

- 仅服务端持有 `WECHAT_APPID` 和 `WECHAT_APP_SECRET`，通过微信稳定 access token 接口获取凭证并合并并发请求、按有效期缓存。
- 使用 `wxa/business/getuserphonenumber` 换取号码，校验返回的 AppID 水印和大陆手机号格式。当前业务的号码验证规则仍为大陆手机号。
- 限制请求频率和请求体大小，号码响应禁止缓存，不返回微信 access token、AppSecret、session_key 或原始上游错误。
- 仅在微信明确返回 access token 无效时刷新一次；网络超时或授权码失效不自动重放一次性授权码。
- 业务使用本地数据时，手机号授权依然走真实后端及微信登录，不生成替代手机号，也不修改 `USE_LOCAL_MOCK`。
- 无数据库字段或结构变更，不需要 schema push。

## 配置与验证

后端使用已有的 `WECHAT_APPID`、`WECHAT_APP_SECRET`，AppID 应与小程序一致；生产使用 `WECHAT_AUTH_MODE=wechat`。公众平台需具备手机号获取权限，并在小程序用户隐私保护指引中声明手机号用途。体验版和正式版的 `mp/config/environments.js` 服务地址需要设置为实际 HTTPS API 地址，及其对应的合法 request 域名。

单元测试覆盖前端拒绝/成功/失败、重复点击、401 刷新、本地业务模式下的真实授权通道；后端覆盖访问鉴权、授权码输入、token 并发与过期、重试边界、AppID 水印、号码格式及限流。上游微信响应通过测试替身提供，真实手机号授权仍需在具备权限和配置的微信环境联调，不能把开发者工具中的模拟授权计为真实授权成功。

参考：[微信官方昵称组件](https://github.com/wechat-miniprogram/mp-user-avatar)、[手机号授权说明](https://developers.weixin.qq.com/miniprogram/dev/framework/open-ability/getPhoneNumber.html)。

## 本次检查

- WXML/WXSS 全量编译通过。
- 前端单元测试 49 项、后端规则与授权测试 33 项、CMS 规则 4 项通过。
- `tests/mp-wechat-contact.test.mjs` 开发者工具检查通过：昵称事件、取消手机号授权、模拟后端响应后的号码回填及本地复用；测试后恢复 Storage、应用状态及请求实现。
- ESLint 和 Next.js 生产构建通过；构建保持 `PAYLOAD_DB_PUSH=false`。Windows 沙箱限制 junction 创建，构建在允许该文件操作的环境中完成。
- 真实 HTTP/数据库契约测试因未配置独立测试环境跳过；真实微信权限弹窗、手机号服务及真机联调未计为通过。
