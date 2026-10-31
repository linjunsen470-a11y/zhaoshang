import { appendFileSync, readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const deploymentFiles = new Set([
  '.github/workflows/ci.yml', 'scripts/ci-plan.mjs',
  'docker-compose.yml', 'deploy/deploy.sh', 'deploy/check.sh',
]);
const documentation = path => path.startsWith('docs/') || path.endsWith('.md');
const imageInput = path => deploymentFiles.has(path) || (
  path.startsWith('backend/') && !documentation(path)
  && !path.startsWith('backend/tests/')
  && !['backend/.env.example', 'backend/eslint.config.mjs'].includes(path)
);

export function planChanges(eventName, changedPaths, releasePaths = changedPaths, buildImages = true) {
  if (!buildImages) return { checks: eventName === 'workflow_dispatch' || changedPaths.some(path => !documentation(path)), images: false, release: false };
  if (eventName === 'workflow_dispatch') return { checks: true, images: true, release: true };
  const release = eventName === 'push' && releasePaths.some(imageInput);
  const images = eventName === 'pull_request' ? changedPaths.some(imageInput) : release;
  return { checks: release || changedPaths.some(path => !documentation(path)), images, release };
}

export async function lastSuccessfulDeployment(repository, token, request = fetch, apiUrl = 'https://api.github.com') {
  async function get(path) {
    const response = await request(`${apiUrl}/repos/${repository}${path}`, {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json' },
      signal: AbortSignal.timeout(15_000),
    });
    if (!response.ok) throw new Error(`GitHub deployment lookup failed (${response.status})`);
    return response.json();
  }
  for (let page = 1; ; page++) {
    const deployments = await get(`/deployments?environment=tencent-test&per_page=100&page=${page}`);
    for (const deployment of deployments) {
      const statuses = await get(`/deployments/${deployment.id}/statuses?per_page=100`);
      if (statuses.some(status => status.state === 'success')) return deployment.sha;
    }
    if (deployments.length < 100) return null;
  }
}

function changedFiles(base, head) {
  if (!/^[a-f0-9]{40}$/.test(head)) throw new Error('Invalid head commit');
  if (!base || /^0+$/.test(base)) {
    return execFileSync('git', ['ls-tree', '-r', '--name-only', '-z', head], { encoding: 'utf8' }).split('\0').filter(Boolean);
  }
  if (!/^[a-f0-9]{40}$/.test(base)) throw new Error('Invalid base commit');
  try { execFileSync('git', ['cat-file', '-e', `${base}^{commit}`], { stdio: 'ignore' }); }
  catch { execFileSync('git', ['fetch', '--no-tags', '--depth=1', 'origin', base], { stdio: 'inherit' }); }
  return execFileSync('git', ['diff', '--name-only', '--no-renames', '-z', base, head, '--'], { encoding: 'utf8' }).split('\0').filter(Boolean);
}

async function main() {
  const eventName = process.env.GITHUB_EVENT_NAME;
  const event = JSON.parse(readFileSync(process.env.GITHUB_EVENT_PATH, 'utf8'));
  const head = process.env.GITHUB_SHA;
  const buildImages = process.env.CI_BUILD_IMAGES !== 'false';
  let paths = [];
  let releasePaths = [];
  let releaseBase = null;
  if (eventName === 'pull_request') {
    paths = changedFiles(event.pull_request.base.sha, head);
  } else if (eventName === 'push') {
    paths = changedFiles(event.before, head);
    if (buildImages) {
      releaseBase = await lastSuccessfulDeployment(process.env.GITHUB_REPOSITORY, process.env.GH_TOKEN, fetch, process.env.GITHUB_API_URL);
      releasePaths = changedFiles(releaseBase, head);
    }
  } else if (eventName !== 'workflow_dispatch') {
    throw new Error('Unsupported CI event');
  }
  const plan = planChanges(eventName, paths, releasePaths, buildImages);
  appendFileSync(process.env.GITHUB_OUTPUT, Object.entries(plan).map(([key, value]) => `${key}=${value}\n`).join(''));
  const summary = `CI plan: ${JSON.stringify(plan)}; release baseline: ${releaseBase || 'full build'}\n`;
  console.log(summary.trim());
  if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, summary);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(error => { console.error(error.message); process.exitCode = 1; });
}
