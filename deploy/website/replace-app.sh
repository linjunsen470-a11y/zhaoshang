#!/usr/bin/env bash
# Install a website-only Next.js build on top of the live app's existing runtime.
set -Eeuo pipefail
umask 077
staging=$(cd -- "$(dirname -- "$0")/../.." && pwd)
revision=${1:?website source commit required}
expected_base=${2:?expected running image ID required}
[[ $EUID == 0 && $revision =~ ^[0-9a-f]{40}$ && $expected_base =~ ^sha256:[0-9a-f]{64}$ ]]
app=/opt/zhaoshang-test
cd "$app"
exec 9<>.deploy.lock
flock -w 150 9
compose=(docker compose -f compose.yml)
id=$("${compose[@]}" ps -q payload)
base=$(docker inspect --format '{{.Config.Image}}' "$id")
[[ $(docker inspect --format '{{.Image}}' "$id") == "$expected_base" ]] || { echo 'Application image changed; recheck the running version.' >&2; exit 1; }
tools_image=$("${compose[@]}" --profile "*" config --format json | python3 -c '
import json, sys
services = json.load(sys.stdin)["services"]
assert services["payload"]["image"] == sys.argv[1]
assert str(services["payload"]["environment"]["PAYLOAD_DB_PUSH"]).lower() == "false"
print(services["tools"]["image"])
' "$base")
# A prior website-only release adds layers to the runtime paired with these tools.
runtime="${base%:*}:${tools_image##*:}"
if [[ $base != "$runtime" ]]; then
  docker image inspect "$runtime" "$base" | python3 -c '
import json, sys
runtime, current = [item["RootFS"]["Layers"] for item in json.load(sys.stdin)]
if not runtime or current[:len(runtime)] != runtime:
    raise SystemExit("Live application is not based on the runtime paired with the tools image")
'
fi

docker run --rm -i --read-only --network none --entrypoint node "$tools_image" --input-type=module - \
  < "$staging/deploy/website/source-manifest.mjs" > "$staging/live.manifest"
diff -u "$staging/source.manifest" "$staging/live.manifest"
echo 'Verified that all application sources outside the website changes match the live release.'
if [[ ${3:-} == --check ]]; then exit 0; fi

candidate="zhaoshang-local/wechat-app:website-$revision"
if [[ $base == "$candidate" && $(cat deployed-revision) == "$revision" ]]; then
  bash "$app/releases/$revision/deploy/website/activate.sh"
  exit
fi
docker build --network=none --pull=false -t "$candidate" --build-arg "BASE=$runtime" -f - "$staging/bundle" <<'DOCKER'
ARG BASE
FROM ${BASE}
COPY --chown=1001:1001 .next/ /app/.next/
COPY --chown=1001:1001 server.js /app/server.js
DOCKER

release="$app/releases/$revision"
install -d -m 0755 "$release/deploy/website"
install -m 0644 "$staging/deploy/website/"{activate.sh,nginx-public.conf} "$release/deploy/website/"
for file in index.html about.html services.html contact.html css/style.css js/main.js; do
  install -D -m 0644 "$staging/website/$file" "$release/website/$file"
done

mkdir -p "$app/backups"
backup=$(mktemp -d "$app/backups/website-app-XXXXXXXX")
cp -p .env "$backup/previous.env"
if [[ -f deployed-revision ]]; then cp -p deployed-revision "$backup/previous-revision"; fi
echo "Application rollback files: $backup"
tmp=$(mktemp -d "$app/.website-XXXXXXXX")
trial=
changed=false
cleanup() {
  status=$?
  trap - EXIT
  if [[ -n "$trial" ]]; then docker rm -f "$trial" >/dev/null || true; fi
  if (( status != 0 )) && [[ $changed == true ]]; then
    echo "Restoring previous application image: $base" >&2
    cp -p "$backup/previous.env" "$tmp/restored.env"
    mv -Tf "$tmp/restored.env" .env
    if [[ -f "$backup/previous-revision" ]]; then
      cp -p "$backup/previous-revision" deployed-revision
    else
      rm -f deployed-revision
    fi
    "${compose[@]}" up -d --no-deps --wait --wait-timeout 150 payload
  fi
  rm -rf -- "$tmp"
  exit "$status"
}
trap cleanup EXIT
trap 'exit 1' HUP INT TERM

# Exercise the candidate via a random loopback port before restarting the live application.
trial=$(APP_IMAGE="$candidate" "${compose[@]}" run -d --no-deps -p 127.0.0.1::3000 payload)
address=$(docker port "$trial" 3000/tcp)
[[ $address =~ ^127\.0\.0\.1:[0-9]+$ ]]
for _ in {1..35}; do
  if curl -fsS --max-time 8 "http://$address/" -o "$tmp/home" 2>/dev/null &&
     grep -Fq 'id="mini-program"' "$tmp/home" && grep -Fq '岭南旺铺' "$tmp/home" &&
     grep -Fq '>粤ICP备2026186178号</a>' "$tmp/home"; then break; fi
  sleep 2
done
grep -Fq 'id="mini-program"' "$tmp/home"
grep -Fq '岭南旺铺' "$tmp/home"
grep -Fq '>粤ICP备2026186178号</a>' "$tmp/home"
docker rm -f "$trial" >/dev/null
trial=

cp -p .env "$tmp/new.env"
python3 - "$tmp/new.env" "$candidate" <<'PY'
from pathlib import Path
import re, sys
path = Path(sys.argv[1])
data, count = re.subn(rb'^APP_IMAGE=[^\r\n]*', b'APP_IMAGE=' + sys.argv[2].encode(), path.read_bytes(), flags=re.M)
if count != 1: raise SystemExit('Expected exactly one APP_IMAGE setting')
path.write_bytes(data)
PY
changed=true
mv -Tf "$tmp/new.env" .env
"${compose[@]}" up -d --no-deps --wait --wait-timeout 150 payload
[[ $(docker inspect --format '{{.Config.Image}}' "$("${compose[@]}" ps -q payload)") == "$candidate" ]]
if [[ -f deployed-revision ]]; then cp -p deployed-revision "$tmp/revision"; fi
printf '%s\n' "$revision" > "$tmp/revision"
mv -Tf "$tmp/revision" deployed-revision
bash "$release/deploy/website/activate.sh"
changed=false
echo 'Website release completed'
