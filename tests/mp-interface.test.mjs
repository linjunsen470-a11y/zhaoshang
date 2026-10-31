import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import automator from 'miniprogram-automator';
import { waitForData, waitForPage, withTimeout, readSystemInfo } from './e2e/harness.mjs';

// One connection, no backend, and a backup before modifying local mock data.
// Multi-scene submission and editing remain in the existing scene/full suites.
test('interface filter staging and inline form validation', { timeout: 90000 }, async () => {
  let mp;
  for (let attempt = 0; attempt < 2; attempt++) {
    try { mp = await automator.connect({ wsEndpoint: process.env.MP_E2E_WS_ENDPOINT || 'ws://127.0.0.1:9420' }); break; }
    catch (error) { if (attempt) throw error; await new Promise(resolve => setTimeout(resolve, 1000)); }
  }
  const errors = [];
  mp.on('exception', error => errors.push(String(error)));
  let backup;
  const open = async route => {
    await withTimeout(mp.reLaunch(route), 'open ' + route, 15000);
    return waitForPage(mp, route.slice(1).split('?')[0]);
  };
  try {
    backup = await withTimeout(mp.evaluate(() => ({
      mock: getApp().globalData.useLocalMock,
      storage: Object.fromEntries(['local_projects','local_leads','local_media','favorites','userInfo','privacyConsentAccepted'].map(key => [key, wx.getStorageSync(key)]))
    })), 'backup local state', 10000);
    await mp.evaluate(() => {
      getApp().globalData.useLocalMock = true;
      ['local_projects','local_leads','favorites','userInfo','privacyConsentAccepted'].forEach(key => wx.removeStorageSync(key));
      return true;
    });
    const list = await open('/pages/list/list?businessScene=campus');
    await waitForData(list, 'loading', value => value === false);
    await list.callMethod('onTabTap', { currentTarget: { dataset: { tab: 'more' } } });
    await list.callMethod('onDraftOption', { currentTarget: { dataset: { key: 'business', value: '咖啡' } } });
    assert.equal((await list.data('filters')).business, '全部');
    await list.callMethod('closeDrawer');
    await list.callMethod('onTabTap', { currentTarget: { dataset: { tab: 'more' } } });
    assert.equal((await list.data('draftFilters')).business, '全部');
    await list.callMethod('onDraftOption', { currentTarget: { dataset: { key: 'business', value: '咖啡' } } });
    await list.callMethod('onApplyDraft');
    await waitForData(list, 'loading', value => value === false);
    assert.equal((await list.data('filters')).business, '咖啡');
    const projects = await list.data('projectList');
    assert.ok(projects.length && projects.every(item => item.suitableBusiness.includes('咖啡')));
    console.log('[interface] filter staging, cancel and apply passed');
    const apply = await open('/pages/apply/apply?projectId=' + projects[0].id);
    await waitForData(apply, 'projectTitle', Boolean);
    await apply.callMethod('onSubmitForm');
    assert.equal(await apply.data('focusField'), 'phone');
    assert.ok((await apply.data('fieldErrors')).phone);
    assert.ok(await apply.$('#field-phone .field-error'));
    await apply.setData({ name: '界面验收', phone: '12812345678', businessType: '咖啡', budgetRange: '5-10万', privacyAccepted: false });
    await apply.callMethod('onSubmitForm');
    assert.equal(await apply.data('focusField'), 'phone');
    await apply.setData({ phone: '13812345678' });
    await apply.callMethod('onSubmitForm');
    assert.equal(await apply.data('focusField'), 'privacy');
    assert.ok(await apply.$('#field-privacy'));
    await apply.setData({ privacyAccepted: true, submitting: true });
    await apply.callMethod('onSubmitForm');
    assert.equal((await mp.evaluate(() => wx.getStorageSync('local_leads') || [])).length, 0);
    console.log('[interface] inline errors, first-error location, privacy and duplicate-submit guard passed');
    assert.deepEqual(errors, []);
    const out = path.resolve(process.env.MP_E2E_ARTIFACT_DIR || 'test-results/visual-refresh/native-interface');
    fs.mkdirSync(out, { recursive: true });
    fs.writeFileSync(path.join(out, 'runtime.json'), JSON.stringify({ completedAt: new Date().toISOString(), system: await readSystemInfo(mp), errors }, null, 2));
  } finally {
    if (backup) await withTimeout(mp.evaluate(backup => {
      getApp().globalData.useLocalMock = backup.mock;
      Object.entries(backup.storage).forEach(([key,value]) => value ? wx.setStorageSync(key,value) : wx.removeStorageSync(key));
      return true;
    }, backup), 'restore local state', 10000).catch(() => {});
    mp.disconnect();
  }
});
