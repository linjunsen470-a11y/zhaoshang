**咨询附件清理**

后台删除和小程序删除咨询会检查图片是否仍被其他咨询工作字段、原始快照或房源引用，只有无引用且来源、归属相符的用户附件才会删除。失败会记录错误，可由维护命令重试。

维护命令还覆盖用户选图后放弃提交或移除图片的情况，只扫描上传超过 7 天的 `lead_attachment`，不删除后台或演示素材。默认只输出候选数量，只有 `--delete` 才删除文件和媒体记录。运行前按既有流程备份数据库及媒体卷。

本地预览（使用当前 backend 环境配置，不要误指其他数据库）：

```powershell
pnpm --dir backend cleanup:attachments
```

服务器发布包含本次代码的新 tools 镜像后，在 `/opt/zhaoshang-test` 先预览，再执行：

```sh
sudo docker compose run --rm -T tools node node_modules/tsx/dist/cli.mjs scripts/cleanup-attachments.ts
sudo docker compose run --rm -T tools node node_modules/tsx/dist/cli.mjs scripts/cleanup-attachments.ts --delete
```

仓库提供 `deploy/attachment-cleanup.service` 和 `.timer`，每天新加坡时间 04:00 运行，使用发布相同的 `.deploy.lock` 锁，避免与发布/备份同时执行。新 tools 镜像上线、备份和预览确认后，在服务器复制这两个文件到 `/etc/systemd/system/`，运行 `sudo systemctl daemon-reload` 及 `sudo systemctl enable --now attachment-cleanup.timer`。用 `systemctl list-timers attachment-cleanup.timer` 和 `journalctl -u attachment-cleanup.service` 检查计划及结果。Docker 路径或项目目录不同需对应调整。

不要把删除命令放在普通应用启动时。当前修复没有登录服务器安装定时任务，也没有清理真实数据。

清理失败返回非零退出状态。日常检查失败记录即可，无须增加队列或另建存储服务。7 天是未绑定上传的宽限期，仍在使用的原始快照图片不受该期限影响。
