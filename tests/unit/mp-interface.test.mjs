import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { createStorage, loadMiniProgramModule } from '../helpers/load-cjs.mjs';

test('develop uses the cloud API, retains mock data and leaves release configuration explicit', () => {
  let version = 'develop';
  const storage = createStorage({ local_projects: [{ id: 'keep-local' }] });
  const config = loadMiniProgramModule(path.resolve('mp/config/index.js'), { globals: { wx: { ...storage, getAccountInfoSync: () => ({ miniProgram: { envVersion: version } }) } } });
  assert.equal(config.refreshRuntimeConfig().USE_LOCAL_MOCK, false);
  assert.equal(config.API_URL, 'https://api.cqwushi.com/api');
  assert.equal(config.ALLOW_DEV_OPEN_ID, false);
  assert.equal(config.refreshRuntimeConfig().USE_LOCAL_MOCK, false);
  assert.equal(storage.getStorageSync('local_projects')[0].id, 'keep-local');
  version = 'release';
  assert.equal(config.refreshRuntimeConfig().ALLOW_DEV_OPEN_ID, false);
  assert.equal(config.CONFIG_ERROR.includes('服务地址未配置'), true);
});

test('my page uses the configured backend without exposing internal runtime controls', () => {
  const storage = createStorage();
  const app = { globalData: { userInfo: {}, useLocalMock: false } };
  let definition;
  loadMiniProgramModule(path.resolve('mp/pages/my/my.js'), { globals: { Page: value => { definition = value; }, getApp: () => app, wx: { ...storage, getAccountInfoSync: () => ({ miniProgram: { envVersion: 'develop' } }), showToast() {} } } });
  const page = { ...definition, data: structuredClone(definition.data), setData(patch) { Object.assign(this.data, patch); } };
  page.onShow();
  assert.equal(app.globalData.useLocalMock, false);
  assert.equal(page.onToggleDemoBackend, undefined);
});

function listPage() {
  let definition;
  const requests = [];
  const navigations = [];
  let apiError;
  loadMiniProgramModule(path.resolve('mp/pages/list/list.js'), {
    globals: { Page: value => { definition = value; }, console: { error() {} }, wx: { ...createStorage(), showToast() {}, navigateTo: options => navigations.push(options.url) } },
    stubs: { '../../services/api.js': { getProjectPage: async params => { requests.push(params); if (apiError) throw apiError; return { docs: [], page: 1, hasNextPage: false }; } } }
  });
  const page = { ...definition, data: structuredClone(definition.data), setData(patch) { Object.assign(this.data, patch); } };
  page.setFilters({});
  return { page, requests, navigations, failWith: error => { apiError = error; } };
}
const event = dataset => ({ currentTarget: { dataset } });

test('retired links fall back to current scenes and availability defaults respect favorites and explicit status', async () => {
  const { page, requests } = listPage();
  page.setFilters({ businessScene: 'mall' });
  assert.equal(page.data.scopeNotice, true);
  assert.equal(page.data.filters.businessScene, '全部');
  await page.loadProjects();
  assert.equal(requests.at(-1).available, 'true');
  page.setFilters({ favs: true });
  await page.loadProjects();
  assert.equal(requests.at(-1).available, undefined);
  page.setFilters({ status: 'full' });
  await page.loadProjects();
  assert.equal(requests.at(-1).status, 'full');
  assert.equal(requests.at(-1).available, undefined);
});

test('unavailable detail has a recovery state while request errors retain retry', async () => {
  let definition;
  let response = { status: 'online', businessScene: 'mall' };
  loadMiniProgramModule(path.resolve('mp/pages/detail/detail.js'), {
    globals: { Page: value => { definition = value; }, wx: { showToast() {} }, console: { error() {} } },
    stubs: { '../../services/api.js': { getProjectDetail: async () => { if (response instanceof Error) throw response; return response; } } }
  });
  const page = { ...definition, data: structuredClone(definition.data), setData(patch) { Object.assign(this.data, patch); } };
  page.loadDetail('retired');
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(page.data.unavailable, true);
  response = Object.assign(new Error('gone'), { statusCode: 404 });
  page.loadDetail('gone');
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(page.data.unavailable, true);
  assert.equal(page.data.loadError, false);
  response = new Error('network unavailable');
  page.loadDetail('retry');
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(page.data.unavailable, false);
  assert.equal(page.data.loadError, true);
});

test('detail gallery previews the selected available image and similar cards recover from missing covers', async () => {
  const storage = createStorage();
  const previews = [];
  const navigations = [];
  let definition;
  const project = {
    id: 'current', status: 'online', businessScene: 'campus', title: '测试房源',
    coverImage: '/cover.jpg', images: ['/first.jpg', '/second.jpg'],
    suitableBusiness: [], unsuitableBusiness: [], highlights: []
  };
  loadMiniProgramModule(path.resolve('mp/pages/detail/detail.js'), {
    globals: {
      Page: value => { definition = value; },
      wx: { ...storage, setNavigationBarTitle() {}, previewImage: options => previews.push(options), navigateTo: options => navigations.push(options.url) }
    },
    stubs: { '../../services/api.js': {
      getProjectDetail: async () => project,
      getProjectPage: async () => ({ docs: [project, { id: 2 }, { id: '3' }, { id: 4 }, { id: 5 }] })
    } }
  });
  const page = { ...definition, data: structuredClone(definition.data), setData(patch) { Object.assign(this.data, patch); } };
  page.data.projectId = 'current';
  page.loadDetail('current');
  await new Promise(resolve => setImmediate(resolve));

  assert.equal(page.data.similarProjects.map(item => item.id).join(','), '2,3,4');
  page.onSimilarCoverError(event({ id: '2' }));
  assert.equal(page.data.similarProjects[0].coverImageError, true);
  assert.equal(page.data.similarProjects[1].coverImageError, undefined);
  page.onRelatedProject(event({ id: 2 }));
  assert.equal(navigations[0], '/pages/detail/detail?id=2');

  page.onSwiperChange({ detail: { current: 1 } });
  assert.equal(page.data.currentImageIndex, 1);
  page.onPreviewImage(event({ src: '/second.jpg' }));
  assert.equal(previews[0].current, '/second.jpg');
  assert.equal(previews[0].urls.join(','), '/first.jpg,/second.jpg');
  page.onImageError(event({ index: 0 }));
  page.onPreviewImage(event({ src: '/second.jpg' }));
  assert.equal(previews[1].urls.join(','), '/second.jpg');
  page.onPreviewImage(event({ src: '/first.jpg' }));
  assert.equal(previews.length, 2);

  project.images = [];
  page.loadDetail('current');
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(page.data.project.images.join(','), '/cover.jpg');
  assert.equal(page.data.currentImageIndex, 0);
  assert.equal(page.data.imageErrors.length, 0);
});

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
  page.onQuickFilter(event({ key: 'businessScene', value: 'office' }));
  assert.equal(page.data.filters.projectType, '全部');
  assert.equal(page.data.filters.district, '天河');
  assert.equal(page.data.filterTabs.some(tab => tab.key === 'projectType'), false);
  page.onRemoveFilter(event({ key: 'district' }));
  assert.equal(requests.at(-1).district, '全部');
  assert.equal(requests.at(-1).businessScene, 'office');
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

test('precise scene filters select their containing group; group changes preserve primary filters and clear subtypes', () => {
  const { page } = listPage();
  page.setFilters({ businessScene: 'office', district: '天河', rent: 'under5000', q: '咖啡' });
  assert.equal(page.data.scopeNotice, false);
  assert.equal(page.data.filters.sceneGroup, 'workplace');
  assert.equal(page.data.filters.businessScene, 'office');
  page.onQuickFilter(event({ key: 'sceneGroup', value: 'campus' }));
  assert.equal(page.data.filters.businessScene, 'campus');
  assert.equal(page.data.filters.district, '天河');
  assert.equal(page.data.filters.rent, 'under5000');
  assert.equal(page.data.keyword, '咖啡');
  page.onQuickFilter(event({ key: 'sceneGroup', value: 'workplace' }));
  assert.equal(page.data.filters.businessScene, '全部');
  assert.equal(page.data.filters.projectType, '全部');
  page.onRemoveFilter(event({ key: 'sceneGroup' }));
  assert.equal(page.data.filters.sceneGroup, '全部');
  assert.equal(page.data.filters.businessScene, '全部');
});

test('list request failures retain retry and a successful empty result clears the error', async () => {
  const { page, requests, failWith } = listPage();
  failWith(new Error('network unavailable'));
  await page.loadProjects();
  assert.equal(page.data.loadError, true);
  assert.equal(page.data.loading, false);
  failWith(null);
  await page.onRetryLoad();
  assert.equal(page.data.loadError, false);
  assert.equal(page.data.projectList.length, 0);
  assert.equal(requests.length, 2);
});

test('workplace subtype stages, cancels and resets without losing the group; need routes preserve precise intent', () => {
  const { page, requests, navigations } = listPage();
  page.setFilters({ sceneGroup: 'workplace' });
  page.onSubmitNeed();
  assert.equal(navigations.at(-1), '/pages/apply/apply?sceneGroup=workplace');
  page.onTabTap(event({ tab: 'more' }));
  assert.ok(page.data.moreGroups.some(group => group.key === 'businessScene' && group.options.length === 3));
  page.onDraftOption(event({ key: 'businessScene', value: 'office' }));
  assert.equal(page.data.filters.businessScene, '全部');
  assert.equal(requests.length, 0);
  page.closeDrawer();
  page.onTabTap(event({ tab: 'more' }));
  assert.equal(page.data.draftFilters.businessScene, '全部');
  page.onDraftOption(event({ key: 'businessScene', value: 'office' }));
  page.onApplyDraft();
  assert.equal(requests.length, 1);
  assert.equal(requests[0].sceneGroup, 'workplace');
  assert.equal(requests[0].businessScene, 'office');
  page.onSubmitNeed();
  assert.equal(navigations.at(-1), '/pages/apply/apply?businessScene=office');
  page.onTabTap(event({ tab: 'more' }));
  page.onResetDraft();
  assert.equal(page.data.draftFilters.sceneGroup, 'workplace');
  assert.equal(page.data.draftFilters.businessScene, '全部');
  page.setFilters({ sceneGroup: 'campus' });
  page.onSubmitNeed();
  assert.equal(navigations.at(-1), '/pages/apply/apply?businessScene=campus');
});

test('home service sheet opens and closes and dispatches all three service routes', () => {
  let definition;
  const navigations = [];
  loadMiniProgramModule(path.resolve('mp/pages/index/index.js'), {
    globals: { Page: value => { definition = value; }, wx: { navigateTo: options => navigations.push(options.url) } },
    stubs: { '../../services/api.js': {}, '../../config.js': {} }
  });
  const page = { ...definition, data: structuredClone(definition.data), setData(patch) { Object.assign(this.data, patch); } };
  assert.deepEqual(page.data.categories.map(item => item.val), ['campus', 'workplace']);
  for (const [action, route] of [['transfer', 'transfer/transfer'], ['equipment', 'equipment-list/equipment-list'], ['renovation', 'renovation/renovation']]) {
    page.onOpenServices();
    assert.equal(page.data.showServices, true);
    page.onServiceTap(event({ action }));
    assert.equal(page.data.showServices, false);
    assert.equal(navigations.at(-1), '/pages/' + route);
  }
  page.onOpenServices(); page.onHide();
  assert.equal(page.data.showServices, false);
});

test('general workplace request leaves the scene unspecified and preserves an explicit scene', () => {
  let definition;
  loadMiniProgramModule(path.resolve('mp/pages/apply/apply.js'), {
    globals: { Page: value => { definition = value; }, getApp: () => ({}), wx: { ...createStorage(), setNavigationBarTitle() {} }, Behavior: value => value },
    stubs: { '../../services/api.js': {}, '../../utils/formBehavior.js': {} }
  });
  const page = { ...definition, data: structuredClone(definition.data), setData(patch) { Object.assign(this.data, patch); }, initCommonData() {} };
  page.onLoad({ sceneGroup: 'workplace' });
  assert.equal(page.data.businessScene, '');
  page.onLoad({ businessScene: 'office' });
  assert.equal(page.data.businessScene, 'office');
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
  assert.equal(page.data.fieldErrors.name, undefined);
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

test('photo provenance metadata is retained and real API photos are preserved', async () => {
  const commercial = loadMiniProgramModule(path.resolve('mp/utils/commercial.js'));
  assert.equal(commercial.decorate({ coverImage: '/images/demo/mall.jpg' }).isDemoImage, true);
  assert.equal(commercial.decorate({ coverImage: 'https://example.test/real.jpg' }).isDemoImage, false);
});
