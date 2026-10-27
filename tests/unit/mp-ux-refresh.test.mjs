import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { createStorage, loadMiniProgramModule } from '../helpers/load-cjs.mjs';

const load = (file, options = {}) => loadMiniProgramModule(path.resolve('mp', file), options);

test('public property copy removes internal visual labels', () => {
  const { projectText } = load('utils/publicText.js');
  assert.equal(projectText('【演示】园区食堂'), '园区食堂');
  assert.equal(projectText('摄影示意 · 非项目实拍'), '');
  assert.equal(projectText('示例写字楼商铺'), '写字楼商铺');
});

test('rent display groups digits and fee breakdown retains every unrecognized condition', () => {
  const { decorate } = load('utils/commercial.js');
  const source = { monthlyRentMin: 7200, monthlyRentMax: 12000, feeText: '基础租金 7200—12000元/月；进场费 2万元；押金：押二付一；管理费、结算方式待确认' };
  const view = decorate(source);
  assert.equal(view.priceAmount, '7,200—12,000');
  assert.equal(view.priceUnit, '元/月');
  assert.equal(JSON.stringify(view.feeItems), JSON.stringify([{ label: '进场费', value: '2万元' }, { label: '押金', value: '押二付一' }]));
  assert.equal(view.feeRemainder, '管理费、结算方式待确认');
  assert.equal(source.feeText.includes('基础租金'), true);
  assert.equal(decorate({ feeText: '按营业额结算，另收管理费' }).feeRemainder, '按营业额结算，另收管理费');
});

test('favorites toggle mixed ID types once without vibrating the phone', () => {
  const storage = createStorage({ favorites: [42] });
  const toasts = [];
  const vibrations = [];
  const { toggleFavorite } = load('utils/favorites.js', { globals: { wx: { ...storage, showToast: value => toasts.push(value), vibrateShort: value => vibrations.push(value) } } });
  assert.equal(toggleFavorite('42'), false);
  assert.equal(storage.getStorageSync('favorites').length, 0);
  assert.equal(toggleFavorite('42'), true);
  assert.equal(storage.getStorageSync('favorites').length, 1);
  assert.equal(toasts.every(value => value.icon === 'none'), true);
  assert.equal(vibrations.length, 0);
});

test('recent history moves revisited IDs to the front, deduplicates and caps at twenty', () => {
  const storage = createStorage();
  const { rememberProject, recentIds } = load('utils/recent.js', { globals: { wx: storage } });
  for (let id = 1; id <= 25; id++) rememberProject(id);
  rememberProject(10);
  assert.equal(recentIds().length, 20);
  assert.equal(recentIds()[0], '10');
  assert.equal(recentIds()[1], '25');
  assert.equal(recentIds().filter(id => id === '10').length, 1);
  assert.equal(recentIds().includes('1'), false);
});

test('draft counts discard late results and recent browsing keeps its private scope', async () => {
  const storage = createStorage({ recent_projects: ['second', 'first'] });
  const timers = [];
  const requests = [];
  let definition;
  load('pages/list/list.js', {
    globals: { Page: value => { definition = value; }, wx: storage, setTimeout: callback => { timers.push(callback); return timers.length; }, clearTimeout() {} },
    stubs: { '../../services/api.js': { getProjectPage: params => new Promise(resolve => requests.push({ params, resolve })) } },
  });
  const page = { ...definition, data: structuredClone(definition.data), setData(patch) { Object.assign(this.data, patch); } };
  page.setFilters({ recent: true, sceneGroup: 'workplace' });
  assert.equal(page.data.selectedChips.some(chip => chip.key === 'sceneGroup'), false);
  page.onTabTap({ currentTarget: { dataset: { tab: 'more' } } });
  timers.shift()();
  page.onDraftOption({ currentTarget: { dataset: { key: 'business', value: '咖啡' } } });
  timers.shift()();
  requests[1].resolve({ totalDocs: 2 });
  await new Promise(resolve => setImmediate(resolve));
  requests[0].resolve({ totalDocs: 99 });
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(page.data.draftCount, 2);
  assert.equal(requests[1].params.ids, 'second,first');
  assert.equal(requests[1].params.available, undefined);
  assert.equal(page.onShareAppMessage().path.includes('recent'), false);
  page.closeDrawer();
});
