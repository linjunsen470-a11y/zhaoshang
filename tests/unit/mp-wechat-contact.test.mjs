import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import fs from 'node:fs';
import { createStorage, loadMiniProgramModule } from '../helpers/load-cjs.mjs';

const load = (file, options) => loadMiniProgramModule(path.resolve('mp', file), options);

test('phone consent cancellation never requests or invents a phone, and only codes reach the API', async () => {
  const calls = [];
  let result = { phone: '13812345678' };
  const contact = load('utils/wechatContact.js', { stubs: { '../services/api.js': { getWechatPhone: async code => { calls.push(code); return result; } } } });
  assert.equal(await contact.authorizeWechatPhone({ detail: { errMsg: 'getPhoneNumber:fail user deny' } }), null);
  assert.equal(calls.length, 0);
  await assert.rejects(contact.authorizeWechatPhone({ detail: { errMsg: 'getPhoneNumber:ok' } }));
  assert.equal(await contact.authorizeWechatPhone({ detail: { code: 'one-time-phone-code', phone: '13999999999' } }), '13812345678');
  assert.deepEqual(calls, ['one-time-phone-code']);
  result = { phone: 'bad-phone' };
  await assert.rejects(contact.authorizeWechatPhone({ detail: { code: 'another-code' } }));
});

test('form authorization blocks duplicate requests and preserves nickname and privacy choice', async () => {
  let behavior;
  let finish;
  let requests = 0;
  const storage = createStorage({ userInfo: { nickname: '微信昵称', avatarUrl: '/images/icons/my.png' } });
  const app = { globalData: { userInfo: {} } };
  const api = { getWechatPhone: () => { requests++; return new Promise(resolve => { finish = resolve; }); } };
  load('utils/formBehavior.js', {
    globals: { Behavior: value => { behavior = value; return value; }, getApp: () => app, wx: { ...storage, showToast() {} } },
    stubs: { '../services/api.js': api, '../services/upload.js': {} }
  });
  const page = { ...behavior.methods, data: { ...structuredClone(behavior.data), name: '微信昵称' }, setData(patch) { Object.assign(this.data, patch); } };
  const first = page.onGetPhoneNumber({ detail: { code: 'one-time' } });
  await page.onGetPhoneNumber({ detail: { code: 'duplicate' } });
  assert.equal(requests, 1);
  assert.equal(page.validateCommonForm(), false);
  finish({ phone: '13812345678' });
  await first;
  assert.equal(page.data.phone, '13812345678');
  assert.equal(page.data.name, '微信昵称');
  assert.equal(page.data.phoneAuthorizing, false);
  assert.equal(page.data.privacyAccepted, false);
  assert.equal(storage.getStorageSync('privacyConsentAccepted'), undefined);
  assert.equal(storage.getStorageSync('userInfo').nickname, '微信昵称');
  assert.equal(app.globalData.userInfo.phone, '13812345678');
});

test('authorization failures retain the previous phone and allow retry', async () => {
  let behavior;
  const toasts = [];
  load('utils/formBehavior.js', {
    globals: { Behavior: value => { behavior = value; return value; }, wx: { showToast: value => toasts.push(value) } },
    stubs: { '../services/api.js': { getWechatPhone: async () => { throw new Error('请重新授权'); } }, '../services/upload.js': {} }
  });
  const page = { ...behavior.methods, data: { ...structuredClone(behavior.data), phone: '13812345678' }, setData(patch) { Object.assign(this.data, patch); } };
  await page.onGetPhoneNumber({ detail: { code: 'expired' } });
  assert.equal(page.data.phone, '13812345678');
  assert.equal(page.data.phoneAuthorizing, false);
  assert.equal(toasts[0].title, '请重新授权');
});

test('phone authorization reaches the real authenticated endpoint even while business data uses local mock', async () => {
  const calls = [];
  const authCalls = [];
  const storage = createStorage({ local_projects: [], local_leads: [] });
  const app = { globalData: { apiUrl: 'https://unit.test/api', useLocalMock: true, configError: '' } };
  const api = load('services/api.js', {
    globals: { getApp: () => app, wx: { ...storage, request(options) { calls.push(options); options.success({ statusCode: calls.length === 1 ? 401 : 200, data: { phone: '13812345678' } }); } } },
    stubs: { './auth.js': { getAuthToken: async (...args) => { authCalls.push(args); return 'unit-token'; }, clearAuth() {} } }
  });
  assert.equal((await api.getWechatPhone('phone-code')).phone, '13812345678');
  assert.equal(calls.length, 2);
  assert.equal(calls[0].url, 'https://unit.test/api/auth/wechat-phone');
  assert.equal(calls[0].header.Authorization, 'Bearer unit-token');
  assert.equal(calls[0].data.code, 'phone-code');
  assert.deepEqual(authCalls, [[false, true], [true, true]]);
  assert.deepEqual(storage.getStorageSync('local_leads'), []);
});

test('explicit phone authorization can log in remotely without changing the local mock setting', async () => {
  const storage = createStorage();
  const app = { globalData: { apiUrl: 'https://unit.test/api', useLocalMock: true, configError: '', envVersion: 'release' } };
  let logins = 0;
  const auth = load('services/auth.js', { globals: { getApp: () => app, wx: { ...storage, login(options) { logins++; options.success({ code: 'login-code' }); }, request(options) { assert.equal(options.data.code, 'login-code'); options.success({ statusCode: 200, data: { token: 'unit-token', openid: 'owner', expiresAt: Date.now() + 86400000 } }); } } } });
  assert.equal(await auth.getAuthToken(), '');
  assert.equal(logins, 0);
  assert.equal(await auth.getAuthToken(false, true), 'unit-token');
  assert.equal(logins, 1);
  assert.equal(app.globalData.useLocalMock, true);
});

test('all contact surfaces offer WeChat nickname selection and phone consent without a phone text field', () => {
  for (const name of ['apply', 'transfer', 'equipment', 'renovation', 'my']) {
    const source = fs.readFileSync(path.resolve(`mp/pages/${name}/${name}.wxml`), 'utf8');
    assert.match(source, /type="nickname"/);
    assert.match(source, /open-type="getPhoneNumber"[^>]+bindgetphonenumber=/);
    assert.doesNotMatch(source, /<input[^>]+(?:id="(?:input|profile)-phone"|bindinput="onInputPhone"|bindinput="onPhoneInput")/);
  }
});
