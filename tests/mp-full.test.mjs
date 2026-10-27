import test from 'node:test';
import assert from 'node:assert/strict';
import {
  changeRoute,
  failureScreenshot,
  startE2E,
  stopE2E,
  waitForData,
  waitForPage,
} from './e2e/harness.mjs';

test('mini-program browse and branch navigation regression', { timeout: 90_000 }, async () => {
  let context;
  try {
    context = await startE2E();
    const { miniProgram } = context;
    let home = await waitForPage(miniProgram, 'pages/index/index');

    const favorite = await home.$('.e2e-latest-favorite');
    assert.ok(favorite);
    const favoriteId = String((await home.data('latestList'))[0].id);
    await home.callMethod('onToggleFav', { currentTarget: { dataset: { id: favoriteId } } });
    const favorites = await miniProgram.evaluate(() => wx.getStorageSync('favorites') || []);
    assert.ok(favorites.includes(favoriteId), 'favorite tap must persist the project id');

    await (await home.$('.e2e-search-input')).input('华商');
    await home.callMethod('onSearch');
    if ((await miniProgram.currentPage()).path === 'pages/index/index') {
      await changeRoute(miniProgram, 'switchTab', '/pages/list/list');
    }
    let list = await waitForPage(miniProgram, 'pages/list/list');
    await waitForData(list, 'loading', value => value === false, 20_000);
    assert.equal(await list.data('keyword'), '华商');

    const branches = [
      ['transfer', 'pages/transfer/transfer', '.e2e-transfer-form'],
      ['equipment', 'pages/equipment-list/equipment-list', '.e2e-equipment-list'],
      ['renovation', 'pages/renovation/renovation', '.e2e-renovation-form'],
    ];
    for (const [action, expectedPath, selector] of branches) {
      await miniProgram.reLaunch('/pages/index/index');
      home = await waitForPage(miniProgram, 'pages/index/index');
      await waitForData(home, 'loading', value => value === false, 20_000);
      await home.callMethod('onOpenServices');
      const services = await home.$$('.e2e-service-entry');
      const serviceModels = await home.data('secondaryServices');
      const entry = services[serviceModels.findIndex(service => service.action === action)];
      assert.ok(entry, `missing ${action} service entry`);
      await entry.tap();
      const page = await waitForPage(miniProgram, expectedPath);
      assert.ok(await page.$(selector));
    }
    assert.equal(context.runtimeErrors.length, 0, 'mini-program emitted runtime exceptions');
  } catch (error) {
    if (context?.miniProgram) await failureScreenshot(context.miniProgram, 'browse-branches-failure').catch(() => {});
    throw error;
  } finally {
    await stopE2E(context).catch(() => {});
  }
});
