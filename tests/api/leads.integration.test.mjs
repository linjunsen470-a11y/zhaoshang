import test from 'node:test';
import assert from 'node:assert/strict';

const enabled = process.env.MP_API_TEST_CONFIRM_ISOLATED === 'true';
const baseUrl = (process.env.MP_API_TEST_URL || '').replace(/\/$/, '');
const tokenA = process.env.MP_API_TEST_TOKEN_A || '';
const tokenB = process.env.MP_API_TEST_TOKEN_B || '';
const projectId = process.env.MP_API_TEST_PROJECT_ID || '';

async function request(path, { token = tokenA, method = 'GET', body } = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  let payload;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }
  return { response, payload };
}

test('isolated backend lead API contract', { skip: !enabled }, async t => {
  assert.ok(baseUrl, 'MP_API_TEST_URL is required');
  assert.ok(tokenA && tokenB, 'two independent test-user tokens are required');
  const createdIds = [];
  const runId = `api-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  t.after(async () => {
    await Promise.allSettled(createdIds.map(id => request(`/leads/${id}`, { method: 'DELETE' })));
  });

  await t.test('public projects expose only public statuses', async () => {
    const { response, payload } = await request('/projects?public=true', { token: '' });
    assert.equal(response.status, 200);
    assert.ok(Array.isArray(payload));
    assert.ok(payload.every(project => ['online', 'coming', 'full'].includes(project.status)));
  });

  const leadTypes = [
    'leasing',
    'transfer',
    'equipment_sell',
    'equipment_buy',
    'equipment_recycle',
    'renovation_consult',
  ];
  for (const leadType of leadTypes) {
    await t.test(`creates ${leadType} without accepting CRM fields`, async () => {
      const { response, payload } = await request('/leads', {
        method: 'POST',
        body: {
          leadType,
          name: 'API测试用户',
          phone: '13812345678',
          businessType: `type-${leadType}`,
          budgetRange: '5-10万',
          regionPreference: '自动化测试区',
          remark: runId,
          projectId: projectId || undefined,
          status: 'closed',
          assignedTo: 1,
        },
      });
      assert.equal(response.status, 201);
      assert.ok(payload.id);
      createdIds.push(payload.id);
      assert.equal(payload.leadType, leadType);
      assert.equal(payload.status, 'new');
      assert.equal('submitterOpenId' in payload, false);
      assert.equal('assignedTo' in payload, false);
    });
  }

  const targetId = createdIds[0];
  await t.test('enforces ownership on read/update/delete', async () => {
    assert.equal((await request(`/leads/${targetId}`, { token: tokenB })).response.status, 403);
    assert.equal((await request(`/leads/${targetId}`, {
      token: tokenB,
      method: 'PUT',
      body: { remark: 'foreign update' },
    })).response.status, 403);
    assert.equal((await request(`/leads/${targetId}`, { token: tokenB, method: 'DELETE' })).response.status, 403);
  });

  await t.test('rejects invalid input and missing resources', async () => {
    assert.equal((await request('/leads', {
      method: 'POST',
      body: { name: runId, phone: '123', businessType: 'x', budgetRange: 'x' },
    })).response.status, 400);
    assert.equal((await request('/leads/not-a-real-id')).response.status, 404);
    assert.equal((await request('/leads', { token: '', method: 'GET' })).response.status, 401);
  });

  await t.test('rejects an unknown attachment', async () => {
    const { response } = await request('/leads', {
      method: 'POST',
      body: {
        name: runId,
        phone: '13812345678',
        businessType: '小吃',
        budgetRange: '5-10万',
        attachments: ['999999999'],
      },
    });
    assert.equal(response.status, 400);
  });

  await t.test('rejects an image larger than 10MB', async () => {
    const data = new FormData();
    data.set('file', new Blob([new Uint8Array(10 * 1024 * 1024 + 1)], { type: 'image/jpeg' }), 'oversized.jpg');
    const response = await fetch(`${baseUrl}/uploads/lead-image`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenA}` },
      body: data,
    });
    assert.equal(response.status, 413);
  });
});
