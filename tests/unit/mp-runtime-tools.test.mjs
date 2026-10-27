import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readSystemInfo } from '../e2e/harness.mjs';

test('runtime diagnostics use split system APIs and never invoke deprecated probes', async () => {
  const wx = {
    getSystemInfoSync() { throw new Error('deprecated API invoked'); },
    getAppBaseInfo: () => ({ SDKVersion: '3.16.1' }),
    getDeviceInfo: () => ({ model: 'iPhone' }),
    getWindowInfo: () => ({ windowWidth: 390 }),
    getSystemSetting: () => ({ wifiEnabled: true }),
    getAppAuthorizeSetting: () => ({ cameraAuthorized: 'not determined' }),
  };
  const result = await readSystemInfo({ evaluate: fn => vm.runInNewContext(`(${fn.toString()})()`, { wx }) });
  assert.equal(result.windowWidth, 390);
  assert.equal(result.model, 'iPhone');
  assert.equal(result.appAuthorizeSetting.cameraAuthorized, 'not determined');
});
