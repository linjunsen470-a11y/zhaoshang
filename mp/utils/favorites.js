const api = require('../services/api.js');

const KEY = 'favorite_sync_state';
const listeners = new Set();
let syncing = null;

function emptyAccount(owner) {
  return { owner, ids: [], pending: [], status: 'idle', error: '' };
}

function readState() {
  const saved = wx.getStorageSync(KEY);
  return saved && Array.isArray(saved.accounts)
    ? { ...saved, accounts: saved.accounts.map(account => ({ ...account, ids: account.ids.slice(), pending: account.pending.map(item => ({ ...item })) })) }
    : { activeOwner: '', sequence: 0, accounts: [] };
}

function currentOwner(state) {
  return authenticatedOwner() || state.activeOwner || '';
}

function authenticatedOwner() {
  const stored = wx.getStorageSync('authOpenId');
  if (typeof stored === 'string' && stored) return stored;
  const app = typeof getApp === 'function' ? getApp() : null;
  return isMock() ? (app.globalData.devOpenId || 'dev-openid-local') : '';
}

function accountFor(state, owner) {
  let account = state.accounts.find(item => item.owner === owner);
  if (!account) {
    account = emptyAccount(owner);
    state.accounts.push(account);
  }
  return account;
}

function activateAccount(state, owner) {
  const account = accountFor(state, owner);
  const unbound = accountFor(state, '');
  if (unbound !== account && unbound.pending.length) {
    unbound.pending.forEach(item => {
      account.pending = account.pending.filter(existing => existing.id !== item.id || existing.sequence > item.sequence);
      if (!account.pending.some(existing => existing.id === item.id)) account.pending.push(item);
    });
    unbound.ids = [];
    unbound.pending = [];
    unbound.status = 'idle';
  }
  account.pending.sort((a, b) => a.sequence - b.sequence);
  account.ids = account.pending.reduce((ids, item) => apply(ids, item.id, item.active), account.ids);
  state.activeOwner = owner;
  return account;
}

function save(state) { wx.setStorageSync(KEY, state); }

function isFavorite(favorites, id) {
  return favorites.some(value => String(value) === String(id));
}

function apply(ids, id, active) {
  const rest = ids.filter(value => String(value) !== String(id));
  return active ? [String(id), ...rest] : rest;
}

function isMock() {
  const app = typeof getApp === 'function' ? getApp() : null;
  return Boolean(app && app.globalData && app.globalData.useLocalMock);
}

function canSyncInBackground() {
  return Boolean(wx.getStorageSync('authOpenId') || wx.getStorageSync('authToken') || isMock());
}

function snapshot() {
  const state = readState();
  const account = accountFor(state, currentOwner(state));
  return {
    ids: account.ids.slice(),
    pending: account.pending.length,
    status: isMock() && account.status !== 'error' ? 'mock' : account.status,
    error: account.error,
  };
}

function notify() {
  const value = snapshot();
  listeners.forEach(listener => { try { listener(value); } catch (error) { console.error(error); } });
}

function subscribeFavorites(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function setFavorite(id, active) {
  const projectId = String(id == null ? '' : id);
  if (!projectId) return false;
  const state = readState();
  const account = accountFor(state, currentOwner(state));
  const previous = isFavorite(account.ids, projectId);
  account.ids = apply(account.ids, projectId, active);
  state.sequence = (Number(state.sequence) || 0) + 1;
  account.pending = account.pending.filter(item => item.id !== projectId);
  account.pending.push({ id: projectId, active, sequence: state.sequence });
  account.status = 'pending';
  account.error = '';
  try { save(state); } catch (error) {
    if (typeof wx.showToast === 'function') wx.showToast({ title: '本机保存失败，请检查存储空间', icon: 'none' });
    return previous;
  }
  notify();
  if (typeof wx.showToast === 'function') wx.showToast({ title: isMock() ? (active ? '已收藏（本地测试）' : '已取消收藏') : '正在同步收藏', icon: 'none' });
  syncFavorites().catch(() => {
    if (typeof wx.showToast === 'function') wx.showToast({ title: '收藏未同步，请在我的收藏重试', icon: 'none' });
  });
  return active;
}

function toggleFavorite(id) {
  return setFavorite(id, !isFavorite(snapshot().ids, id));
}

async function fetchAllFavorites() {
  let page = 1;
  let owner = '';
  const ids = [];
  while (true) {
    const result = await api.getFavorites({ page, limit: 100 }, owner);
    const actualOwner = result && result.owner;
    const current = authenticatedOwner();
    if (!actualOwner || actualOwner !== current || (owner && owner !== actualOwner)) throw new Error('微信账号已变化，请重新同步收藏');
    owner = actualOwner;
    if (!result || !Array.isArray(result.docs) || Number(result.page) !== page || typeof result.hasNextPage !== 'boolean') {
      throw new Error('收藏数据暂时无法读取');
    }
    result.docs.forEach(row => {
      if (row && (typeof row.projectId === 'string' || typeof row.projectId === 'number') && !isFavorite(ids, row.projectId)) ids.push(String(row.projectId));
    });
    if (!result.hasNextPage) break;
    page++;
  }
  return { owner, ids };
}

async function performSync() {
  let state = readState();
  let account = accountFor(state, currentOwner(state));
  account.status = 'syncing';
  account.error = '';
  save(state);
  notify();
  let owner = currentOwner(state);
  try {
    const remote = await fetchAllFavorites();
    owner = remote.owner;
    state = readState();
    account = activateAccount(state, owner);
    account.ids = account.pending.reduce((ids, item) => apply(ids, item.id, item.active), remote.ids);
    account.status = 'syncing';
    save(state);
    notify();

    const attempted = new Set();
    let firstError = null;
    while (true) {
      state = readState();
      account = accountFor(state, owner);
      const item = account.pending.find(operation => !attempted.has(operation.sequence));
      if (!item) break;
      attempted.add(item.sequence);
      try {
        await api.setFavorite(item.id, item.active, owner);
        state = readState();
        account = accountFor(state, owner);
        account.pending = account.pending.filter(operation => operation.sequence !== item.sequence);
        save(state);
        notify();
      } catch (error) {
        if (!firstError) firstError = error;
      }
    }
    state = readState();
    account = accountFor(state, owner);
    if (account.pending.length) {
      const error = firstError || new Error('收藏尚未同步');
      account.status = 'error';
      account.error = error.statusCode === 404 ? '部分房源已不可用，请移除后重试' : '收藏未同步，请检查网络后重试';
      save(state);
      notify();
      throw error;
    }
    account.status = 'synced';
    account.error = '';
    save(state);
    notify();
    return snapshot();
  } catch (error) {
    state = readState();
    const resolvedOwner = authenticatedOwner();
    const switched = Boolean(owner && resolvedOwner && owner !== resolvedOwner);
    if (switched) {
      const previous = accountFor(state, owner);
      previous.status = 'error';
      previous.error = '微信账号已变化，请重新同步收藏';
      owner = resolvedOwner;
    }
    if (!owner && resolvedOwner) owner = resolvedOwner;
    account = owner ? activateAccount(state, owner) : accountFor(state, owner);
    account.status = 'error';
    if (switched) account.error = '微信账号已变化，请重新同步收藏';
    else if (!account.error) account.error = '收藏未同步，请检查网络后重试';
    save(state);
    notify();
    throw error;
  }
}

function syncFavorites() {
  if (!syncing) syncing = performSync().finally(() => { syncing = null; });
  return syncing;
}

module.exports = { canSyncInBackground, isFavorite, setFavorite, snapshot, subscribeFavorites, syncFavorites, toggleFavorite };
