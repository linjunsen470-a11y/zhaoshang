import test from 'node:test';
import assert from 'node:assert/strict';
import automator from 'miniprogram-automator';
import { waitForData, waitForPage, withTimeout } from './e2e/harness.mjs';

test('native contact UI handles WeChat nickname, denied phone consent and authorized phone fill', { timeout: 60000 }, async () => {
  const mp = await withTimeout(automator.connect({ wsEndpoint: process.env.MP_E2E_WS_ENDPOINT || 'ws://127.0.0.1:9420' }), 'connect DevTools', 10000);
  let backup;
  let mockedRequest = false;
  try {
    backup = await mp.evaluate(() => ({
      global: JSON.parse(JSON.stringify(getApp().globalData)),
      storage: Object.fromEntries(wx.getStorageInfoSync().keys.map(key => [key, wx.getStorageSync(key)]))
    }));
    await mp.evaluate(() => {
      getApp().globalData.useLocalMock = true;
      getApp().globalData.apiUrl = 'https://contact-test.invalid/api';
      getApp().globalData.configError = '';
      wx.setStorageSync('userInfo', { nickname: '', phone: '' });
      wx.setStorageSync('authToken', 'native-test-token');
      wx.setStorageSync('authTokenExpiresAt', Date.now() + 86400000);
      return true;
    });
    await mp.mockWxMethod('request', { statusCode: 200, data: { phone: '13812345678', countryCode: '86' } });
    mockedRequest = true;
    await withTimeout(mp.reLaunch('/pages/apply/apply'), 'open contact form', 15000);
    const page = await waitForPage(mp, 'pages/apply/apply');
    const nickname = await page.$('#input-name');
    assert.ok(nickname);
    await nickname.input('微信昵称');
    const authorize = await page.$('.phone-authorize-btn');
    assert.ok(authorize);
    assert.equal(await page.$('#input-phone'), null);
    await authorize.trigger('getphonenumber', { errMsg: 'getPhoneNumber:fail user deny' });
    await waitForData(page, 'phoneAuthorizing', value => value === false);
    assert.equal(await page.data('phone'), '');
    await authorize.trigger('getphonenumber', { errMsg: 'getPhoneNumber:ok', code: 'native-test-phone-code' });
    await waitForData(page, 'phone', value => value === '13812345678');
    assert.equal(await page.data('name'), '微信昵称');
    assert.equal((await mp.evaluate(() => wx.getStorageSync('userInfo'))).phone, '13812345678');
    assert.ok((await (await page.$('.phone-value')).text()).includes('13812345678'));
  } finally {
    if (mockedRequest) await withTimeout(mp.restoreWxMethod('request'), 'restore requests', 5000);
    if (backup) await withTimeout(mp.evaluate(backup => {
      wx.getStorageInfoSync().keys.forEach(key => { if (!(key in backup.storage)) wx.removeStorageSync(key); });
      Object.entries(backup.storage).forEach(([key, value]) => wx.setStorageSync(key, value));
      Object.assign(getApp().globalData, backup.global);
      return true;
    }, backup), 'restore contact test state', 10000);
    mp.disconnect();
  }
});
