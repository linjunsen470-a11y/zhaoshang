import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { createStorage, loadMiniProgramModule } from '../helpers/load-cjs.mjs';

const modulePath = path.resolve('mp/utils/favorites.js');
const flush = () => new Promise(resolve => setImmediate(resolve));

function setup(storage, api) {
  const messages = [];
  const favorites = loadMiniProgramModule(modulePath, {
    globals: { wx: { ...storage, showToast: value => messages.push(value.title) }, getApp: () => ({ globalData: { useLocalMock: false } }) },
    stubs: { '../services/api.js': api },
  });
  return { favorites, messages };
}

test('failed writes remain on the device and retry syncs the latest intent', async () => {
  const storage = createStorage({ authOpenId: 'owner-a' });
  let online = false;
  const cloud = new Set();
  const api = {
    getFavorites: async () => {
      if (!online) throw new Error('network');
      return { owner: 'owner-a', docs: [...cloud].map(projectId => ({ projectId })), page: 1, hasNextPage: false };
    },
    setFavorite: async (id, active, owner) => {
      assert.equal(owner, 'owner-a');
      if (active) cloud.add(id); else cloud.delete(id);
    },
  };
  const { favorites } = setup(storage, api);
  favorites.toggleFavorite(42);
  await flush();
  assert.deepEqual(Array.from(favorites.snapshot().ids), ['42']);
  assert.equal(favorites.snapshot().pending, 1);
  assert.equal(favorites.snapshot().status, 'error');

  // A new app session retains the pending change and can explicitly retry it.
  online = true;
  const reloaded = setup(storage, api).favorites;
  await reloaded.syncFavorites();
  assert.deepEqual([...cloud], ['42']);
  assert.equal(reloaded.snapshot().pending, 0);
  assert.equal(reloaded.snapshot().status, 'synced');
});

test('the same account can restore and remove its favorites on another device', async () => {
  const cloud = new Set();
  const api = {
    getFavorites: async () => ({ owner: 'owner-a', docs: [...cloud].map(projectId => ({ projectId })), page: 1, hasNextPage: false }),
    setFavorite: async (id, active) => { if (active) cloud.add(id); else cloud.delete(id); },
  };
  const first = setup(createStorage({ authOpenId: 'owner-a' }), api).favorites;
  const second = setup(createStorage({ authOpenId: 'owner-a' }), api).favorites;
  first.toggleFavorite('42');
  await first.syncFavorites();
  await second.syncFavorites();
  assert.deepEqual(Array.from(second.snapshot().ids), ['42']);
  second.toggleFavorite('42');
  await second.syncFavorites();
  await first.syncFavorites();
  assert.equal(first.snapshot().ids.length, 0);
});

test('a local storage failure leaves the previous favorite state unchanged', () => {
  const storage = createStorage({ authOpenId: 'owner-a', favorite_sync_state: {
    activeOwner: 'owner-a', sequence: 0,
    accounts: [{ owner: 'owner-a', ids: ['42'], pending: [], status: 'synced', error: '' }],
  } });
  const failingStorage = { ...storage, setStorageSync: () => { throw new Error('storage full'); } };
  const { favorites, messages } = setup(failingStorage, {});
  assert.equal(favorites.toggleFavorite(42), true);
  assert.deepEqual(Array.from(favorites.snapshot().ids), ['42']);
  assert.match(messages[0], /保存失败/);
});

test('a cancellation made during an in-flight save is not lost', async () => {
  const storage = createStorage({ authOpenId: 'owner-a' });
  const writes = [];
  let finishPut;
  const api = {
    getFavorites: async () => ({ owner: 'owner-a', docs: [], page: 1, hasNextPage: false }),
    setFavorite: (id, active) => {
      writes.push([id, active]);
      return active ? new Promise(resolve => { finishPut = resolve; }) : Promise.resolve();
    },
  };
  const { favorites } = setup(storage, api);
  favorites.toggleFavorite('9');
  await flush();
  assert.equal(typeof finishPut, 'function');
  favorites.toggleFavorite('9');
  finishPut();
  await favorites.syncFavorites();
  assert.deepEqual(writes, [['9', true], ['9', false]]);
  assert.equal(favorites.snapshot().ids.length, 0);
  assert.equal(favorites.snapshot().pending, 0);
});

test('a changed account never receives another account\'s pending favorites', async () => {
  const storage = createStorage({ authOpenId: 'owner-a', favorite_sync_state: {
    activeOwner: 'owner-a', sequence: 1,
    accounts: [{ owner: 'owner-a', ids: ['1'], pending: [{ id: '1', active: true, sequence: 1 }], status: 'error', error: '' }],
  } });
  const writes = [];
  const { favorites } = setup(storage, {
    getFavorites: async () => {
      storage.setStorageSync('authOpenId', 'owner-b');
      return { owner: 'owner-b', docs: [{ projectId: '2' }], page: 1, hasNextPage: false };
    },
    setFavorite: async (...args) => writes.push(args),
  });
  await favorites.syncFavorites();
  assert.deepEqual(Array.from(favorites.snapshot().ids), ['2']);
  assert.equal(writes.length, 0);
  assert.equal(storage.getStorageSync('favorite_sync_state').accounts.find(item => item.owner === 'owner-a').pending.length, 1);
});

test('a response from the previous account is discarded after an account switch', async () => {
  const storage = createStorage({ authOpenId: 'owner-a' });
  const { favorites } = setup(storage, {
    getFavorites: async () => {
      storage.setStorageSync('authOpenId', 'owner-b');
      return { owner: 'owner-a', docs: [{ projectId: 'private-a' }], page: 1, hasNextPage: false };
    },
  });
  await assert.rejects(() => favorites.syncFavorites(), /账号已变化/);
  assert.equal(favorites.snapshot().ids.length, 0);
  assert.equal(favorites.snapshot().status, 'error');
});

test('pending changes remain visible if login succeeds but the favorites request fails', async () => {
  const storage = createStorage();
  const { favorites } = setup(storage, {
    getFavorites: async () => { storage.setStorageSync('authOpenId', 'owner-a'); throw new Error('network'); },
  });
  favorites.toggleFavorite('7');
  await flush();
  assert.deepEqual(Array.from(favorites.snapshot().ids), ['7']);
  assert.equal(favorites.snapshot().pending, 1);
  assert.equal(favorites.snapshot().status, 'error');
});

test('unavailable pending saves are explained and can be removed', async () => {
  const storage = createStorage({ authOpenId: 'owner-a' });
  const writes = [];
  const { favorites } = setup(storage, {
    getFavorites: async () => ({ owner: 'owner-a', docs: [], page: 1, hasNextPage: false }),
    setFavorite: async (id, active) => {
      writes.push([id, active]);
      if (active) throw Object.assign(new Error('unavailable'), { statusCode: 404 });
    },
  });
  favorites.toggleFavorite('8');
  await flush();
  assert.match(favorites.snapshot().error, /不可用/);
  favorites.setFavorite('8', false);
  await favorites.syncFavorites();
  assert.equal(favorites.snapshot().pending, 0);
  assert.deepEqual(writes, [['8', true], ['8', false]]);
});

test('cloud favorites load all pages without duplicates', async () => {
  const storage = createStorage({ authOpenId: 'owner-a' });
  const { favorites } = setup(storage, {
    getFavorites: async ({ page }, expectedOwner) => {
      if (page === 2) assert.equal(expectedOwner, 'owner-a');
      return page === 1
        ? { owner: 'owner-a', docs: [{ projectId: 1 }], page, hasNextPage: true }
        : { owner: 'owner-a', docs: [{ projectId: '1' }, { projectId: '2' }], page, hasNextPage: false };
    },
  });
  await favorites.syncFavorites();
  assert.deepEqual(Array.from(favorites.snapshot().ids), ['1', '2']);
});

test('browsing without an established identity does not start background login', () => {
  const storage = createStorage();
  const { favorites } = setup(storage, {});
  assert.equal(favorites.canSyncInBackground(), false);
  storage.setStorageSync('authOpenId', 'owner-a');
  assert.equal(favorites.canSyncInBackground(), true);
});

test('recent entries can be removed individually or cleared on this device', () => {
  const storage = createStorage();
  const recent = loadMiniProgramModule(path.resolve('mp/utils/recent.js'), { globals: { wx: storage } });
  recent.rememberProject(1);
  recent.rememberProject(2);
  recent.removeRecent('1');
  assert.deepEqual(Array.from(recent.recentIds()), ['2']);
  recent.clearRecent();
  assert.equal(recent.recentIds().length, 0);
});

test('the scoped list displays an unavailable placeholder and can remove it', async () => {
  const storage = createStorage({ recent_projects: ['gone', 'visible'] });
  let definition;
  loadMiniProgramModule(path.resolve('mp/pages/list/list.js'), {
    globals: { Page: value => { definition = value; }, wx: storage },
    stubs: { '../../services/api.js': { getProjectPage: async () => ({ docs: [{ id: 'visible', title: '可见项目' }], page: 1, hasNextPage: false }) } },
  });
  const page = { ...definition, data: structuredClone(definition.data), setData(patch) { Object.assign(this.data, patch); } };
  page.setFilters({ recent: true });
  await page.loadProjects();
  assert.equal(page.data.totalDocs, 2);
  assert.equal(page.data.projectList[0].unavailable, true);
  assert.equal(page.data.projectList[1].title, '可见项目');
  await page.onRemoveRecent({ currentTarget: { dataset: { id: 'gone' } } });
  assert.equal(page.data.totalDocs, 1);
  assert.equal(page.data.projectList[0].id, 'visible');
});

test('favorites paginate by the saved order while preserving unavailable entries', async () => {
  const ids = Array.from({ length: 25 }, (_, index) => String(index + 1));
  const storage = createStorage({ authOpenId: 'owner-a', favorite_sync_state: {
    activeOwner: 'owner-a', sequence: 0,
    accounts: [{ owner: 'owner-a', ids, pending: [], status: 'synced', error: '' }],
  } });
  let definition;
  loadMiniProgramModule(path.resolve('mp/pages/list/list.js'), {
    globals: { Page: value => { definition = value; }, wx: storage },
    stubs: { '../../services/api.js': { getProjectPage: async params => ({
      docs: params.ids.split(',').filter(id => id !== '3').reverse().map(id => ({ id })), page: 1, hasNextPage: false,
    }) } },
  });
  const page = { ...definition, data: structuredClone(definition.data), setData(patch) { Object.assign(this.data, patch); } };
  page.setFilters({ favs: true });
  await page.loadProjects();
  assert.equal(page.data.totalDocs, 25);
  assert.equal(page.data.projectList[2].unavailable, true);
  assert.equal(page.data.hasNextPage, true);
  await page.loadProjects(null, true);
  assert.deepEqual(Array.from(page.data.projectList, item => String(item.id)), ids);
  assert.equal(page.data.hasNextPage, false);
});

test('clearing recent history asks for confirmation and does not affect favorites', async () => {
  const storage = createStorage({ recent_projects: ['1', '2'], favorite_sync_state: {
    activeOwner: '', sequence: 0, accounts: [{ owner: '', ids: ['1'], pending: [], status: 'idle', error: '' }],
  } });
  let confirmation;
  let definition;
  loadMiniProgramModule(path.resolve('mp/pages/list/list.js'), {
    globals: { Page: value => { definition = value; }, wx: { ...storage, showModal: options => { confirmation = options; } } },
    stubs: { '../../services/api.js': { getProjectPage: async () => ({ docs: [], page: 1, hasNextPage: false }) } },
  });
  const page = { ...definition, data: structuredClone(definition.data), setData(patch) { Object.assign(this.data, patch); } };
  page.setFilters({ recent: true });
  page.onClearRecent();
  confirmation.success({ confirm: false });
  assert.equal(storage.getStorageSync('recent_projects').length, 2);
  confirmation.success({ confirm: true });
  await flush();
  assert.equal(storage.getStorageSync('recent_projects').length, 0);
  assert.equal(storage.getStorageSync('favorite_sync_state').accounts[0].ids.length, 1);
});

test('home unsubscribes when hidden while preserving its existing close behavior', () => {
  const storage = createStorage();
  let definition;
  let unsubscribed = 0;
  loadMiniProgramModule(path.resolve('mp/pages/index/index.js'), {
    globals: { Page: value => { definition = value; }, wx: storage },
    stubs: { '../../utils/favorites.js': {
      canSyncInBackground: () => false,
      subscribeFavorites: () => () => { unsubscribed++; },
      snapshot: () => ({ ids: [] }),
      isFavorite: () => false,
    } },
  });
  const page = { ...definition, data: structuredClone(definition.data), _useLocalMock: false, setData(patch) { Object.assign(this.data, patch); } };
  page.data.showServices = true;
  page.data.searchFocused = true;
  page.onShow();
  page.onHide();
  assert.equal(unsubscribed, 1);
  assert.equal(page.data.showServices, false);
  assert.equal(page.data.searchFocused, false);
});
