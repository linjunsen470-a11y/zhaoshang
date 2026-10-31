import test from 'node:test';
import assert from 'node:assert/strict';
import { apiUrl, startE2E, stopE2E, waitForData, waitForPage, waitUntil, withTimeout, failureScreenshot } from './e2e/harness.mjs';

test('commercial scenes, pagination, retry, login refresh and local demo journey', { timeout: 300_000 }, async () => {
  let context;
  let backup;
  try {
    context = await startE2E();
    const mp = context.miniProgram;
    const open = async route => {
      await withTimeout(mp.reLaunch(route), `navigation timed out: ${route}`, 20_000);
      return waitForPage(mp, route.replace(/^\//, '').split('?')[0]);
    };
    const loaded = async page => {
      await waitForData(page, 'loading', v => v === false, 20_000);
      assert.equal(await page.data('loadError'), false);
      return page;
    };
    let home, list;
    if (process.env.COMMERCIAL_E2E_LOCAL_ONLY !== 'true') {
    home = await waitForPage(mp, 'pages/index/index');
    assert.deepEqual((await home.data('categories')).map(s => s.id), ['campus', 'workplace']);
    assert.ok((await home.data('recommendedList')).length <= 6);
    assert.ok((await home.data('latestList')).length <= 4);

    for (const scene of ['campus', 'industrial_park', 'office']) {
      const list = await loaded(await open(`/pages/list/list?businessScene=${scene}&listingKind=project`));
      const projects = await list.data('projectList');
      assert.ok(projects.length, scene);
      assert.ok(projects.every(p => p.businessScene === scene && p.listingKind === 'project'));
      assert.equal((await list.data('filterTabs')).some(t => t.key === 'projectType'), scene === 'campus');
      const detail = await loaded(await open(`/pages/detail/detail?id=${projects[0].id}`));
      const share = await detail.callMethod('onShareAppMessage');
      assert.equal(share.path, `/pages/detail/detail?id=${projects[0].id}`);
      const apply = await open(`/pages/apply/apply?projectId=${projects[0].id}`);
      await waitForData(apply, 'projectTitle', Boolean);
      assert.equal(await apply.data('businessScene'), scene);
      assert.ok(await apply.$('#field-phone'));
      assert.equal(await apply.$('radio-group'), null);
      console.log(`[commercial] ${scene}: list/detail/share/consultation form passed`);
    }

    const latest = await (await fetch(`${apiUrl}/projects?q=-paged-&sort=latest&limit=1`)).json();
    const prefix = latest.docs[0].title.split('-paged-')[0];
    list = await loaded(await open(`/pages/list/list?q=${prefix}-paged`));
    for (let page = 2; page <= 6; page++) {
      await list.callMethod('onReachBottom');
      await waitForData(list, 'page', v => v === page);
    }
    assert.equal((await list.data('projectList')).length, 105);
    assert.equal(await list.data('hasNextPage'), false);
    await list.callMethod('onPullDownRefresh');
    await waitForData(list, 'page', v => v === 1);
    assert.equal((await list.data('projectList')).length, 20);

    await mp.evaluate(() => { wx.setStorageSync('authToken', 'expired.invalid'); wx.setStorageSync('authTokenExpiresAt', Date.now() + 3600000); });
    await open('/pages/leads/leads');
    await waitUntil(async () => (await mp.evaluate(() => wx.getStorageSync('authToken'))) !== 'expired.invalid', '401 did not refresh authentication', 20_000);
    console.log('[commercial] 105 records, pull refresh and 401 authentication refresh passed');

    await mp.evaluate(() => { getApp().globalData.apiUrl = 'http://127.0.0.1:1/api'; });
    home = await open('/pages/index/index');
    await waitForData(home, 'loadError', v => v === true, 20_000);
    await mp.evaluate(url => { getApp().globalData.apiUrl = url; }, apiUrl);
    await home.callMethod('onRetryLoad');
    await loaded(home);

    }
    backup = await mp.evaluate(() => Object.fromEntries(['local_projects', 'local_leads'].map(key => [key, wx.getStorageSync(key)])));
    await mp.evaluate(() => { getApp().globalData.useLocalMock = true; wx.removeStorageSync('local_projects'); wx.removeStorageSync('local_leads'); });
    home = await loaded(await open('/pages/index/index'));
    for (const scene of ['campus', 'industrial_park', 'office']) {
      console.log(`[commercial] local ${scene}: opening`);
      list = await loaded(await open(`/pages/list/list?businessScene=${scene}`));
      const items = await list.data('projectList');
      assert.ok(items.length, `local ${scene} demo missing`);
      console.log(`[commercial] local ${scene}: list loaded`);
      const apply = await open(`/pages/apply/apply?projectId=${items[0].id}`);
      await waitForData(apply, 'projectTitle', Boolean);
      await apply.setData({ name: '演示验收', phone: '13812345678', businessType: '咖啡', budgetRange: '5-10万', privacyAccepted: true });
      await withTimeout(apply.callMethod('onSubmitForm'), `local ${scene} submit RPC timed out`, 12_000);
      await waitUntil(async () => (await mp.evaluate(() => wx.getStorageSync('local_leads') || [])).some(l => l.businessScene === scene), `local ${scene} consultation was not saved`);
      await waitForPage(mp, 'pages/success/success');
      console.log(`[commercial] local ${scene}: consultation saved`);
    }
    const detail = await loaded(await open('/pages/detail/detail?id=demo-park'));
    await waitForData(detail, 'units', rows => rows.length === 1);
    await mp.evaluate(() => { setTimeout(() => getCurrentPages()[getCurrentPages().length - 1].onRelatedProject({ currentTarget: { dataset: { id: 'demo-park-unit' } } }), 100); });
    await waitUntil(async () => (await (await mp.currentPage()).data('project'))?.id === 'demo-park-unit', 'child detail navigation failed');
    assert.equal((await (await mp.currentPage()).data('project')).parentProject.id, 'demo-park');

    list = await loaded(await open('/pages/list/list?businessScene=office&area=200plus'));
    assert.equal((await list.data('projectList')).length, 0);
    assert.ok(await list.$('.empty-state'));
    await list.callMethod('onResetFilters');
    await loaded(list);
    assert.ok((await list.data('projectList')).length);
    await open('/pages/privacy/privacy');
    assert.equal(context.runtimeErrors.length, 0, 'unexpected mini-program runtime exceptions');
    console.log('[commercial] local three-scene consultations, children, empty state, retry and privacy page passed');
  } catch (error) {
    if (context?.miniProgram) await failureScreenshot(context.miniProgram, 'commercial-failure').catch(() => {});
    throw error;
  } finally {
    if (context?.miniProgram) {
      await context.miniProgram.evaluate(({ backup, apiUrl }) => {
        getApp().globalData.useLocalMock = false;
        getApp().globalData.apiUrl = apiUrl;
        if (backup) Object.entries(backup).forEach(([key, value]) => value ? wx.setStorageSync(key, value) : wx.removeStorageSync(key));
      }, { backup, apiUrl }).catch(() => {});
    }
    await stopE2E(context).catch(() => {});
  }
});
