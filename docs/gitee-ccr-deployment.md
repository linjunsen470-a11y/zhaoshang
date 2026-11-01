# Gitee CCR deployment

Run `gitee-verify.yml` on `main` manually with Gitee CLI. Both original BuildKit jobs push full commit SHA tags to CCR before the SSH deployment stage runs. GitHub Actions remains disabled.

Gitee requires encrypted `DEPLOY_SSH_KEY`. The pinned VPS host key is in `deploy/known_hosts`. VPS `/opt/zhaoshang-test/ccr-pull.env` contains shell-quoted `REGISTRY_USER` and `REGISTRY_PASSWORD`, mode 600. No secrets belong in Git.

The deployment backs up Postgres and the previous environment/Compose configuration, updates application and running sync services, checks HTTPS, and restores the previous images on failure. Schema push remains disabled.

## CCR retention

The owner configured Tencent Cloud automatic cleanup to retain the latest 10 versions. Retention is managed in Tencent Cloud, not deployment code; no CAM cleanup credentials or custom deletion scripts are required.
