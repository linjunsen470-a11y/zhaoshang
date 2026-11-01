#!/usr/bin/env bash
set -euo pipefail
set +x
revision=${GITEE_COMMIT:?required}
[[ "$revision" =~ ^[a-f0-9]{40}$ ]]
: "${DEPLOY_SSH_KEY:?required}"
key_dir=$(mktemp -d)
trap 'rm -rf -- "$key_dir"' EXIT
[[ "$DEPLOY_SSH_KEY" == *'-----BEGIN OPENSSH PRIVATE KEY-----'* ]] || { echo 'DEPLOY_SSH_KEY did not resolve to an OpenSSH key' >&2; exit 1; }
key_body=${DEPLOY_SSH_KEY#*-----BEGIN OPENSSH PRIVATE KEY-----}
key_body=${key_body%%-----END OPENSSH PRIVATE KEY-----*}
{
  printf '%s\n' '-----BEGIN OPENSSH PRIVATE KEY-----'
  printf '%s' "$key_body" | sed 's/\\n//g' | tr -d '[:space:]' | fold -w 70
  printf '\n%s\n' '-----END OPENSSH PRIVATE KEY-----'
} > "$key_dir/key"
unset key_body
unset DEPLOY_SSH_KEY
chmod 600 "$key_dir/key"
cp deploy/known_hosts "$key_dir/known_hosts"
args=(-i "$key_dir/key" -o BatchMode=yes -o StrictHostKeyChecking=yes -o "UserKnownHostsFile=$key_dir/known_hosts" -o ConnectTimeout=20 -o ServerAliveInterval=15)
destination=ubuntu@134.175.44.80
release=/opt/zhaoshang-test/releases/$revision
ssh "${args[@]}" "$destination" "mkdir -p '$release'"
scp "${args[@]}" deploy/deploy.sh deploy/check.sh docker-compose.yml "$destination:$release/"
ssh "${args[@]}" "$destination" bash -s -- "$revision" <<'REMOTE'
set -euo pipefail
set +x
revision=$1
. /opt/zhaoshang-test/ccr-pull.env
printf '%s\n' "$REGISTRY_PASSWORD" | bash "/opt/zhaoshang-test/releases/$revision/deploy.sh" \
  /opt/zhaoshang-test "$revision" ccr.ccs.tencentyun.com/jinyi_zhaoshang/wechat_app https://api.cqwushi.com "$REGISTRY_USER"
unset REGISTRY_PASSWORD
REMOTE
