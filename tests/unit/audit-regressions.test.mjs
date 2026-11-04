import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { createStorage, loadMiniProgramModule } from '../helpers/load-cjs.mjs';
test('completed forms stay locked when redirect fails, preventing duplicate creation', async () => {
  for (const name of ['apply', 'transfer', 'equipment', 'renovation']) {
    let definition;
    let submissions = 0;
    let redirects = 0;
    const submit = async () => { submissions++; return { id: '123' }; };
    loadMiniProgramModule(path.resolve(`mp/pages/${name}/${name}.js`), {
      globals: {
        Page: value => { definition = value; }, Behavior: value => value,
        wx: { ...createStorage(), pageScrollTo() {}, showModal() {}, redirectTo(options) { redirects++; options.fail(); } },
        getApp: () => ({ globalData: {} })
      },
      stubs: { '../../services/api.js': { submitLead: submit, submitTransfer: submit, submitEquipment: submit } }
    });
    const behavior = definition.behaviors[0];
    const page = { ...behavior.methods, ...definition, data: { ...structuredClone(behavior.data), ...structuredClone(definition.data),
      privacyAccepted: true, phone: '13812345678', locationText: '广州', leadType: 'equipment_sell', equipmentName: '冰箱' },
      setData(patch) { Object.assign(this.data, patch); } };
    page.onSubmitForm();
    await new Promise(resolve => setImmediate(resolve));
    page.onSubmitForm();
    assert.equal(submissions, 1, name);
    assert.equal(redirects, 1, name);
    assert.equal(page.data.submitting, true, name);
  }
});

test('upload is blocked after consent is unchecked even with historical consent', async () => {
  let uploads = 0;
  const behavior = loadMiniProgramModule(path.resolve('mp/utils/formBehavior.js'), {
    globals: { Behavior: value => value, wx: { ...createStorage({ privacyConsentAccepted: true }), pageScrollTo() {} } },
    stubs: { '../services/upload.js': { pickCompressAndUpload: async () => { uploads++; return []; } } }
  });
  const page = { ...behavior.methods, data: structuredClone(behavior.data), setData(patch) { Object.assign(this.data, patch); } };
  await page.onChooseImages();
  assert.equal(uploads, 0);
  assert.match(page.data.fieldErrors.privacy, /隐私/);
  page.data.privacyAccepted = true;
  await page.onChooseImages();
  assert.equal(uploads, 1);
});

test('numeric favorites match route strings and toggle without duplicates', () => {
  const storage = createStorage({ favorite_sync_state: { activeOwner: '', sequence: 0, accounts: [{ owner: '', ids: [42], pending: [], status: 'idle', error: '' }] } });
  const favorites = loadMiniProgramModule(path.resolve('mp/utils/favorites.js'), { globals: { wx: { ...storage, showToast() {} } }, stubs: { '../services/api.js': { getFavorites: async () => { throw new Error('offline'); } } } });
  assert.equal(favorites.isFavorite([42], '42'), true);
  assert.equal(favorites.toggleFavorite('42'), false);
  assert.equal(favorites.snapshot().ids.length, 0);
});

test('late concurrent 401 reuses refreshed authentication and remote requests do not seed demo data', async () => {
  const storage = createStorage({ authToken: 'old', authTokenExpiresAt: Date.now() + 3600000 });
  const pending = [];
  const sent = [];
  let logins = 0;
  const wx = { ...storage,
    login(options) { logins++; options.success({ code: 'code' }); },
    request(options) {
      if (options.url.endsWith('/auth/wechat-login')) {
        options.success({ statusCode: 200, data: { token: 'new', openid: 'test', expiresAt: Date.now() + 3600000 } });
      } else {
        sent.push(options.header.Authorization);
        if (options.header.Authorization === 'Bearer old') pending.push(options);
        else options.success({ statusCode: 200, data: [] });
      }
    }
  };
  const api = loadMiniProgramModule(path.resolve('mp/services/api.js'), { globals: { wx, getApp: () => ({ globalData: { apiUrl: 'https://test.invalid/api', useLocalMock: false } }) } });
  const first = api.getLeads();
  const second = api.getLeads();
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(pending.length, 2);
  pending[0].success({ statusCode: 401 });
  await first;
  pending[1].success({ statusCode: 401 });
  await second;
  assert.equal(logins, 1);
  assert.deepEqual(sent, ['Bearer old', 'Bearer old', 'Bearer new', 'Bearer new']);
  assert.equal(storage.getStorageSync('local_projects'), undefined);
});

test('edit success stays locked and page detachment cancels delayed navigation', async () => {
  for (const name of ['apply', 'transfer', 'equipment', 'renovation']) {
    let definition, timer, cancelled;
    let updates = 0;
    loadMiniProgramModule(path.resolve(`mp/pages/${name}/${name}.js`), {
      globals: {
        Page: value => { definition = value; }, Behavior: value => value,
        wx: { ...createStorage(), showToast() {}, pageScrollTo() {} }, getApp: () => ({ globalData: {} }),
        setTimeout: callback => { timer = callback; return 123; }, clearTimeout: id => { cancelled = id; }
      },
      stubs: { '../../services/api.js': { updateLead: async () => { updates++; return { id: 1 }; } } }
    });
    const behavior = definition.behaviors[0];
    const page = { ...behavior.methods, ...definition, data: { ...structuredClone(behavior.data), ...structuredClone(definition.data), isEditMode: true, leadId: '1', phone: '13812345678', locationText: '广州', leadType: 'equipment_sell', equipmentName: '冰箱' }, setData(patch) { Object.assign(this.data, patch); } };
    page.onSubmitForm();
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(page.data.submitting, true, name);
    page.onSubmitForm();
    assert.equal(updates, 1, name);
    assert.equal(typeof timer, 'function');
    behavior.lifetimes.detached.call(page);
    assert.equal(cancelled, 123);
  }
});

test('attachment preview return preserves cards and subsequent page returns refresh', () => {
  let definition;
  loadMiniProgramModule(path.resolve('mp/pages/leads/leads.js'), { globals: { Page: value => { definition = value; }, wx: { previewImage() {} } } });
  let refreshes = 0;
  const page = { ...definition, data: { leadsList: [{ id: '1', expanded: true, attachments: [{ id: 'a', url: 'https://test.invalid/a.png' }] }] }, refreshLeads() { refreshes++; } };
  page.onPreviewAttachment({ currentTarget: { dataset: { leadId: '1' } } });
  page.onShow();
  assert.equal(refreshes, 0);
  assert.equal(page.data.leadsList[0].expanded, true);
  page.onShow();
  assert.equal(refreshes, 1);
});
