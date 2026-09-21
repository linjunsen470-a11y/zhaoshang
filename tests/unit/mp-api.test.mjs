import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createStorage, loadMiniProgramModule } from '../helpers/load-cjs.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const apiPath = path.join(root, 'mp/services/api.js');

function makeLocalApi() {
  const storage = createStorage({ local_projects: [], local_leads: [] });
  const app = {
    globalData: {
      apiUrl: 'http://unused.test/api',
      useLocalMock: true,
      configError: '',
      devOpenId: 'unit-openid',
    },
  };
  const api = loadMiniProgramModule(apiPath, {
    globals: { wx: storage, getApp: () => app },
    stubs: {
      './auth.js': { getAuthToken: async () => '', clearAuth() {} },
      '../config.js': { API_URL: app.globalData.apiUrl, USE_LOCAL_MOCK: true, CONFIG_ERROR: '' },
    },
  });
  return { api, storage };
}

test('local mock lead CRUD is isolated by current openid', async () => {
  const { api, storage } = makeLocalApi();
  const created = await api.submitLead({
    leadType: 'leasing',
    name: '测试用户',
    phone: '13812345678',
    businessType: '小吃',
    budgetRange: '5-10万',
  });

  assert.ok(created.id);
  assert.equal((await api.getLeads()).length, 1);
  await api.updateLead(created.id, { remark: 'updated', status: 'closed' });
  assert.equal((await api.getLead(created.id)).remark, 'updated');
  assert.equal((await api.getLead(created.id)).status, 'new', 'CRM-only status must not be editable');

  storage.setStorageSync('authOpenId', 'someone-else');
  await assert.rejects(() => api.getLead(created.id), error => error.statusCode === 403);
  storage.setStorageSync('authOpenId', 'unit-openid');
  await api.deleteLead(created.id);
  assert.equal((await api.getLeads()).length, 0);
});

test('remote requests refresh once after 401', async () => {
  const calls = [];
  const authCalls = [];
  const auth = {
    getAuthToken: async force => {
      authCalls.push(force);
      return force ? 'fresh-token' : 'stale-token';
    },
    clearAuth() {},
  };
  const wx = {
    getStorageSync: () => undefined,
    setStorageSync() {},
    request(options) {
      calls.push(options);
      options.success(calls.length === 1
        ? { statusCode: 401, data: { error: 'expired' } }
        : { statusCode: 200, data: [] });
    },
  };
  const app = { globalData: { apiUrl: 'https://api.test', useLocalMock: false, configError: '' } };
  const api = loadMiniProgramModule(apiPath, {
    globals: { wx, getApp: () => app },
    stubs: {
      './auth.js': auth,
      '../config.js': { API_URL: app.globalData.apiUrl, USE_LOCAL_MOCK: false, CONFIG_ERROR: '' },
    },
  });

  await api.getLeads();
  assert.equal(calls.length, 2);
  assert.deepEqual(authCalls, [false, true]);
  assert.equal(calls[1].header.Authorization, 'Bearer fresh-token');
});
