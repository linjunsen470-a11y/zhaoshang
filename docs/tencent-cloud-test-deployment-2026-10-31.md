# 腾讯云测试部署记录

日期：2026-10-31（Asia/Singapore）。状态：云端隔离测试环境已部署并通过 SSH 隧道验收；公网域名 HTTPS 尚未启用。

## 服务器与入口

| 项目 | 已核实状态 |
| --- | --- |
| 服务器 | 腾讯云，Ubuntu 24.04.4 LTS，x86_64，4 核，约 3.7 GiB 内存，约 2 GiB swap |
| 磁盘 | 根盘约 40 GB，部署前剩余约 31 GB |
| 项目目录 | `/opt/zhaoshang-test` |
| 容器 | `zhaoshang-test-payload-1`、`zhaoshang-test-db-1`；均 healthy |
| 数据库 | PostgreSQL 16，独立数据库 `zhaoshang_cloud_test`，无宿主机端口映射 |
| 应用与代理 | 应用仅监听 `127.0.0.1:3300`；Nginx 测试入口仅监听 `127.0.0.1:18080` |
| 本机测试后台 | `http://127.0.0.1:3300/admin`，必须保持 SSH 隧道开启 |
| 测试域名 | `api.cqwushi.com`，已通过隧道 Host 路由检查；未修改 DNS、未签发 api 域名证书 |
| DNS 计划 | 在阿里云添加 `api` A 记录 → `134.175.44.80`；不改主站/www 记录 |
| 新 AppID | `wx98ad42097b40a52d`；用户确认改用它，两个项目配置和生产环境配置已统一 |

现有客户网站原本已在该服务器运行：Nginx 监听 80/回环 8443、HAProxy 监听公网 443、原网站监听回环 3000。本次只新增独立测试虚拟主机，未改原站点及 HAProxy 路由。部署前后主站 HTTPS 均返回 200。

初始 Docker 网络缺少 `DOCKER-FORWARD` 链；确认当时没有运行容器后重启 Docker 服务恢复。没有清空防火墙规则或重启现有网站服务。

## 数据与账号

- 从本机演示库迁入测试副本：12 条房源、5 条咨询、14 条媒体记录，32 个媒体文件。
- 迁移前后 `projects`、`leads`、`media` 全行聚合指纹一致；云端显式执行 `scripts/push-schema.ts` 后也一致。
- 所有 32 个源媒体文件 SHA-256 一致。云端新增测试上传/咨询已经清理，原始记录数量不变。
- 本机原管理员保持不变；云端复制的旧账号密码已随机重置，新增独立测试管理员。因此云端有 2 个账号，日常测试使用新管理员。
- 后台登录凭据保存在本机 `scratch/cloud-deploy/admin-credentials.env`；云端运行密钥在 `/opt/zhaoshang-test/.env`，本机维护副本在 `scratch/cloud-deploy/cloud.env`，均不进 Git。
- 真实微信密钥已写入根目录 `.env`、`backend/.env` 和云端配置；统一使用代码实际读取的 `WECHAT_APPID` 键。密钥没有写入小程序、镜像或报告。

## 已执行验收

1. Linux 生产镜像构建成功，包括 Next.js 构建和 TypeScript 检查；维护工具使用独立 Docker target。
2. 鉴权、咨询输入清洗及请求边界 11 项定向测试通过；企业信息配置 3 项测试通过。
3. 通过 SSH 隧道执行 24 项 HTTP 检查：公开列表/详情/图片，未登录数据访问限制，拒绝小程序令牌访问员工接口，禁用开发 OpenID，管理员 cookie 登录和工作台，后台主要页面，Sharp 图片上传，附件签名与归属校验，咨询新增/修改/删除及 CRM 字段隔离，测试域名 Host 路由。
4. 浏览器登录云端运营工作台成功，页面渲染正常；检查时控制台无 error/warn。
5. 微信官方接口验证新 AppID/AppSecret 匹配；微信开发者工具使用该 AppID 获取真实 `wx.login` code，云端返回 200、`mode=wechat`，成功生成真实会话。
6. 开发者工具当前会话短暂接入云端，首页加载成功（4 条最新记录）；检查后恢复默认本地 mock。没有修改 trial/release 空地址，也没有发布小程序。
7. 强制重建应用容器后，API 恢复 200，数据和媒体仍在；数据库备份另在云端临时库成功恢复后删除临时库。
8. 从公网检查 3300、18080、5432 均不可达；原客户主站 HTTPS 仍为 200。

本次尚未验证：手机真机 HTTPS 全流程、微信手机号授权、体验版/正式版发布，以及腾讯文档实际同步。开发者工具真实登录成功不等于这些检查已完成。

## 备份与运行边界

在停止测试应用写入且同步未启动时完成备份，随后恢复应用运行：

- 云端：`/opt/zhaoshang-test/backups/20261031T035151Z/`（时间戳为 UTC）；含数据库、媒体/同步状态和私有运行配置。
- 本机异机副本：`scratch/cloud-deploy/cloud-verified.dump`、`scratch/cloud-deploy/cloud-verified-media.tar.gz`；运行配置另存在上面的私有 env 文件中。
- 源快照和结构更新前备份仍在云端 `backups/`，用于本次迁移回退。
- 初始测量应用约 237 MiB、数据库约 49 MiB；仅为空闲/轻量验收时观测，不是容量或并发承诺。
- 腾讯文档无人值守连接尚未配置，同步 worker 保持关闭。生产鉴权保持 `wechat`，日常 schema push 保持关闭。

重新连接隧道、备份命令及 DNS 就绪后的证书/HAProxy 操作见 [部署操作说明](../deploy/tencent-test/README.md)。现有主站证书不覆盖 `api.cqwushi.com`；只修改 DNS 还不能直接使用其公网 HTTPS 后台。
