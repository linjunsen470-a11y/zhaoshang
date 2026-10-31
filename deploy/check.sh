#!/usr/bin/env bash
set -euo pipefail
origin=${1:?HTTPS origin required}
[[ "$origin" =~ ^https://[a-zA-Z0-9.-]+$ ]]
result=$(mktemp)
trap 'rm -f -- "$result"' EXIT
curl --fail --silent --show-error --retry 5 --retry-delay 3 --retry-all-errors --max-time 20 "$origin/api/projects?limit=1" -o "$result"
python3 - "$result" <<'PY'
import json,sys
with open(sys.argv[1]) as f: data=json.load(f)
assert isinstance(data.get('docs'),list), 'Invalid projects response'
print('Public projects API passed')
PY
curl --fail --silent --show-error --max-time 20 "$origin/admin/login" -o /dev/null
status=$(curl --silent --show-error --max-time 20 -o /dev/null -w '%{http_code}' "$origin/api/admin/inquiries")
[[ "$status" == 401 ]] || { echo 'Staff endpoint must reject anonymous requests' >&2; exit 1; }
echo 'HTTPS, login page and authentication checks passed'
