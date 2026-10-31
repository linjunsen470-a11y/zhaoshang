# GitHub Actions 与腾讯云部署

仓库：`linjunsen470-a11y/zhaoshang`。当前目标是腾讯云测试环境 `/opt/zhaoshang-test`，域名 `https://api.cqwushi.com`。

## 日常流程

1. 在工作分支修改代码并创建 PR。
2. `CI and deploy` 检查客户端/后端单元测试、CMS 测试、ESLint、ShellCheck，并构建生产镜像（包含 TypeScript 检查）。
3. PR 通过后合入 `main`。流水线重新检查，将应用及工具镜像发布到 GHCR，以完整 commit SHA 标记。
4. 部署 job 使用专用 SSH 密钥和固定主机公钥，上传少量脚本；服务器拉取镜像，备份数据库，再更新后台。
5. 等待容器健康检查，验证 HTTPS 房源 API、登录页以及匿名访问员工 API 必须被拒绝。失败自动恢复之前的 `.env`、Compose 和镜像。

也可在 Actions 页面手动运行 `CI and deploy`，选择 `main`。部署环境 `tencent-test` 仅允许 `main`。同一分支的发布不会互相中断，服务器另有文件锁防止并发部署。

## 配置

Environment `tencent-test` 的 Secrets：

| 名称 | 用途 |
| --- | --- |
| `DEPLOY_HOST` | SSH 主机 |
| `DEPLOY_PORT` | SSH 端口 |
| `DEPLOY_USER` | SSH 用户 |
| `DEPLOY_SSH_KEY` | 本项目专用私钥 |
| `DEPLOY_KNOWN_HOSTS` | 已核实的服务器公钥，禁止跳过主机验证 |

同一 Environment 的 Variables：`DEPLOY_PATH=/opt/zhaoshang-test`、`PUBLIC_URL=https://api.cqwushi.com`。
镜像仓库使用工作流临时 `GITHUB_TOKEN`，无需另建长期 GitHub PAT。服务器只在拉取期间保存临时 Docker 登录配置，结束后删除。

数据库密码、微信 AppSecret、Payload 密钥仍保存在服务器 `.env`，不会写进镜像、Actions 参数或公开日志。腾讯文档 Token 保存在持久化同步卷。根目录 `.env.example` 是云端模板；`backend/.env.example` 是本地开发模板。更新服务器应用密钥后按需重新创建应用容器，更新腾讯 Token 使用后台“连接设置”。

## Compose 与数据库

根目录 `docker-compose.yml` 是唯一来源，部署时复制为服务器 `compose.yml`。项目名 `zhaoshang-test` 和卷名保持不变：`postgres-data`、`media`、`tencent-sync`。数据库不映射公网端口。

普通发布不做 Schema 变更，`PAYLOAD_DB_PUSH=false`。需要变更时先备份，在服务器显式运行：

```bash
cd /opt/zhaoshang-test
sudo docker compose run --rm -T tools node node_modules/tsx/dist/cli.mjs scripts/push-schema.ts
```

备份位于 `backups/<UTC时间>-<短提交>/`，包含数据库 dump、上版环境和 Compose。上传媒体及同步卷需另行定期备份；此次流水线不覆盖或清空它们。上线后应配置异地备份和保留周期。

同步 worker 默认关闭；如已经运行，发布时同步更新工具镜像并重启 worker。启用定时同步需要后台启用开关，再运行 `sudo docker compose --profile sync up -d sync`。

## 手动回退

自动回退只恢复应用配置，不自动回滚数据库。若以后发布涉及 Schema 变更，应单独制定数据库恢复步骤。

```bash
cd /opt/zhaoshang-test
# 替换成实际的备份目录
cp backups/<目录>/previous.env .env
cp backups/<目录>/compose.yml compose.yml
sudo docker compose up -d --no-deps --wait payload
# 仅在原本启用同步时执行：
# sudo docker compose --profile sync up -d --no-deps sync
```

旧镜像暂时保留，确认不再需要后再按版本清理；不要执行 `docker compose down -v`。

## 测试边界

CI 不连接业务数据库、不使用微信真实用户身份。真实 HTTP 合约在未配置隔离测试环境时明确跳过；微信开发者工具 E2E 不在 GitHub Linux runner 上执行。旧 E2E 工作流因没有 runner 而停用，积压任务已取消；配置自托管 Windows runner 并重新启用后才能手动运行。

HTTPS 证书目前通过 DNS 手动签发，Actions 不负责证书续期；到期前需完成续签或单独配置 DNS 自动续期。
