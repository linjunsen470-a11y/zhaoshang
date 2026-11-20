#!/usr/bin/env bash
# Run on the VPS after the matching application image has been deployed.
set -Eeuo pipefail

release=$(cd -- "$(dirname -- "$0")/../.." && pwd)
revision=${release##*/}
app=/opt/zhaoshang-test
site=/var/www/jinyi-website
vhost=/etc/nginx/sites-available/jinyi-website-public.conf
domain=jinyifangchan.com
assets=(index.html about.html services.html contact.html css/style.css js/main.js)

[[ $EUID == 0 && $revision =~ ^[0-9a-f]{40}$ && $release == "$app/releases/$revision" ]]
# A website-only application release already holds this lock on descriptor 9.
if [[ ! /proc/$$/fd/9 -ef "$app/.deploy.lock" ]]; then exec 9<>"$app/.deploy.lock"; fi
flock -w 120 9
[[ $(cat "$app/deployed-revision") == "$revision" ]] || { echo 'Deploy the matching application image first.' >&2; exit 1; }
[[ -L "$site/current" && -d "$site/current" && -f "$vhost" ]]
[[ $(readlink -f /etc/nginx/sites-enabled/jinyi-website-public.conf) == "$vhost" ]]

# Check the running image and its database before changing the public entry.
check_home() {
  grep -Fq 'id="scene-campus"' "$1" &&
    grep -Fq 'id="lead-form"' "$1" &&
    grep -Eq '<a [^>]*href="https://beian\.miit\.gov\.cn/"[^>]*>粤ICP备2026186178号</a>' "$1"
}
tmp=$(mktemp -d "$site/.switch.XXXXXXXX")
previous=$(readlink -f "$site/current")
enabled=false
[[ ! -f "$site/public-enabled" ]] || enabled=true
switching=false
cleanup() {
  status=$?
  trap - EXIT
  if (( status != 0 )) && [[ $switching == true ]]; then
    echo "Restoring previous website from $backup" >&2
    if [[ $enabled == false ]]; then rm -f "$site/public-enabled"; fi
    ln -s "$previous" "$tmp/restore"
    mv -Tf "$tmp/restore" "$site/current"
    cp -p "$backup/nginx-public.conf" "$vhost"
    if [[ -f "$backup/previous-revision" ]]; then
      cp -p "$backup/previous-revision" "$site/deployed-revision"
    else
      rm -f "$site/deployed-revision"
    fi
    nginx -t && systemctl reload nginx
  fi
  rm -rf -- "$tmp"
  exit "$status"
}
trap cleanup EXIT
trap 'exit 1' HUP INT TERM
curl -fsS --noproxy '*' --max-time 25 http://127.0.0.1:3300/ -o "$tmp/home"
check_home "$tmp/home" || { echo 'Running homepage failed its filing, listings or form check.' >&2; exit 1; }

backup_root=/var/backups/jinyi-website
install -d -m 0700 "$backup_root"
backup=$(mktemp -d "$backup_root/switch-XXXXXXXX")
cp -p "$vhost" "$backup/nginx-public.conf"
printf '%s\n' "$previous" > "$backup/previous-static-path"
if [[ -f "$site/deployed-revision" ]]; then cp -p "$site/deployed-revision" "$backup/previous-revision"; fi
printf '%s\n' "$enabled" > "$backup/previous-enabled"

install -d "$site/releases"
candidate=$(mktemp -d "$site/releases/$revision-XXXXXXXX")
chmod 0755 "$candidate"
for asset in "${assets[@]}"; do
  install -D -m 0644 "$release/website/$asset" "$candidate/$asset"
  cmp -s "$release/website/$asset" "$candidate/$asset"
done
ln -s "$candidate" "$tmp/current"
switching=true
mv -Tf "$tmp/current" "$site/current"
install -m 0644 "$release/deploy/website/nginx-public.conf" "$vhost"
nginx -t
touch "$site/public-enabled"
systemctl reload nginx

# The host's public TLS listener goes through HAProxy with the actual domain SNI.
origin=(curl -fsS --noproxy '*' --resolve "$domain:443:127.0.0.1" --max-time 25)
ready=false
for _ in {1..10}; do
  if "${origin[@]}" "https://$domain/" -o "$tmp/home" && check_home "$tmp/home"; then ready=true; break; fi
  sleep 1
done
[[ $ready == true ]] || { echo 'TLS origin did not serve the new homepage.' >&2; exit 1; }
for asset in about.html services.html contact.html; do
  "${origin[@]}" "https://$domain/$asset" -o "$tmp/page"
  cmp "$candidate/$asset" "$tmp/page"
done

printf '%s\n' "$revision" > "$tmp/revision"
mv -Tf "$tmp/revision" "$site/deployed-revision"
switching=false
printf 'Activated %s at the origin. Previous configuration: %s\n' "$revision" "$backup"
