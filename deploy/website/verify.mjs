import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { get } from 'node:http';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const args = process.argv.slice(2);
if (args.length > 1 || (args.length === 1 && args[0] !== '--skip-github')) {
  throw new Error('Usage: node deploy/website/verify.mjs [--skip-github]');
}

const root = fileURLToPath(new URL('../../', import.meta.url));
const git = (...params) => execFileSync('git', params, { cwd: root, encoding: 'utf8' }).trim();
const revision = git('rev-parse', '--verify', 'HEAD^{commit}');
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const assets = ['index.html', 'about.html', 'services.html', 'contact.html', 'css/style.css', 'js/main.js'];
const configs = ['nginx-ip.conf', 'nginx-preview.conf', 'nginx-public.conf'];
const files = [
  ...assets.map(file => ({ source: `website/${file}`, remote: `/var/www/jinyi-website/current/${file}`, url: `/${file}` })),
  ...configs.map(file => ({ source: `deploy/website/${file}`, remote: `/etc/nginx/sites-available/jinyi-website-${file.slice(6)}` }))
];

for (const file of files) {
  file.expected = hash(execFileSync('git', ['show', `${revision}:${file.source}`], { cwd: root }));
}

const remoteCommand = `set -eu
sha256sum -- ${files.map(file => file.remote).join(' ')}
printf 'REVISION='; cat /var/www/jinyi-website/deployed-revision
for name in jinyi-website-ip.conf jinyi-website-preview.conf jinyi-website-public.conf; do
  test "$(readlink "/etc/nginx/sites-enabled/$name")" = "/etc/nginx/sites-available/$name"
done
sudo awk '
  /^frontend shared_https$/ { active=1; next }
  /^(frontend|backend|listen) / { active=0 }
  active && $0 == "    acl jinyi_site req.ssl_sni -i jinyifangchan.com" { acl=1 }
  active && $0 == "    use_backend wushi_https if jinyi_site" { route=1 }
  END { if (acl && route) print "HAPROXY=ok"; else exit 1 }
' /etc/haproxy/haproxy.cfg`;
const remote = execFileSync('ssh', [
  '-o', 'BatchMode=yes', '-o', 'ConnectTimeout=10', '-o', 'StrictHostKeyChecking=yes',
  '-o', `UserKnownHostsFile=${path.join(root, 'deploy/known_hosts')}`,
  'ubuntu@134.175.44.80', remoteCommand
], { cwd: root, encoding: 'utf8', timeout: 30000 });

const remoteHashes = new Map();
for (const line of remote.split(/\r?\n/)) {
  const match = /^([0-9a-f]{64})\s+(.+)$/.exec(line);
  if (match) remoteHashes.set(match[2], match[1]);
}
for (const file of files) {
  if (remoteHashes.get(file.remote) !== file.expected) throw new Error(`VPS file differs: ${file.source}`);
}
if (!remote.split(/\r?\n/).includes(`REVISION=${revision}`)) throw new Error('VPS deployed-revision differs from HEAD');
if (!remote.split(/\r?\n/).includes('HAPROXY=ok')) throw new Error('HAProxy domain route is missing');

const fetchHash = url => new Promise((resolve, reject) => {
  const request = get({ hostname: '134.175.44.80', path: url, timeout: 10000 }, response => {
    const digest = createHash('sha256');
    response.on('data', chunk => digest.update(chunk));
    response.on('end', () => response.statusCode === 200
      ? resolve(digest.digest('hex'))
      : reject(new Error(`Public ${url} returned ${response.statusCode}`)));
    response.on('error', reject);
  });
  request.on('timeout', () => request.destroy(new Error(`Public ${url} timed out`)));
  request.on('error', reject);
});

await Promise.all(files.filter(file => file.url).map(async file => {
  if (await fetchHash(file.url) !== file.expected) throw new Error(`Public response differs: ${file.source}`);
}));

if (args[0] !== '--skip-github') {
  const result = execFileSync('git', ['ls-remote', '--exit-code', 'origin', 'refs/heads/main'], {
    cwd: root, encoding: 'utf8', timeout: 30000, env: { ...process.env, GIT_TERMINAL_PROMPT: '0' }
  }).trim();
  if (result.split(/\s+/)[0] !== revision) throw new Error('GitHub origin/main differs from HEAD');
}

console.log(`Verified ${revision}: ${assets.length} website files, ${configs.length} Nginx files, HAProxy route and public HTTP responses${args[0] === '--skip-github' ? ' (GitHub not checked)' : ', including GitHub origin/main'}.`);
