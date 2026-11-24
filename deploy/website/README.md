# jinyifangchan.com 官网切换

正式首页使用 Next.js 展示商铺选址与企业用餐业务，引导访客在微信搜索「岭南旺铺」。HTTPS 从腾讯云 HAProxy 按域名进入 Nginx，再由 Nginx 把首页请求和 `/_next/static/` 交给服务器本地的 `127.0.0.1:3300`。原有企业信息、业务、联系方式页面保留原链接，`/index.html` 跳转到新首页。小程序 API、媒体和员工后台继续使用现有 API 域名。

2026-11-20 21:20（北京时间），官网版本 `2dc3c65` 已通过 GitHub Actions 上线。公网验收核对了 HTTPS 首页、小程序入口、备案链接、三个内页及图片等静态文件。此次发布的日志记录了应用和 Nginx 的回退目录。[本次发布及公网验收记录](https://github.com/linjunsen470-a11y/zhaoshang/actions/runs/44741728367)

## 核对备案信息

项目方已确认两项备案通过。业务首页和四个静态页面统一悬挂以下编号，桌面端并排居中，窄屏逐项居中显示。

- **粤ICP备2026186178号** 链接至[工信部备案首页](https://beian.miit.gov.cn/)。广东使用主体备案号。[腾讯云悬挂说明](https://cloud.tencent.com/document/product/243/61412)
- **粤公网安备44011802001719号** 链接至[公安部备案查询页](https://beian.mps.gov.cn/#/query/webSearch?code=44011802001719)。编号前使用[公安部平台图标](https://beian.mps.gov.cn/img/logo01.dd7ff50e.png)，首页与静态页各自打包本地图标。

## 发布和切换

1. 由仓库所有者将目标 GitHub 提交同步至 Gitee 并手动运行发布流水线。应用镜像包含新版首页。流水线同时把`website/public-files.txt` 列出的页面、样式、脚本及图片，连同官网虚拟主机配置和切换脚本准备到同一版本目录。后端发布成功后，在腾讯云实例终端执行下方命令。
2. 脚本检查运行版本、小程序名称和备案链接，备份原官网配置，切换静态资源并在 `nginx -t` 通过后重载。脚本通过本机 HAProxy 的真实域名及证书验证首页和企业页面。切换期间校验失败会恢复原入口。输出的备份目录位于 `/var/backups/jinyi-website/`。

   ```bash
   cd /opt/zhaoshang-test
   revision=$(cat deployed-revision)
   sudo bash "releases/$revision/deploy/website/activate.sh"
   ```

3. 核对域名管理平台的当前解析。2026-11-01 的记录曾指向 Railway，切换时以实际权威记录为准。源站检查通过后，如根域名尚未直达腾讯云，将 `@` 指向 **A 134.175.44.80**。处理同名冲突的 CNAME、旧 A 或指向其他服务的 AAAA，保留原值及 TTL 以便回退。其他子域名、MX 和验证 TXT 独立管理。
4. 从外网打开正式首页，检查小程序名称复制、画册照片、公安备案图标和两项备案链接，并检查原企业信息页。[正式首页](https://jinyifangchan.com/) · [企业信息](https://jinyifangchan.com/about.html)

服务器已有独立 Nginx 配置和根域名证书。脚本沿用现有 HAProxy SNI 路由。静态预览监听 `127.0.0.1:18081`，裸 IP 的 HTTP 入口提供静态企业页面。静态资源与当前版本记录分别位于 `/var/www/jinyi-website/current` 和 `/var/www/jinyi-website/deployed-revision`。发布包只取 Git 提交中明确列出的公开文件；服务器上的应用环境变量沿用既有部署配置。

## 使用 GitHub Actions 单独更新官网

在 GitHub Actions 手动运行 **Website connection check**，从 `main` 使用 `tencent-test` 环境核对腾讯云 SSH 指纹、域名、线上首页和当前应用镜像 ID。需要单独发布官网时，手动运行 **Release the business website**，填写刚查到的完整 `sha256:…` 镜像 ID。工作流读取该环境已有的 `DEPLOY_SSH_KEY`。主机和指纹在仓库中固定，生产应用凭据只在服务器本地使用。

运行器构建 Next.js 产物，服务器对照现有 tools 镜像的应用源码及依赖清单。允许更改的应用文件列在 `source-manifest.mjs` 中，涵盖官网路由、样式、小程序名称复制组件和首页图片资源。匹配后，将构建产物装入沿用线上运行环境的新应用镜像，用临时回环端口验证小程序搜索说明及备案号，再仅重启 Compose 的 `payload` 服务。正常流程沿用原数据库、媒体卷、同步服务和 tools 镜像。

应用切换失败时脚本恢复原环境文件并启动旧镜像。成功运行的日志分别记录应用配置备份和 Nginx 备份路径。若需事后恢复，先恢复下文所述的上一版官网虚拟主机，再按对应版本及备份恢复 `APP_IMAGE` 和部署记录，只重启 `payload`。涉及其他后端文件或数据库结构的更新仍走常规发布流程。

## 验收、回退与续期

在已检出所发版本、已配置项目 SSH 密钥的机器上执行以下检查。最后一条同时核对 GitHub、VPS 配置和文件哈希、根域名 A 记录、HTTP 跳转、HTTPS 首页、样式和备案链接。仅省略 GitHub 对照时使用 `--skip-github`。

```bash
node scripts/sync-website-inline-css.mjs --check
node --test tests/unit/company-readiness.test.mjs tests/unit/site-server.test.mjs
node deploy/website/verify.mjs
```

首次切换后如需临时恢复静态首页，可在 VPS 上将该次备份的 `nginx-public.conf` 恢复为 `/etc/nginx/sites-available/jinyi-website-public.conf`，运行 `sudo nginx -t && sudo systemctl reload nginx`。保留刚发布的静态目录即可继续展示备案号。DNS 若已正确指向腾讯云，恢复静态首页只需改此虚拟主机。业务镜像的回退见[后端回退说明](../../docs/ci-deployment.md#手动回退)。

2026-11-01 的运维记录显示根域名证书通过手动 DNS 验证签发，到期日为 2027-01-30。切换时用 `sudo certbot certificates` 核实实况。若仍使用手动验证，根域名指向 VPS 且公网 ACME 路径可达后，可运行 `sudo certbot reconfigure --cert-name jinyifangchan.com --webroot --webroot-path /var/www/letsencrypt` 并检查定时任务及 Nginx 重载钩子。现有配置覆盖根域名，启用 www 需要相应域名路由和证书。
