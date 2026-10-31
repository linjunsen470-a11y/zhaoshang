import test from 'node:test';
import assert from 'node:assert/strict';
import { lastSuccessfulDeployment, planChanges } from '../../scripts/ci-plan.mjs';

test('documentation, mini-program, website and backend tests do not publish backend images', () => {
  for (const path of ['mp/pages/index/index.js', 'website/index.html', 'server.js', 'tests/unit/mp-api.test.mjs', 'backend/tests/tokens.test.ts', 'backend/.env.example', 'backend/eslint.config.mjs']) {
    assert.deepEqual(planChanges('push', [path]), { checks: true, images: false, release: false }, path);
  }
  assert.deepEqual(planChanges('push', ['docs/ci-deployment.md', 'website/README.md']), { checks: false, images: false, release: false });
});

test('runtime, dependency and deployment changes keep the full release chain', () => {
  for (const path of ['backend/app/api/leads/route.ts', 'backend/collections/Projects.ts', 'backend/pnpm-lock.yaml', 'backend/Dockerfile', 'backend/.dockerignore', 'backend/scripts/push-schema.ts', 'docker-compose.yml', 'deploy/deploy.sh', 'deploy/check.sh', '.github/workflows/ci.yml', 'scripts/ci-plan.mjs']) {
    assert.deepEqual(planChanges('push', [path]), { checks: true, images: true, release: true }, path);
    assert.deepEqual(planChanges('pull_request', [path]), { checks: true, images: true, release: false }, path);
  }
});

test('a later docs-only push still checks and releases unpublished backend changes', () => {
  assert.deepEqual(planChanges('push', ['README.md'], ['backend/app/api/leads/route.ts', 'README.md']), { checks: true, images: true, release: true });
  assert.deepEqual(planChanges('push', ['README.md'], ['README.md']), { checks: false, images: false, release: false });
});

test('manual dispatch explicitly retains a complete release', () => {
  assert.deepEqual(planChanges('workflow_dispatch', [], []), { checks: true, images: true, release: true });
});

test('release baseline ignores failed deployments and accepts a previously successful inactive deployment', async () => {
  const calls = [];
  const request = async url => {
    calls.push(url);
    const body = url.includes('/statuses')
      ? (url.includes('/3/') ? [{ state: 'failure' }] : [{ state: 'inactive' }, { state: 'success' }])
      : [{ id: 3, sha: 'failed' }, { id: 2, sha: 'successful' }];
    return { ok: true, json: async () => body };
  };
  assert.equal(await lastSuccessfulDeployment('owner/repo', 'test-token', request), 'successful');
  assert.equal(calls.length, 3);
});

test('a repository without a successful deployment gets a full-tree baseline; API errors stop planning', async () => {
  assert.equal(await lastSuccessfulDeployment('owner/repo', 'test-token', async () => ({ ok: true, json: async () => [] })), null);
  await assert.rejects(lastSuccessfulDeployment('owner/repo', 'test-token', async () => ({ ok: false, status: 403 })), /lookup failed \(403\)/);
});
