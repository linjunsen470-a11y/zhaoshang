# 公网 HTTPS 与演示房源更新

2026-10-31：`https://api.cqwushi.com` 已启用有效 Let's Encrypt 证书，管理后台为 `/admin`。原主站仍正常。

- HTTP 验证两次失败，证书机构访问到了另一个 IP；通过用户添加 DNS TXT 完成所有权验证，证书有效期至 2027-01-29。
- Nginx 独立 api 虚拟主机、HAProxy 精确 SNI 路由已启用；应用与数据库端口仍只在内部使用。
- 已安装 Nginx 证书更新后 reload hook。**尚未配置 DNS API 自动续期**；本次为人工 TXT 验证，下次续期需要更新 TXT，不能仅依靠 Certbot timer。当前 auth hook 最多等待 10 分钟，未确认 DNS 时失败退出，不会误用旧验证标记。可在后续配置受限 DNS API 凭据后实现无人值守续期。
- 云端 `PAYLOAD_PUBLIC_SERVER_URL=https://api.cqwushi.com`，媒体链接使用公网 HTTPS。
- `mp/config/environments.js` 的 develop 改为公网 API，`useLocalMock=false`、`allowDevOpenId=false`。这是用户明确要求的云端联调设置；trial/release 仍未发布。
- 重启微信开发者工具后，实际 runtime API 为公网 HTTPS，首页 `loadError=false`，显示 3 条推荐、3 条最新房源。
- 新增 6 条显式标注【演示】的房源：写字楼咖啡吧、园区员工餐厅、校园便利店、办公园烘焙、科技园轻食水果、校园茶饮。使用六张不同的 Unsplash 示意图，文字、面积、费用和客群均有区别；均非真实招商承诺。
- 新记录 seedKey 为 `cloud-variety-20261031-0` 至 `cloud-variety-20261031-5`，仅追加到云端测试库，未覆盖原腾讯来源房源。总房源数由 12 增至 18。

现在开发者工具与浏览器均可直接访问服务器，无需 SSH 隧道。真机/体验版仍需在微信公众平台配置对应 request、uploadFile、downloadFile 合法域名，并完成平台要求的备案等手续。
