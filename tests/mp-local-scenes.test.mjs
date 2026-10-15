import test from 'node:test';
import assert from 'node:assert/strict';
import { apiUrl, startE2E, stopE2E, waitForData, waitForPage, waitUntil, withTimeout } from './e2e/harness.mjs';

// Keep each submission in its own DevTools session. Continuous navigation after
// submission is checked separately by mp-commercial.test.mjs and must not be
// inferred from these independent cases.
async function localSession(run) {
  const context = await startE2E();
  const mp = context.miniProgram;
  let backup;
  try {
    backup = await mp.evaluate(() => Object.fromEntries(['local_projects', 'local_leads'].map(key => [key, wx.getStorageSync(key)])));
    await mp.evaluate(() => { getApp().globalData.useLocalMock = true; wx.removeStorageSync('local_projects'); wx.removeStorageSync('local_leads'); });
    await run(mp);
    assert.equal(context.runtimeErrors.length, 0);
  } finally {
    await withTimeout(mp.evaluate(({ backup, apiUrl }) => {
      getApp().globalData.useLocalMock = false;
      getApp().globalData.apiUrl = apiUrl;
      if (backup) Object.entries(backup).forEach(([key, value]) => value ? wx.setStorageSync(key, value) : wx.removeStorageSync(key));
    }, { backup, apiUrl }), 'restore local test storage', 8_000).catch(() => {});
    await stopE2E(context);
  }
}

async function open(mp, route) {
  await withTimeout(mp.reLaunch(route), `local navigation ${route}`, 20_000);
  return waitForPage(mp, route.replace(/^\//, '').split('?')[0]);
}

for (const scene of ['campus', 'community', 'tourism', 'mall']) {
  test(`local ${scene} list and consultation submission`, { timeout: 120_000 }, () => localSession(async mp => {
    const list = await open(mp, `/pages/list/list?businessScene=${scene}`);
    await waitForData(list, 'loading', value => value === false);
    const items = await list.data('projectList');
    assert.ok(items.length, `demo ${scene} exists`);
    const apply = await open(mp, `/pages/apply/apply?projectId=${items[0].id}`);
    await waitForData(apply, 'projectTitle', Boolean);
    await apply.setData({ name: '演示验收', phone: '13812345678', businessType: '咖啡', budgetRange: '5-10万', privacyAccepted: true });
    await withTimeout(apply.callMethod('onSubmitForm'), 'submit local form', 12_000);
    await waitUntil(async () => (await mp.evaluate(() => wx.getStorageSync('local_leads') || [])).some(lead => lead.businessScene === scene), `${scene} saved lead`);
    await waitForPage(mp, 'pages/success/success');
  }));
}

test('local child navigation', { timeout: 120_000 }, () => localSession(async mp => {
  const detail = await open(mp, '/pages/detail/detail?id=demo-community');
  await waitForData(detail, 'loading', value => value === false);
  await waitForData(detail, 'units', rows => rows.length === 2);
  await mp.evaluate(() => { setTimeout(() => getCurrentPages()[getCurrentPages().length - 1].onRelatedProject({ currentTarget: { dataset: { id: 'demo-community-unit1' } } }), 100); });
  await waitUntil(async () => (await (await mp.currentPage()).data('project'))?.id === 'demo-community-unit1', 'child detail navigation');
  assert.equal((await (await mp.currentPage()).data('project')).parentProject.id, 'demo-community');
}));

test('local empty filter, reset and privacy', { timeout: 120_000 }, () => localSession(async mp => {
  const list = await open(mp, '/pages/list/list?businessScene=mall&area=200plus');
  await waitForData(list, 'loading', value => value === false);
  assert.equal((await list.data('projectList')).length, 0);
  assert.ok(await list.$('.empty-state'));
  await list.callMethod('onResetFilters');
  await waitForData(list, 'loading', value => value === false);
  assert.ok((await list.data('projectList')).length);
  await open(mp, '/pages/privacy/privacy');
}));
