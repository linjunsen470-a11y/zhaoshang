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
