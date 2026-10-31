import fs from 'node:fs';
import path from 'node:path';
import automator from 'miniprogram-automator';
import { withTimeout, readSystemInfo } from '../tests/e2e/harness.mjs';

// Read-only page capture against the local demo. Restore the user's storage.
const phase = process.argv.includes('--baseline') ? 'before' : 'after';
const out = path.resolve('test-results/visual-refresh', phase);
fs.mkdirSync(out, { recursive: true });
const timeout = (promise, label) => withTimeout(promise, `${label}: DevTools RPC timed out`, 20000);
console.log('Connecting to WeChat DevTools');
const mp = await timeout(automator.connect({ wsEndpoint: process.env.MP_E2E_WS_ENDPOINT || 'ws://127.0.0.1:9420' }), 'connect');
const errors = [];
mp.on('exception', error => errors.push(String(error)));
let backup;
const pages = ['index', 'list', 'detail', 'apply', 'transfer', 'equipment', 'renovation', 'my', 'leads', 'equipment-list', 'success', 'privacy'];
try {
  console.log('Reading local demo storage');
  backup = await timeout(mp.evaluate(() => ({
    mock: getApp().globalData.useLocalMock,
    storage: Object.fromEntries(['local_projects', 'local_leads', 'privacyConsentAccepted', 'userInfo', 'favorites'].map(key => [key, wx.getStorageSync(key)]))
  })), 'read storage');
  await timeout(mp.evaluate(() => { getApp().globalData.useLocalMock = true; return true; }), 'set demo mode');
  for (const name of pages) {
    console.log(`Opening ${name}`);
    const query = name === 'detail' ? '?id=demo-community' : '';
    const page = await timeout(mp.reLaunch(`/pages/${name}/${name}${query}`), `open ${name}`);
    for (let i = 0; i < 40 && await timeout(page.data('loading'), `read ${name}`) === true; i++) await new Promise(resolve => setTimeout(resolve, 150));
    await new Promise(resolve => setTimeout(resolve, 500));
    await timeout(mp.screenshot({ path: path.join(out, `${name}.png`) }), `capture ${name}`);
    console.log(`Captured ${phase}/${name}`);
  }
  fs.writeFileSync(path.join(out, 'runtime.json'), JSON.stringify({ capturedAt: new Date().toISOString(), system: await timeout(readSystemInfo(mp), 'system info'), pages, errors }, null, 2));
} catch (error) {
  fs.writeFileSync(path.join(out, 'failure.json'), JSON.stringify({ capturedAt: new Date().toISOString(), message: error.message, errors }, null, 2));
  throw error;
} finally {
  if (backup) await timeout(mp.evaluate(backup => {
    getApp().globalData.useLocalMock = backup.mock;
    Object.entries(backup.storage).forEach(([key, value]) => value ? wx.setStorageSync(key, value) : wx.removeStorageSync(key));
    return true;
  }, backup), 'restore storage').catch(() => {});
  await timeout(mp.reLaunch('/pages/index/index'), 'restore home').catch(() => {});
  mp.disconnect();
}
if (errors.length) throw new Error(errors.join('\n'));
