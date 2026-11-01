import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
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

test('the website never publishes an invented ICP number and shows a real one when supplied', () => {
  const script = readFileSync('website/js/main.js', 'utf8');
  const config = loadMiniProgramModule(path.resolve('mp/config/index.js'));
  const renderIcp = code => {
    const container = { children: [], appendChild(child) { this.children.push(child); } };
    const document = {
      addEventListener(event, callback) { if (event === 'DOMContentLoaded') callback(); },
      querySelector() { return null; },
      getElementById(id) { return id === 'site-icp' ? container : null; },
      createElement() { return {}; }
    };
    vm.runInNewContext(code, { document, Date });
    return container.children;
  };
  const withIcp = number => script.replace(/const SITE_ICP_NUMBER = '[^']*';/, `const SITE_ICP_NUMBER = '${number}';`);
  assert.deepEqual(renderIcp(withIcp('')), []);
  const links = renderIcp(withIcp('粤ICP备12345678号-1'));
  assert.equal(links[0].textContent, '粤ICP备12345678号-1');
  assert.equal(links[0].href, 'https://beian.miit.gov.cn/');
  for (const name of ['index', 'about', 'services', 'contact']) {
    const html = readFileSync(`website/${name}.html`, 'utf8');
    assert.match(html, /广州锦奕咨询服务有限公司/);
    assert.ok(html.includes(`tel:${config.ADVISOR_PHONE}`));
    assert.doesNotMatch(html, /粤ICP备X|已依法依规通过工业和信息化部ICP备案审查/);
  }
});

test('each company page includes the current shared stylesheet', () => {
  const normalize = text => text.replace(/\r\n/g, '\n');
  const css = normalize(readFileSync('website/css/style.css', 'utf8')).trimEnd();
  for (const name of ['index', 'about', 'services', 'contact']) {
    const html = normalize(readFileSync(`website/${name}.html`, 'utf8'));
    const styles = [...html.matchAll(/<style data-source="css\/style\.css">\n([\s\S]*?)\n  <\/style>/g)];
    assert.equal(styles.length, 1, `${name}: expected one inline stylesheet`);
    assert.equal(styles[0][1], css, `${name}: inline stylesheet is out of date`);
    assert.doesNotMatch(html, /<link\b[^>]*\brel=["']stylesheet["']/i);
  }
});
