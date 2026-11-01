# Gitee CCR deployment

Run `gitee-verify.yml` on `main` manually with Gitee CLI. Both original BuildKit jobs push full commit SHA tags to CCR before the SSH deployment stage runs. GitHub Actions remains disabled.

Gitee requires encrypted `DEPLOY_SSH_KEY`. The pinned VPS host key is in `deploy/known_hosts`. VPS `/opt/zhaoshang-test/ccr-pull.env` contains shell-quoted `REGISTRY_USER` and `REGISTRY_PASSWORD`, mode 600. No secrets belong in Git.

The deployment backs up Postgres and the previous environment/Compose configuration, updates application and running sync services, checks HTTPS, and restores the previous images on failure. Schema push remains disabled.

## CCR retention

`deploy/cleanup-ccr.py` previews by default; `--apply` deletes only 40-character commit tags in `jinyi_zhaoshang/wechat_app` and `jinyi_zhaoshang/wechat_app-tools`. Keep the newest five per repository, current/previous deployments and digests shared with retained or non-release tags. A cleanup error does not undo a healthy deployment.

On the VPS, install `tencentcloud-sdk-python-tcr` in `/opt/zhaoshang-test/cleanup-venv`. Provide mode-600 `/opt/zhaoshang-test/ccr-cleanup.env` with `TENCENTCLOUD_SECRET_ID`, `TENCENTCLOUD_SECRET_KEY`, `TENCENTCLOUD_REGION`. Use a CAM principal restricted to DescribeImagePersonal and DeleteImagePersonal for these two repositories. Registry login passwords are not CAM API keys. Without this configuration deployment prints a cleanup warning and does not delete images.

Run cleanup from `/opt/zhaoshang-test`, where `deployed-revision` and `previous-deployed-revision` identify protected releases. Do not enable account-wide lifecycle cleanup for this project.
