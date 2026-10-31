# 广州锦奕咨询服务有限公司静态官网

`website/` 是不依赖构建工具的静态网站：直接打开 `index.html` 可本地预览。包含首页、业务、企业信息和联系方式四页。

`Dockerfile` 和 `server.mjs` 为 Railway 提供轻量静态文件服务，监听平台分配的 `PORT`，只对外提供上述页面及 CSS/JS，不包含后端或数据库。

## Railway 部署

- [Railway 临时访问地址](https://website-production-db44.up.railway.app/)；[服务管理页面](https://railway.com/project/cea5cce1-8322-4a34-9b3c-f11bd72bd601/service/3f00ed91-8c40-48e1-b17f-63d75c739232)。
- `jinyifangchan.com` 已添加到该服务，但尚未修改 DNS，证书也尚未完成所有权验证。核实当前 DNS 记录及大陆备案接入要求后，再决定是否按 Railway 控制台的提示配置。
- 当前通过 CLI 上传本地目录，不会随 Git 提交自动更新。在 `website/` 目录修改完网站后，可使用已登录的 Railway CLI 重新部署到同一个服务：

  ```bash
  railway up . --path-as-root --detach --project cea5cce1-8322-4a34-9b3c-f11bd72bd601 --environment d570f0f9-e7e9-43c4-94db-7ed6b047def3 --service 3f00ed91-8c40-48e1-b17f-63d75c739232
  ```

  检查部署状态及页面可访问后再对外使用；不需要上传仓库根目录、营业执照照片或环境变量文件。

## 备案与发布

- 企业名称、登记地址和统一社会信用代码来自营业执照；联系电话由用户提供。登记地址不等同于对外接待地址。
- 目前没有已核发的网站备案号，页脚不展示占位号或已通过备案的声明。取得网站服务备案号后，填写 `js/main.js` 中的 `SITE_ICP_NUMBER`，重新部署后页脚自动显示并链接至工信部网站。小程序备案号应单独填写到 `mp/config/index.js`。
- 网站可部署到 Railway 作境外预览。中国大陆接入需要联系实际的大陆接入服务商办理备案，不应以境外预览地址代替备案接入信息。
- 官网与后端是不同的部署：本目录不含客户资料、数据库、Payload 管理后台或小程序 API。不要把整个仓库、营业执照照片或 `.env` 打包进静态站点。
- 域名、生产环境、微信合法域名和上线前验收步骤见 [企业备案与小程序上线准备](../docs/企业备案与小程序上线准备.md)。具体审核要求以实际接入商和广东管局为准。
