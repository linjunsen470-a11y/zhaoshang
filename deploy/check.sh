#!/usr/bin/env bash
set -euo pipefail
origin=${1:?HTTPS origin required}
[[ "$origin" =~ ^https://[a-zA-Z0-9.-]+$ ]]
result=$(mktemp)
trap 'rm -f -- "$result"' EXIT
curl_options=(--silent --show-error --retry 2 --retry-delay 2 --retry-all-errors --connect-timeout 5 --max-time 20)
curl "${curl_options[@]}" --fail "$origin/api/projects?limit=1" -o "$result"
python3 - "$result" <<'PY'
import json,sys
with open(sys.argv[1]) as f: data=json.load(f)
assert isinstance(data.get('docs'),list), 'Invalid projects response'
print('Public projects API passed')
PY
curl "${curl_options[@]}" --fail "$origin/admin/login" -o /dev/null
status=$(curl "${curl_options[@]}" -o /dev/null -w '%{http_code}' "$origin/api/admin/inquiries")
[[ "$status" == 401 ]] || { echo 'Staff endpoint must reject anonymous requests' >&2; exit 1; }
echo 'HTTPS, login page and authentication checks passed'
