import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import automator from 'miniprogram-automator';
import { waitForData, waitForPage, waitUntil, withTimeout } from './e2e/harness.mjs';

async function freshSession() {
  const port = String(process.env.MP_E2E_PORT || 9420);
  const cli = [process.env.MP_E2E_CLI_PATH, 'D:/Program Files (x86)/Tencent/wechat-dev/cli.bat', 'C:/Program Files (x86)/Tencent/微信web开发者工具/cli.bat'].filter(Boolean).find(filename => fs.existsSync(filename));
  if (!cli) throw new Error('WeChat DevTools CLI required for isolated UX sessions');
  const dir = path.dirname(cli);
  for (const action of ['close', 'auto']) {
    await promisify(execFile)(path.join(dir, 'node.exe'), [path.join(dir, 'cli.js'), action, '--project', path.resolve('mp'), ...(action === 'auto' ? ['--auto-port', port, '--trust-project'] : [])], { windowsHide: true, timeout: 60000 });
  }
  for (let attempt = 0; attempt < 8; attempt++) {
    try { return await automator.connect({ wsEndpoint: process.env.MP_E2E_WS_ENDPOINT || 'ws://127.0.0.1:' + port }); }
    catch (error) { if (attempt === 7) throw error; await new Promise(resolve => setTimeout(resolve, 1000)); }
  }
}

test('visual refresh supports discovery, favorites, history and consultation management', { timeout: 180000 }, async () => {
  const mp = await freshSession();
  const out = path.resolve('test-results/ux-review-20261025');
  fs.mkdirSync(out, { recursive: true });
  const errors = [];
  mp.on('exception', error => errors.push(String(error)));
  let backup;
  const call = (page, method, ...args) => withTimeout(page.callMethod(method, ...args), method, 12000);
  const open = async route => {
    console.log('[ux] open ' + route);
    const token = Date.now() + route;
    await withTimeout(mp.evaluate(function (payload) {
      setTimeout(function () { wx.reLaunch({ url: payload.route, success: function () { getApp().globalData.__uxNavigationToken = payload.token; } }); }, 100);
      return true;
    }, { route, token }), 'open ' + route, 10000);
    await waitUntil(async () => await mp.evaluate(function () { return getApp().globalData.__uxNavigationToken || ''; }) === token, 'route completed');
    const page = await waitForPage(mp, route.slice(1).split('?')[0]);
    await waitUntil(async () => await page.data('loading') !== true, 'page loaded');
    console.log('[ux] ready ' + page.path);
    return page;
  };
  const capture = async name => {
    if (process.env.MP_UX_SCREENSHOTS !== '1') return;
    console.log('[ux] capture ' + name);
    await new Promise(resolve => setTimeout(resolve, 300));
    await withTimeout(mp.screenshot({ path: path.join(out, name + '.png') }), 'capture ' + name, 10000);
  };
  try {
    backup = await mp.evaluate(() => ({
      global: JSON.parse(JSON.stringify(getApp().globalData)),
      storage: Object.fromEntries(wx.getStorageInfoSync().keys.map(key => [key, wx.getStorageSync(key)]))
    }));
    await mp.evaluate(() => {
      getApp().globalData.useLocalMock = true;
      ['local_projects', 'local_leads', 'favorites', 'recent_projects', 'pendingListFilter'].forEach(key => wx.removeStorageSync(key));
      return true;
    });
    const home = await open('/pages/index/index');
    assert.ok((await home.data('recommendedList')).length);
    await capture('home');
    await call(home, 'onOpenServices');
    await capture('services');
    await call(home, 'onCloseServices');
    const list = await open('/pages/list/list?sceneGroup=workplace');
    const projects = await list.data('projectList');
    assert.ok(projects.length);
    assert.equal((await list.data('selectedChips')).some(chip => chip.key === 'sceneGroup'), false);
    await capture('list');
    await call(list, 'onTabTap', { currentTarget: { dataset: { tab: 'more' } } });
    await waitForData(list, 'draftCounting', value => value === false);
    assert.equal(await list.data('draftCount'), projects.length);
    await capture('filters');
    await call(list, 'closeDrawer');
    const project = projects.find(item => item.priceAmount) || projects[0];
    const detail = await open('/pages/detail/detail?id=' + project.id);
    assert.equal(await detail.data('loadError'), false);
    assert.ok((await detail.data('anchors')).length);
    await waitForData(detail, 'similarLoading', value => value === false);
    assert.ok((await detail.data('similarProjects')).every(item => item.id !== project.id && item.businessScene === project.businessScene));
    await capture('detail');
    await call(detail, 'onToggleFavorite');
    assert.equal(await detail.data('isFavorited'), true);
    const recent = await open('/pages/list/list?recent=true');
    assert.equal((await recent.data('projectList'))[0].id, project.id);
    await capture('recent');
    const favorites = await open('/pages/list/list?favs=true');
    assert.equal((await favorites.data('projectList'))[0].id, project.id);
    const apply = await open('/pages/apply/apply?projectId=' + project.id);
    await waitForData(apply, 'projectTitle', Boolean);
    await capture('apply');
    // Keep form submission at the end of its own session: DevTools cannot
    // reliably reLaunch another page immediately after a submitted form.
    await mp.evaluate(function (project) {
      wx.setStorageSync('local_leads', [{ id: 'ux-record', leadType: 'leasing', status: 'new', name: '周先生', phone: '13812345678', businessType: '咖啡', budgetRange: '5-10万', businessScene: project.businessScene, projectId: project.id, projectTitle: project.title, createdAt: Date.now() }]);
      return true;
    }, project);
    const leads = await open('/pages/leads/leads');
    const records = await leads.data('leadsList');
    assert.equal(records.length, 1);
    assert.equal(records[0].expanded, false);
    await capture('leads');
    await call(leads, 'onToggleDetails', { currentTarget: { dataset: { id: records[0].id } } });
    assert.equal((await leads.data('leadsList'))[0].expanded, true);
    assert.ok(await leads.$('.lead-edit'));
    await capture('lead-expanded');
    const my = await open('/pages/my/my');
    await waitForData(my, 'leadCount', value => value === 1);
    assert.equal(await my.data('favoriteCount'), 1);
    assert.equal(await my.data('recentCount'), 1);
    await capture('my');
    await open('/pages/privacy/privacy');
    await capture('privacy');
    const managed = await open('/pages/leads/leads');
    console.log('[ux] delete consultation');
    await mp.mockWxMethod('showModal', { confirm: true, cancel: false });
    try {
      await call(managed, 'onDeleteLead', { currentTarget: { dataset: { id: records[0].id } } });
      await waitForData(managed, 'leadsList', rows => rows.length === 0);
    } finally { await mp.restoreWxMethod('showModal'); }
    await capture('leads-empty');
    await mp.evaluate(function (record) { wx.setStorageSync('local_leads', [record]); return true; }, records[0]);
    await call(managed, 'refreshLeads');
    await waitForData(managed, 'loading', value => value === false);
    console.log('[ux] edit consultation');
    await withTimeout(mp.evaluate(function (id) {
      setTimeout(function () { getCurrentPages()[getCurrentPages().length - 1].onEditLead({ currentTarget: { dataset: { id: id, type: 'leasing' } } }); }, 100);
      return true;
    }, records[0].id), 'open edit form', 10000);
    const edit = await waitForPage(mp, 'pages/apply/apply');
    await waitForData(edit, 'formLoading', value => value === false);
    assert.equal(await edit.data('isEditMode'), true);
    await edit.setData({ remark: '希望先了解营业时间', privacyAccepted: true });
    await call(edit, 'onSubmitForm');
    await waitUntil(async () => (await mp.evaluate(() => wx.getStorageSync('local_leads')))[0].remark === '希望先了解营业时间', 'consultation edited');
    console.log('[ux] edit persisted');
    assert.deepEqual(errors, []);
    fs.writeFileSync(path.join(out, 'runtime.json'), JSON.stringify({ completedAt: new Date().toISOString(), errors, checked: ['home', 'services', 'filters', 'detail', 'favorites', 'recent', 'edit', 'delete', 'leads', 'my', 'privacy'] }, null, 2));
  } finally {
    if (backup) await withTimeout(mp.evaluate(backup => {
      wx.getStorageInfoSync().keys.forEach(key => { if (!(key in backup.storage)) wx.removeStorageSync(key); });
      Object.entries(backup.storage).forEach(([key, value]) => wx.setStorageSync(key, value));
      delete getApp().globalData.__uxNavigationToken;
      Object.assign(getApp().globalData, backup.global);
      return true;
    }, backup), 'restore local state', 10000).catch(() => {});
    await withTimeout(mp.reLaunch('/pages/index/index'), 'restore home', 15000).catch(() => {});
    mp.disconnect();
  }
});

test('consultation submission reaches the success page in an isolated session', { timeout: 90000 }, async () => {
  const mp = await freshSession();
  let backup;
  try {
    backup = await mp.evaluate(() => ({
      global: JSON.parse(JSON.stringify(getApp().globalData)),
      storage: Object.fromEntries(wx.getStorageInfoSync().keys.map(key => [key, wx.getStorageSync(key)]))
    }));
    await mp.evaluate(() => { getApp().globalData.useLocalMock = true; wx.setStorageSync('local_leads', []); return true; });
    await withTimeout(mp.reLaunch('/pages/apply/apply'), 'open general need form', 15000);
    const apply = await waitForPage(mp, 'pages/apply/apply');
    await apply.setData({ name: '周先生', phone: '13812345678', businessType: '咖啡', budgetRange: '5-10万', privacyAccepted: true });
    await withTimeout(apply.callMethod('onSubmitForm'), 'submit consultation', 10000);
    await waitForPage(mp, 'pages/success/success');
    assert.equal((await mp.evaluate(() => wx.getStorageSync('local_leads'))).length, 1);
    if (process.env.MP_UX_SCREENSHOTS === '1') await withTimeout(mp.screenshot({ path: path.resolve('test-results/ux-review-20261025/success.png') }), 'capture success', 10000);
  } finally {
    if (backup) await withTimeout(mp.evaluate(backup => {
      wx.getStorageInfoSync().keys.forEach(key => { if (!(key in backup.storage)) wx.removeStorageSync(key); });
      Object.entries(backup.storage).forEach(([key, value]) => wx.setStorageSync(key, value));
      Object.assign(getApp().globalData, backup.global);
      return true;
    }, backup), 'restore submission state', 10000);
    mp.disconnect();
  }
});
