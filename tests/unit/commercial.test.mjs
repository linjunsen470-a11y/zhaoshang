import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { loadMiniProgramModule, createStorage } from '../helpers/load-cjs.mjs';
const commercial = loadMiniProgramModule('mp/utils/commercial.js');
const plain = value => JSON.parse(JSON.stringify(value));

test('client options are identical to backend commercial options', () => {
  assert.deepEqual(plain(commercial.options), JSON.parse(fs.readFileSync('backend/collections/shared/commercialOptions.json', 'utf8')));
});
test('numeric boundary filters exclude unknowns and preserve exact boundary values', () => {
  const records = [49, 50, 99, 100, 200].map((area, i) => ({ id: String(i), status: 'online', areaMin: area, areaMax: area, monthlyRentMin: area * 100, monthlyRentMax: area * 100 }));
  records.push({ id: 'unknown', status: 'online', areaText: '50㎡', feeText: '5000元/月' });
  assert.deepEqual(plain(commercial.queryLocal(records, { area: '50to100' }).map(p => p.areaMin)).sort(), [50, 99]);
  assert.equal(commercial.queryLocal(records, { rent: '5000to10000' }).length, 2);
  assert.equal(commercial.queryLocal(records, {}).length, 6);
  assert.equal(commercial.overlaps({ areaMin: 30, areaMax: 100 }, 'areaMin', 'areaMax', { min: 100, max: 200 }), true);
});
test('more than 100 records can be paged, searched and filtered before slicing', () => {
  const records = Array.from({ length: 125 }, (_, i) => ({ id: String(i), title: `项目${i}`, venueName: i === 124 ? '独特位置' : '', status: 'online', sort: 125 - i, areaMin: i + 1, areaMax: i + 1 }));
  const last = commercial.queryLocal(records, { pagination: 'true', page: 7, limit: 20 });
  assert.equal(last.docs.length, 5);
  assert.equal(last.totalDocs, 125);
  assert.equal(last.hasNextPage, false);
  assert.equal(commercial.queryLocal(records, { q: '独特位置' })[0].id, '124');
  assert.equal(commercial.queryLocal(records, { area: '100to200' }).length, 26);
  assert.equal(commercial.queryLocal(records, { ids: '' }).length, 0);
});
test('campus listings show the city and district instead of the school name', () => {
  const [row] = commercial.queryLocal([{
    id: '1', status: 'online', businessScene: 'campus', city: '广州', district: '白云',
    title: '广州白云学院食堂档口', schoolName: '广州白云学院', schoolAlias: '白云学院',
    addressText: '广州白云学院东门', customerInfo: '白云学院师生', showFullSchoolName: true,
  }], {});
  assert.equal(row.locationLabel, '广州白云某学校');
  assert.equal(row.schoolName, '');
  assert.equal(row.schoolAlias, '');
  assert.equal(row.title, '广州白云某学校食堂档口');
  assert.equal(row.addressText, '广州白云某学校东门');
  assert.equal(row.customerInfo, '广州白云某学校师生');
  assert.equal(row.placeText, '');
  assert.equal(row.placeDetail, '广州白云某学校');
  assert.equal(JSON.stringify(row).includes('白云学院'), false);
});
test('cards omit a city or district already present in the title', () => {
  const rows = commercial.queryLocal([
    { id: 'campus', status: 'online', businessScene: 'campus', city: '广州', district: '增城', title: '广州增城某学校第一食堂', feeText: '3万元/年，另收 2% 管理费' },
    { id: 'community', status: 'online', businessScene: 'community', city: '广州', district: '天河', title: '【演示】社区一层 A01 铺', venueName: '演示社区' },
  ], {});
  const campus = rows.find(row => row.id === 'campus');
  const community = rows.find(row => row.id === 'community');
  assert.equal(campus.placeText, '');
  assert.equal(campus.priceText, '3万元/年，另收 2% 管理费');
  assert.equal(campus.priceLabel, '费用');
  assert.equal(community.placeText, '广州 · 天河 · 演示社区');
  assert.equal(community.placeDetail, '广州 · 天河 · 演示社区');
});
test('hidden parents hide their children without changing child states', () => {
  const records = [{ id: 'parent', listingKind: 'project', status: 'offline' }, { id: 'child', status: 'online', parentProject: 'parent' }];
  assert.equal(commercial.queryLocal(records, {}).length, 0);
  records[0].status = 'online';
  assert.equal(commercial.queryLocal(records, { parentProject: 'parent' }).length, 1);
  assert.equal(records[1].status, 'online');
});
test('local lead updates cannot switch project or overwrite original snapshot', async () => {
  const storage = createStorage({ local_projects: [{ id: 'p1', title: '项目', status: 'online', businessScene: 'community' }], local_leads: [] });
  const api = loadMiniProgramModule('mp/services/api.js', {
    globals: { wx: storage, getApp: () => ({ globalData: { useLocalMock: true } }) },
    stubs: { '../config.js': {}, './auth.js': {} },
  });
  const created = await api.submitLead({ name: '测试', phone: '13812345678', projectId: 'p1' });
  const updated = await api.updateLead(created.id, { projectId: 'p2', businessScene: 'mall', customerSnapshot: { name: 'bad' } });
  assert.equal(updated.projectId, 'p1');
  assert.equal(updated.businessScene, 'community');
  assert.equal(updated.customerSnapshot.name, '测试');
});
