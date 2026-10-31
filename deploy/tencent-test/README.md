# 腾讯云接入参考

当前部署由 [GitHub Actions](../../docs/ci-deployment.md) 管理，唯一编排文件为仓库根目录 `docker-compose.yml`。

本目录只保留现有 Nginx 配置示例与 SSH 隧道工具，供维护和排障使用。公网 HTTPS 已启用，日常访问 https://api.cqwushi.com/admin ，不再依赖隧道。

数据库、媒体和同步配置卷继续保留原 `zhaoshang-test` 项目名。不要重新初始化数据库或删除卷。证书现状见 [HTTPS 部署记录](../../docs/tencent-https-demo-2026-10-31.md)。
