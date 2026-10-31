#!/usr/bin/env bash
set -euo pipefail
cd /opt/zhaoshang-test
umask 077
stamp=$(date -u +%Y%m%dT%H%M%SZ)
destination="backups/$stamp"
mkdir -p "$destination"
# For a fully consistent database/media pair, schedule this while writes and the
# optional sync worker are paused. Copy the completed directory off this server.
docker compose exec -T db pg_dump -U zhaoshang -d zhaoshang_cloud_test \
  --no-owner --no-acl -Fc < /dev/null > "$destination/database.dump"
docker compose run --rm --no-deps -T --user 0 --entrypoint tar tools \
  -czf - -C /app media .tencent-sync < /dev/null > "$destination/media-sync.tar.gz"
cp .env "$destination/runtime.env"
sha256sum "$destination/database.dump" "$destination/media-sync.tar.gz" > "$destination/SHA256SUMS"
echo "Backup saved: /opt/zhaoshang-test/$destination"
