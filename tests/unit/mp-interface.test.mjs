import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { createStorage, loadMiniProgramModule } from '../helpers/load-cjs.mjs';

function listPage() {
  let definition;
  const requests = [];
  loadMiniProgramModule(path.resolve('mp/pages/list/list.js'), {
    globals: { Page: value => { definition = value; }, wx: { ...createStorage(), showToast() {} } },
    stubs: { '../../services/api.js': { getProjectPage: async params => { requests.push(params); return { docs: [], page: 1, hasNextPage: false }; } } }
  });
  const page = { ...definition, data: structuredClone(definition.data), setData(patch) { Object.assign(this.data, patch); } };
  page.setFilters({});
  return { page, requests };
}
const event = dataset => ({ currentTarget: { dataset } });

test('more filters are staged, cancellation discards changes and confirmation requests once', async () => {
  const { page, requests } = listPage();
  page.onTabTap(event({ tab: 'more' }));
  page.onDraftOption(event({ key: 'business', value: '咖啡' }));
  assert.equal(page.data.filters.business, '全部');
  assert.equal(requests.length, 0);
  page.closeDrawer();
  page.onTabTap(event({ tab: 'more' }));
  assert.equal(page.data.draftFilters.business, '全部');
  page.onDraftOption(event({ key: 'business', value: '咖啡' }));
  page.onDraftOption(event({ key: 'status', value: 'coming' }));
  page.onApplyDraft();
  assert.equal(requests.length, 1);
  assert.equal(requests[0].business, '咖啡');
  assert.equal(requests[0].status, 'coming');
  assert.equal(page.data.activeTab, '');
  assert.ok(page.data.selectedChips.some(chip => chip.key === 'business'));
});

test('scene changes clear campus-only filters while preserving other filters and favorites scope', () => {
  const { page, requests } = listPage();
  page.setFilters({ projectType: '食堂档口', district: '天河', favs: true });
  assert.equal(page.data.filters.businessScene, 'campus');
  page.onQuickFilter(event({ key: 'businessScene', value: 'mall' }));
  assert.equal(page.data.filters.projectType, '全部');
  assert.equal(page.data.filters.district, '天河');
  assert.equal(page.data.filterTabs.some(tab => tab.key === 'projectType'), false);
  page.onRemoveFilter(event({ key: 'district' }));
  assert.equal(requests.at(-1).district, '全部');
  assert.equal(requests.at(-1).businessScene, 'mall');
  page.onResetFilters();
  assert.equal(page.data.isFavoritesOnly, true);
  assert.equal(page.data.hasFilters, false);
  assert.equal(requests.at(-1).ids, '');
});

test('resetting draft filters preserves primary filters and does not fetch until applied', () => {
  const { page, requests } = listPage();
  page.setFilters({ businessScene: 'campus', rent: 'under5000', business: '咖啡' });
  page.onTabTap(event({ tab: 'more' }));
  page.onResetDraft();
  assert.equal(page.data.draftFilters.rent, 'under5000');
  assert.equal(page.data.draftFilters.businessScene, 'campus');
  assert.equal(page.data.draftFilters.business, '全部');
  assert.equal(page.data.filters.business, '咖啡');
  assert.equal(requests.length, 0);
});

test('form validation reports all fields, locates the first visible error and blocks duplicate submission', () => {
  let behavior;
  const scrolls = [];
  loadMiniProgramModule(path.resolve('mp/utils/formBehavior.js'), {
    globals: { Behavior: value => { behavior = value; return value; }, wx: { ...createStorage(), pageScrollTo: options => scrolls.push(options), showToast() {} } },
    stubs: { '../services/api.js': {}, '../services/upload.js': {} }
  });
  const page = { ...behavior.methods, data: { ...structuredClone(behavior.data), requiredFields: [{ key: 'businessType', message: '请选择经营品类' }], businessType: '' }, setData(patch) { Object.assign(this.data, patch); } };
  assert.equal(page.validateCommonForm(), false);
  assert.equal(page.data.focusField, 'businessType');
  assert.equal(scrolls[0].selector, '#field-businessType');
  assert.ok(page.data.fieldErrors.name);
  assert.ok(page.data.fieldErrors.phone);
  assert.ok(page.data.fieldErrors.privacy);
  Object.assign(page.data, { businessType: '咖啡', name: '陈先生', phone: '13812345678', privacyAccepted: true });
  assert.equal(page.validateCommonForm(), true);
  Object.assign(page.data, { submitting: true });
  assert.equal(page.validateCommonForm(), false);
  Object.assign(page.data, { submitting: false, uploadingImages: true });
  assert.equal(page.validateCommonForm(), false);
  Object.assign(page.data, { uploadingImages: false, formLoadError: true });
  assert.equal(page.validateCommonForm(), false);
});

test('demonstration photography is labeled and real API photos are preserved', async () => {
  const commercial = loadMiniProgramModule(path.resolve('mp/utils/commercial.js'));
  assert.equal(commercial.decorate({ coverImage: '/images/demo/mall.jpg' }).isDemoImage, true);
  assert.equal(commercial.decorate({ coverImage: 'https://example.test/real.jpg' }).isDemoImage, false);
});

test('clearing the consultation form requires confirmation and keeps its project context', () => {
  let definition, modal;
  loadMiniProgramModule(path.resolve('mp/pages/apply/apply.js'), {
    globals: { Page: value => { definition = value; }, Behavior: value => value, wx: { ...createStorage(), showModal: options => { modal = options; }, showToast() {} } },
    stubs: { '../../services/api.js': {}, '../../utils/formBehavior.js': {} }
  });
  const page = { ...definition, data: { ...structuredClone(definition.data), name: '陈先生', projectId: 'project-1', projectTitle: '示例项目' }, setData(patch) { Object.assign(this.data, patch); } };
  page.onClearForm();
  assert.equal(page.data.name, '陈先生');
  modal.success({ confirm: false });
  assert.equal(page.data.name, '陈先生');
  modal.success({ confirm: true });
  assert.equal(page.data.name, '');
  assert.equal(page.data.projectId, 'project-1');
  assert.equal(page.data.projectTitle, '示例项目');
});
