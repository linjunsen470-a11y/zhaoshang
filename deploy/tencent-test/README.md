# 腾讯云接入参考

当前部署由 [GitHub Actions](../../docs/ci-deployment.md) 管理，唯一编排文件为仓库根目录 `docker-compose.yml`。

本目录保留现有 Nginx 配置示例、SSH 隧道工具和手动备份脚本，供维护和排障使用。公网 HTTPS 已启用，日常访问 https://api.cqwushi.com/admin ，不再依赖隧道。

## 临时域名入口

2026-10-31 已收敛 `api.cqwushi.com` 的 HTTPS 入口，规则与 `nginx-domain.conf.example` 一致：

- 仅转发 `/api/`、`/admin`、`/admin/`、`/_next/` 和 `/favicon.ico`。API 路径包含公开图片、签名附件、上传和后台接口，继续由应用校验权限。
- 首页返回 404 和“此地址用于应用接口服务。”；带查询参数和 POST 请求同样被拦截。其余路径返回 404，不展示招商网页或需求表单。
- HTTPS 响应附带 `X-Robots-Tag: noindex`。网页源代码保留，供后续正式主站接入。
- 仅修改该域名的 Nginx 虚拟主机；HTTP 配置、HAProxy、正式域名、应用环境变量和数据库结构未调整。公网 HTTP 的备案拦截仍需单独处理。

上线时 `nginx -t` 和热重载通过；62 项公网定向检查通过，覆盖入口限制、API、图片、后台登录/保存/退出及静态资源、附件签名和匿名权限。浏览器确认后台登录页面正常。测试使用临时签发的小程序会话验证接口，不代表重新完成真实微信登录或手机端全流程验收；两条临时媒体记录及文件已删除。原主站响应状态和内容指纹与变更前一致。

服务器配置为 `/etc/nginx/sites-available/zhaoshang-api.conf`，启用目录通过符号链接引用。变更前备份为 `/opt/zhaoshang-test/backups/nginx-entry-20261031T111827Z/zhaoshang-api.conf`。如需回退，仅恢复该配置，执行 `sudo nginx -t`，成功后执行 `sudo systemctl reload nginx`；不恢复数据库或切换应用镜像。

数据库、媒体和同步配置卷继续保留原 `zhaoshang-test` 项目名。不要重新初始化数据库或删除卷。证书现状见 [HTTPS 部署记录](../../docs/tencent-https-demo-2026-10-31.md)。

手动备份数据库、媒体和同步配置：将 `backup.sh` 放到服务器后执行 `sudo bash backup.sh`。脚本针对当前 `/opt/zhaoshang-test`，完整一致性备份应在暂停写入与同步后执行，并将结果复制到服务器之外。日常发布的自动备份仅包含数据库和配置，见持续部署说明。
