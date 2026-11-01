# 企业官网：腾讯云部署与备案后开通

精简后的 `website/` 四个页面及 CSS、JS 独立部署到腾讯云 `134.175.44.80`。`/var/www/jinyi-website/current` 指向当前版本目录，`/var/www/jinyi-website/deployed-revision` 记录其对应的完整 Git 提交。四个页面均内联样式；样式维护方法见 [官网说明](../../website/README.md)。部署目录不包含后端、环境变量、数据库或营业执照图片。

官网与现有服务共享 Nginx 和 HAProxy，但使用独立虚拟主机：

- 私有预览：Nginx `127.0.0.1:18081`，配置见 `nginx-preview.conf`。
- 正式域名：`jinyifangchan.com` 的 HTTP 与 HTTPS 配置见 `nginx-public.conf`。HAProxy 仅为该域名添加了精确 SNI 路由，规则见 `haproxy-sni.conf.example`；其他域名及默认后端保持原规则。
- 2026-11-01 按用户要求启用 `/var/www/jinyi-website/public-enabled`，该 VPS 的正式域名入口已开放。域名目前仍解析到 Railway，正常解析访问的结果可能不同。
- 新增 `nginx-ip.conf`，让 `http://134.175.44.80/` 直接显示官网。外网实测返回 200，腾讯云未拦截此裸 IP 访问；该地址可被公众访问，不应假设云服务商一定会阻断它。
- 现有 HAProxy 配置变更前的备份为 `/var/backups/jinyi-website/20261101T051831Z/haproxy.cfg`。回退前先比较当前配置，避免覆盖后续新增的其他服务配置。
- Let's Encrypt 证书仅覆盖 `jinyifangchan.com`，有效期至 **2027-01-30**；`www.jinyifangchan.com` 尚未配置。

## 私有预览

在仓库根目录运行，保持终端打开：

```powershell
ssh -N -L 18081:127.0.0.1:18081 -o StrictHostKeyChecking=yes -o UserKnownHostsFile=deploy/known_hosts ubuntu@134.175.44.80
```

在同一台电脑访问 `http://127.0.0.1:18081/`。这是通过 SSH 的私有预览，不是供管局公网访问的地址。预览端口只绑定服务器回环地址。

## 备案与 DNS

腾讯云说明，首次备案或新增未备案网站在取得备案号前不得公开访问；接入备案、变更备案的规则可能不同，以[腾讯云备案期间说明](https://cloud.tencent.com/document/product/243/19637)及具体订单要求为准。当前根域名 `@` 的 CNAME 指向 `nud58xnl.up.railway.app`，该地址与 VPS 不同。2026-11-01 按用户要求停止 Railway 临时网站的运行部署，根域名和临时域名均返回 404，域名和服务配置仍保留；随后按用户要求开放 VPS 域名及 IP 入口。网站名称、主体和业务内容应与实际备案信息一致；[广东管局备案要求](https://cloud.tencent.com/document/product/243/51709)及订单审核结果为准。

备案通过且腾讯云接入完成后，域名管理人可将根域名的 Railway CNAME 替换为：

| 主机记录 | 类型 | 记录值 |
| --- | --- | --- |
| `@` | `A` | `134.175.44.80` |

先检查同一主机记录是否有其他冲突的 CNAME、A 或 AAAA；不要更改其他子域名、MX 或无关的 TXT 记录。证书签发时添加的 `_acme-challenge` TXT 已完成本次验证，以后手动签发时值会改变。域名入口目前已开放，DNS 切换后需检查实际解析和 HTTPS。

## 代码同步与检查

官网静态文件独立于后端镜像发布；推送 GitHub 不会自动更新 VPS。部署时从目标 Git 提交打包且仅上传 `index.html`、`about.html`、`services.html`、`contact.html`、`css/style.css` 和 `js/main.js`，解压至新的 `/var/www/jinyi-website/releases/` 版本目录，核对文件哈希后原子切换 `current`。网站文件和 Nginx 配置通过 `.gitattributes` 固定 LF 换行，避免 Windows 打包时与 Git 提交及服务器文件产生字节差异。验证成功后，将该提交的完整 SHA 写入 `/var/www/jinyi-website/deployed-revision`，保留上一版本以便回退。

在仓库根目录运行：

```powershell
node scripts/sync-website-inline-css.mjs --check
node --test tests/unit/company-readiness.test.mjs tests/unit/site-server.test.mjs
node deploy/website/verify.mjs
```

最后一条命令对照本地 `HEAD`、GitHub `origin/main`、VPS 上的六个静态文件、三份 Nginx 配置、HAProxy 路由和公网 HTTP 响应。推送之前可用 `node deploy/website/verify.mjs --skip-github` 仅核对本地提交和 VPS。该检查不表示 VPS 后端镜像标签必须与官网提交相同；后端按[后端部署流程](../../docs/ci-deployment.md)单独发布。

## 备案后开通与证书续期

1. 从腾讯云和管局确认网站备案及接入完成。把**实际网站备案号**填入 `website/js/main.js` 的 `SITE_ICP_NUMBER`，部署更新后的静态文件，并在私有预览中检查备案号及工信部链接。不要填示例号或小程序备案号。
2. 由域名管理人按上表修改 DNS，确认根域名解析到目标服务器。VPS 上的正式域名入口已经开放。
3. 当前证书使用手动 DNS 验证签发，**不会自动续期**。DNS 已指向服务器、腾讯云放通访问且公网 80 端口的 ACME 路径可达后，运行下列命令将该证书切换到 webroot 续期；命令先使用 Let's Encrypt 测试环境验证，成功后才保存续期配置。检查服务器已有的 Certbot 定时器和续期后 Nginx reload hook，并确认结果确实成功。

   ```bash
   sudo certbot reconfigure --cert-name jinyifangchan.com --webroot --webroot-path /var/www/letsencrypt
   ```

4. 确认备案号已部署、证书和接入无误后，从外网检查 HTTPS 证书、全部页面、样式及页脚备案号。按接入商要求办理后续公安联网备案。

如需关闭公网访问，删除 `/var/www/jinyi-website/public-enabled` 只关闭域名入口，还必须同时停用 `/etc/nginx/sites-enabled/jinyi-website-ip.conf` 并在 `nginx -t` 通过后重载 Nginx；否则裸 IP 仍可访问。关闭前应确认用户当前意图。

手动 DNS 签发的证书到期前必须完成上述续期配置或再次手动续签；现有 Certbot 定时器本身不能自动续签无认证 hook 的手动证书。若 DNS 或审核进度延迟，尤其要在 2027-01-30 前处理。
