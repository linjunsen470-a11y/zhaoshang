import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { loadMiniProgramModule, createStorage } from '../helpers/load-cjs.mjs';
const commercial = loadMiniProgramModule('mp/utils/commercial.js');
const plain = value => JSON.parse(JSON.stringify(value));

test('client options are identical to backend commercial options', () => {
  assert.deepEqual(plain(commercial.options), JSON.parse(fs.readFileSync('backend/collections/shared/commercialOptions.json', 'utf8')));
  assert.deepEqual(plain(commercial.options.scenes.map(scene => scene.value)), ['campus', 'industrial_park', 'office']);
});

test('retired scenes and their children are hidden, and available listings exclude full units', () => {
  const records = ['campus', 'industrial_park', 'office', 'community', 'tourism', 'mall'].map(businessScene => ({ id: businessScene, businessScene, status: 'online', listingKind: 'project' }));
  records.push({ id: 'child', businessScene: 'office', status: 'online', parentProject: 'mall' }, { id: 'full', businessScene: 'office', status: 'full' }, { id: 'outside', businessScene: 'campus', projectType: '校外临校铺位', status: 'online' });
  assert.deepEqual(plain(commercial.queryLocal(records, { available: true }).docs.map(row => row.id)).sort(), ['campus', 'industrial_park', 'office']);
  assert.equal(commercial.queryLocal(records, { ids: 'full' }).docs.length, 1, 'favorites can retain a full unit');
});

test('numeric boundary filters exclude unknowns and preserve exact boundary values', () => {
  const records = [49, 50, 99, 100, 200].map((area, i) => ({ id: String(i), status: 'online', businessScene: 'office', areaMin: area, areaMax: area, monthlyRentMin: area * 100, monthlyRentMax: area * 100 }));
  records.push({ id: 'unknown', status: 'online', businessScene: 'office', areaText: '50㎡', feeText: '5000元/月' });
  assert.deepEqual(plain(commercial.queryLocal(records, { area: '50to100' }).docs.map(p => p.areaMin)).sort(), [50, 99]);
  assert.equal(commercial.queryLocal(records, { rent: '5000to10000' }).docs.length, 2);
  assert.equal(commercial.queryLocal(records, {}).docs.length, 6);
  assert.equal(commercial.overlaps({ areaMin: 30, areaMax: 100 }, 'areaMin', 'areaMax', { min: 100, max: 200 }), true);
});
test('more than 100 records can be paged, searched and filtered before slicing', () => {
  const records = Array.from({ length: 125 }, (_, i) => ({ id: String(i), title: `项目${i}`, venueName: i === 124 ? '独特位置' : '', status: 'online', businessScene: 'office', sort: 125 - i, areaMin: i + 1, areaMax: i + 1 }));
  const last = commercial.queryLocal(records, { page: 7, limit: 20 });
  assert.equal(last.docs.length, 5);
  assert.equal(last.totalDocs, 125);
  assert.equal(last.hasNextPage, false);
  assert.equal(commercial.queryLocal(records, { q: '独特位置' }).docs[0].id, '124');
  assert.equal(commercial.queryLocal(records, { area: '100to200' }).totalDocs, 26);
  assert.equal(commercial.queryLocal(records, { ids: '' }).docs.length, 0);
});

test('browse groups filter mixed scenes before counting and pagination and intersect precise scenes', () => {
  const records = Array.from({ length: 75 }, (_, i) => ({ id: String(i), businessScene: ['campus', 'industrial_park', 'office'][i % 3], status: 'online', sort: i }));
  const last = commercial.queryLocal(records, { sceneGroup: 'workplace', page: 3, limit: 20 });
  assert.equal(last.totalDocs, 50);
  assert.equal(last.docs.length, 10);
  assert.equal(last.hasNextPage, false);
  assert.ok(last.docs.every(row => row.businessScene !== 'campus'));
  assert.ok(last.docs.every((row, i, rows) => i === 0 || rows[i - 1].sort > row.sort));
  const office = commercial.queryLocal(records, { sceneGroup: 'workplace', businessScene: 'office', page: 2, limit: 20 });
  assert.equal(office.totalDocs, 25);
  assert.equal(office.docs.length, 5);
  assert.equal(commercial.queryLocal(records, { sceneGroup: 'workplace', businessScene: 'campus' }).docs.length, 0);
  assert.equal(commercial.queryLocal(records, { sceneGroup: 'campus', }).totalDocs, 25);
  assert.throws(() => commercial.queryLocal(records, { sceneGroup: 'unknown' }), /sceneGroup/);
});
test('campus listings show the city and district instead of the school name', () => {
  const [row] = commercial.queryLocal([{
    id: '1', status: 'online', businessScene: 'campus', city: '广州', district: '白云',
    title: '广州白云学院食堂档口', schoolName: '广州白云学院', schoolAlias: '白云学院',
    addressText: '广州白云学院东门', customerInfo: '白云学院师生', showFullSchoolName: true,
  }], {}).docs;
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

test('public property copy removes internal labels while preserving source records and photo metadata', () => {
  const source = { id: '12', businessScene: 'office', status: 'online',
    title: '【演示】示例南山办公大厦 · 轻餐铺', venueName: '示例南山办公大厦',
    customerInfo: '样例房源，仅用于联调。客群与营业时段待核实。',
    operatingRequirements: '纯演示：适合轻餐；禁止明火。', cooperationMode: '合同期限 2年（纯演示）；其他条款待确认。',
    coverImage: 'https://example.test/api/payload/media/file/tencent-demo-space.jpg',
    parentProject: { id: 'parent', title: '【内审】示例南山办公大厦' },
  };
  const before = structuredClone(source);
  const view = commercial.decorate(source);
  assert.equal(view.title, '南山办公大厦 · 轻餐铺');
  assert.equal(view.venueName, '南山办公大厦');
  assert.equal(view.customerInfo, '客群与营业时段待核实。');
  assert.equal(view.operatingRequirements, '适合轻餐；禁止明火。');
  assert.equal(view.cooperationMode, '合同期限 2年；其他条款待确认。');
  assert.equal(view.parentProject.title, '南山办公大厦');
  assert.equal(view.isDemoImage, true);
  assert.deepEqual(source, before);
  assert.equal(commercial.decorate({ title: '材料测试仪器商铺' }).title, '材料测试仪器商铺');
});
test('cards omit a city or district already present in the title', () => {
  const rows = commercial.queryLocal([
    { id: 'campus', status: 'online', businessScene: 'campus', city: '广州', district: '增城', title: '广州增城某学校第一食堂', feeText: '3万元/年，另收 2% 管理费' },
    { id: 'community', status: 'online', businessScene: 'office', city: '广州', district: '天河', title: '【演示】社区一层 A01 铺', venueName: '演示社区' },
  ], {}).docs;
  const campus = rows.find(row => row.id === 'campus');
  const community = rows.find(row => row.id === 'community');
  assert.equal(campus.placeText, '');
  assert.equal(campus.priceText, '3万元/年，另收 2% 管理费');
  assert.equal(campus.priceLabel, '费用');
  assert.equal(community.placeText, '广州 · 天河');
  assert.equal(community.placeDetail, '广州 · 天河 · 社区');
});
test('hidden parents hide their children without changing child states', () => {
  const records = [{ id: 'parent', businessScene: 'office', listingKind: 'project', status: 'offline' }, { id: 'child', businessScene: 'office', status: 'online', parentProject: 'parent' }];
  assert.equal(commercial.queryLocal(records, {}).docs.length, 0);
  records[0].status = 'online';
  assert.equal(commercial.queryLocal(records, { parentProject: 'parent' }).docs.length, 1);
  assert.equal(records[1].status, 'online');
});
test('local lead updates cannot switch project or overwrite original snapshot', async () => {
  const storage = createStorage({ local_projects: [{ id: 'p1', title: '项目', status: 'online', businessScene: 'office' }], local_leads: [] });
  const api = loadMiniProgramModule('mp/services/api.js', {
    globals: { wx: storage, getApp: () => ({ globalData: { useLocalMock: true } }) },
    stubs: { '../config.js': {}, './auth.js': {} },
  });
  const created = await api.submitLead({ name: '测试', phone: '13812345678', projectId: 'p1' });
  await assert.rejects(() => api.updateLead(created.id, { businessScene: 'mall' }), error => error.statusCode === 400);
  const updated = await api.updateLead(created.id, { projectId: 'p2', businessScene: 'campus', customerSnapshot: { name: 'bad' } });
  assert.equal(updated.projectId, 'p1');
  assert.equal(updated.businessScene, 'office');
  assert.equal(updated.customerSnapshot.name, '测试');
});
