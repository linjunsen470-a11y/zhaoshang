import test from 'node:test';
import assert from 'node:assert/strict';
import automator from 'miniprogram-automator';
import { waitForData, waitForPage, withTimeout } from './e2e/harness.mjs';

test('contact form accepts a manual number and preserves it after declined authorization', { timeout: 60000 }, async () => {
  const mp = await withTimeout(automator.connect({ wsEndpoint: process.env.MP_E2E_WS_ENDPOINT || 'ws://127.0.0.1:9420' }), 'connect DevTools', 10000);
  try {
    await withTimeout(mp.reLaunch('/pages/apply/apply'), 'open contact form', 15000);
    const page = await waitForPage(mp, 'pages/apply/apply');
    const phone = await page.$('#input-phone');
    const authorize = await page.$('.phone-authorize-btn');
    assert.ok(phone);
    assert.ok(authorize);
    assert.ok(await page.$('#input-remark'), 'optional description is immediately visible');
    await phone.input('13912345678');
    await authorize.trigger('getphonenumber', { errMsg: 'getPhoneNumber:fail user deny' });
    await waitForData(page, 'phoneAuthorizing', value => value === false);
    assert.equal(await page.data('phone'), '13912345678');
  } finally {
    await withTimeout(mp.reLaunch('/pages/index/index'), 'restore home', 10000).catch(() => {});
    mp.disconnect();
  }
});
