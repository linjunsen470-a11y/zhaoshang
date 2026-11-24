import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
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

test('company footers link each approved filing number and include the police badge', () => {
  const config = loadMiniProgramModule(path.resolve('mp/config/index.js'));
  const checkFooter = html => {
    const footer = html.match(/<footer\b[^>]*>[\s\S]*?<\/footer>/)?.[0] || '';
    assert.doesNotMatch(footer, /tel:|173\s*2225\s*1752/);
    assert.match(footer, /<a\b[^>]*href="https:\/\/beian\.miit\.gov\.cn\/"[^>]*>粤ICP备2026186178号<\/a>/);
    assert.match(footer, /<a\b[^>]*href="https:\/\/beian\.mps\.gov\.cn\/#\/query\/webSearch\?code=44011802001719"[^>]*>\s*<(?:Image|img)\b[^>]*alt=""[^>]*>\s*<span>粤公网安备44011802001719号<\/span>\s*<\/a>/);
  };
  const home = readFileSync('backend/app/(frontend)/page.tsx', 'utf8');
  checkFooter(home);
  for (const name of ['index', 'about', 'services', 'contact', 'guide', 'privacy']) {
    const html = readFileSync(`website/${name}.html`, 'utf8');
    assert.match(html, /广州锦奕咨询服务有限公司/);
    if (name === 'contact') assert.ok(html.includes(`tel:${config.ADVISOR_PHONE}`));
    checkFooter(html);
  }
});

test('each company page includes the current shared stylesheet', () => {
  const normalize = text => text.replace(/\r\n/g, '\n');
  const css = normalize(readFileSync('website/css/style.css', 'utf8')).trimEnd();
  for (const name of ['index', 'about', 'services', 'contact', 'guide', 'privacy']) {
    const html = normalize(readFileSync(`website/${name}.html`, 'utf8'));
    const styles = [...html.matchAll(/<style data-source="css\/style\.css">\n([\s\S]*?)\n  <\/style>/g)];
    assert.equal(styles.length, 1, `${name}: expected one inline stylesheet`);
    assert.equal(styles[0][1], css, `${name}: inline stylesheet is out of date`);
    assert.doesNotMatch(html, /<link\b[^>]*\brel=["']stylesheet["']/i);
  }
});
