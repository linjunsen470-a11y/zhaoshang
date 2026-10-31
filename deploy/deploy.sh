#!/usr/bin/env bash
set -Eeuo pipefail
umask 077
# Called over SSH after rsync transfers the versioned images and checksum.
deploy_dir=${1:?deployment directory required}
revision=${2:?commit required}
image=${3:?image repository required}
public_url=${4:?public HTTPS URL required}
[[ "$deploy_dir" == /opt/* && "$deploy_dir" != *..* && "$deploy_dir" != *[!a-zA-Z0-9/_-]* ]]
[[ "$revision" =~ ^[a-f0-9]{40}$ ]]
[[ "$image" =~ ^ghcr.io/[a-z0-9._/-]+$ ]]
[[ "$public_url" =~ ^https://[a-zA-Z0-9.-]+$ ]]
release_dir=$(cd -- "$(dirname -- "$0")" && pwd)
cd "$deploy_dir"
exec 9>.deploy.lock
flock -w 600 9
[[ -f .env && -f compose.yml ]]
changed=false
sync_running=false
backup_dir="backups/$(date -u +%Y%m%dT%H%M%SZ)-${revision:0:12}"
cleanup() {
  status=$?
  trap - EXIT
  if (( status != 0 )) && [[ "$changed" == true ]]; then
    echo 'Deployment failed; restoring previous images and Compose configuration.' >&2
    cp "$backup_dir/previous.env" .env
    cp "$backup_dir/compose.yml" compose.yml
    sudo docker compose up -d --no-deps --wait --wait-timeout 150 payload || true
    if [[ "$sync_running" == true ]]; then
      sudo docker compose --profile sync up -d --no-deps sync || true
    fi
  fi
  exit "$status"
}
trap cleanup EXIT
sha256sum --check --status "$release_dir/SHA256SUMS"
sudo docker load -i images.tar
sudo docker image inspect "$image:$revision" "$image-tools:$revision" > /dev/null
if sudo docker compose ps --services --status running | grep -qx sync; then sync_running=true; fi
mkdir -p "$backup_dir"
cp .env "$backup_dir/previous.env"
cp compose.yml "$backup_dir/compose.yml"
{ sudo docker compose exec -T db pg_dump -U "$(sudo docker compose exec -T db printenv POSTGRES_USER)" -d "$(sudo docker compose exec -T db printenv POSTGRES_DB)" -Fc; } > "$backup_dir/database.dump"
[[ -s "$backup_dir/database.dump" ]]
changed=true
python3 - "$image" "$revision" <<'PY'
from pathlib import Path
import sys
values={'APP_IMAGE':sys.argv[1]+':'+sys.argv[2], 'TOOLS_IMAGE':sys.argv[1]+'-tools:'+sys.argv[2]}
p=Path('.env')
lines=[line for line in p.read_text().splitlines() if line.split('=',1)[0] not in values]
p.with_suffix('.next').write_text('\n'.join(lines+[k+'='+v for k,v in values.items()])+'\n')
p.with_suffix('.next').replace(p)
PY
cp "$release_dir/docker-compose.yml" compose.yml
sudo docker compose config --quiet
sudo docker compose up -d --no-deps --wait --wait-timeout 150 payload
if [[ "$sync_running" == true ]]; then sudo docker compose --profile sync up -d --no-deps sync; fi
bash "$release_dir/check.sh" "$public_url"
printf '%s\n' "$revision" > deployed-revision
printf 'Deployed %s successfully\n' "$revision"
