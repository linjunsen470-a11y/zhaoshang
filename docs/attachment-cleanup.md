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

不要把删除命令放在普通应用启动时。2026-11-05 已在 VPS 安装并启用上述任务，预览及手动启动 systemd 服务均成功，候选数为 0，没有删除业务附件。任务每天 04:00（Asia/Singapore）运行，既有备份每天 03:00 运行。维护脚本已补充显式退出，避免完成后仍占用部署锁。

清理失败返回非零退出状态。日常检查失败记录即可，无须增加队列或另建存储服务。7 天是未绑定上传的宽限期，仍在使用的原始快照图片不受该期限影响。
