import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { loadMiniProgramModule } from '../helpers/load-cjs.mjs';

test('mini-program company and contact surfaces use the same real business contact', () => {
  const config = loadMiniProgramModule(path.resolve('mp/config/index.js'));
  let privacy;
  loadMiniProgramModule(path.resolve('mp/pages/privacy/privacy.js'), {
    globals: { Page: definition => { privacy = definition; } }
  });
  assert.equal(config.COMPANY_NAME, '广州锦奕咨询服务有限公司');
  assert.match(config.ADVISOR_PHONE, /^1[3-9]\d{9}$/);
  assert.equal(privacy.data.companyName, config.COMPANY_NAME);
  assert.equal(privacy.data.contactPhone, config.ADVISOR_PHONE);
  if (config.MINIPROGRAM_ICP_NUMBER) assert.match(config.MINIPROGRAM_ICP_NUMBER, /X$/i);
  assert.ok(config.validateEnvironment('release', { apiUrl: '' }).error);
});

test('advisor contact uses the configured phone without assuming it is a WeChat account', () => {
  let app;
  let sheet;
  loadMiniProgramModule(path.resolve('mp/app.js'), {
    globals: { App: definition => { app = definition; }, wx: { showActionSheet: value => { sheet = value; } } }
  });
  app.callAdvisor();
  assert.equal(sheet.itemList[0], `呼叫顾问：${app.globalData.advisorPhone}`);
  assert.equal(sheet.itemList[1], '复制电话');
});

test('cancelling or failing a call preserves the clipboard until the user chooses to copy', () => {
  let app;
  let sheet;
  let call;
  let clipboard = '设备资料';
  const toasts = [];
  const wx = {
    showActionSheet: options => { sheet = options; },
    makePhoneCall: options => { call = options; },
    setClipboardData: options => { clipboard = options.data; },
    showToast: options => toasts.push(options.title)
  };
  loadMiniProgramModule(path.resolve('mp/app.js'), { globals: { App: value => { app = value; }, wx } });
  app.callAdvisor();
  sheet.success({ tapIndex: 0 });
  call.fail({ errMsg: 'makePhoneCall:fail cancel' });
  assert.equal(clipboard, '设备资料');
  assert.equal(toasts.length, 0);
  call.fail({ errMsg: 'makePhoneCall:fail' });
  assert.equal(clipboard, '设备资料');
  assert.equal(toasts.length, 1);
  sheet.success({ tapIndex: 1 });
  assert.equal(clipboard, app.globalData.advisorPhone);
});
