const { toggleFavorite } = require('../../utils/favorites.js');
const api = require('../../services/api.js');
const config = require('../../config.js');
const { recentIds } = require('../../utils/recent.js');
const { safeDecode } = require('../../utils/navigation.js');
const { ALL, FILTERS, defaults, normalize, tabs, moreGroups } = require('../../utils/projectFilters.js');
Page({
  data: {
    filters: defaults(), filterTabs: [], primaryTabs: [], selectedChips: [],
    scenes: FILTERS.find(filter => filter.key === 'sceneGroup').options, kinds: FILTERS.find(filter => filter.key === 'listingKind').options,
    activeTab: '', activeOptions: [], activeValue: ALL, draftFilters: defaults(), moreGroups: [],
    keyword: '', isRecommendedOnly: false, isFavoritesOnly: false, isRecentOnly: false,
    draftCount: null, draftCounting: false,
    projectList: [], loading: true, loadError: false, loadingMore: false, moreError: false,
    page: 0, totalDocs: 0, hasNextPage: false, hasFilters: false, scopeNotice: false
  },
  onLoad(params) {
    if (typeof wx.showShareMenu === 'function') wx.showShareMenu({ menus: ['shareAppMessage', 'shareTimeline'] });
    this._useLocalMock = config.USE_LOCAL_MOCK;
    this.setFilters(params || {});
    this.loadProjects();
  },
  onShow() {
    const pending = wx.getStorageSync('pendingListFilter');
    if (pending) {
      this._useLocalMock = config.USE_LOCAL_MOCK;
      wx.removeStorageSync('pendingListFilter');
      this.setFilters(pending);
      wx.setNavigationBarTitle({ title: this.data.isRecentOnly ? '最近浏览' : (this.data.isFavoritesOnly ? '我的收藏' : '找饭堂与商铺') });
      this.loadProjects();
      return;
    }
    if (this._useLocalMock !== config.USE_LOCAL_MOCK) {
      this._useLocalMock = config.USE_LOCAL_MOCK;
      this.loadProjects();
      return;
    }
    if (this.data.isRecentOnly || this.data.isFavoritesOnly) { this.loadProjects(); return; }
    const favorites = wx.getStorageSync('favorites') || [];
    this.setData({ projectList: this.data.projectList.map(p => ({ ...p, isFav: favorites.includes(p.id) })).filter(p => !this.data.isFavoritesOnly || p.isFav) });
  },
  setFilters(params) {
    const incoming = { ...params };
    if (params.projectType && params.projectType !== ALL) { incoming.businessScene = 'campus'; incoming.sceneGroup = 'campus'; }
    const sceneOptions = FILTERS.find(filter => filter.key === 'businessScene').options;
    const scopeNotice = Boolean((params.businessScene && !sceneOptions.some(scene => scene.value === params.businessScene)) || (params.sceneGroup && !this.data.scenes.some(scene => scene.value === params.sceneGroup)));
    this.setData({ filters: normalize(incoming), scopeNotice, keyword: safeDecode(params.q || '', config.MAX_SEARCH_QUERY_LENGTH), isRecommendedOnly: Boolean(params.recommended), isFavoritesOnly: Boolean(params.favs), isRecentOnly: Boolean(params.recent), activeTab: '' });
    this.refreshTabs();
  },
  refreshTabs() {
    const filterTabs = tabs(this.data.filters);
    const moreCount = filterTabs.filter(f => ['listingKind', 'opportunityType', 'business', 'status', 'projectType', 'businessScene'].includes(f.key) && f.active).length;
    const selectedChips = filterTabs.filter(f => f.active && f.key !== 'sceneGroup');
    if (this.data.isRecommendedOnly) selectedChips.push({ key: 'recommended', label: '重点推荐' });
    this.setData({
      filterTabs,
      primaryTabs: ['district', 'rent', 'area'].map(key => filterTabs.find(f => f.key === key)).concat({ key: 'more', label: moreCount ? '更多 · ' + moreCount : '更多', active: moreCount > 0 }),
      selectedChips,
      hasFilters: filterTabs.some(f => f.active) || this.data.isRecommendedOnly || Boolean(this.data.keyword)
    });
  },
  loadProjects(callback, append = false) {
    if (append && (this.data.loadingMore || this.data.loading || !this.data.hasNextPage)) return;
    const requestId = (this._requestId || 0) + 1;
    this._requestId = requestId;
    const page = append ? this.data.page + 1 : 1;
    this.setData(append ? { loadingMore: true, moreError: false } : { loading: true, loadError: false, loadingMore: false, moreError: false });
    const params = { ...this.data.filters, public: true, q: this.data.keyword, page, limit: 20 };
    if (!this.data.isFavoritesOnly && !this.data.isRecentOnly && this.data.filters.status === ALL) params.available = 'true';
    if (this.data.isRecommendedOnly) params.recommended = 'true';
    if (this.data.isFavoritesOnly) params.ids = (wx.getStorageSync('favorites') || []).join(',');
    if (this.data.isRecentOnly) params.ids = recentIds().join(',');
    return api.getProjectPage(params).then(result => {
      if (requestId !== this._requestId) return;
      const favorites = wx.getStorageSync('favorites') || [];
      const items = result.docs.map(p => ({ ...p, isFav: favorites.includes(p.id) }));
      if (this.data.isRecentOnly) { const ids = recentIds(); items.sort((a, b) => ids.indexOf(String(a.id)) - ids.indexOf(String(b.id))); }
      const combined = append ? [...this.data.projectList, ...items] : items;
      this.setData({ projectList: combined.filter((p, i, arr) => arr.findIndex(other => other.id === p.id) === i), totalDocs: result.totalDocs, page: result.page, hasNextPage: result.hasNextPage, loading: false, loadingMore: false, loadError: false, moreError: false });
    }).catch(error => {
      if (requestId !== this._requestId) return;
      console.error(error);
      this.setData(append ? { loadingMore: false, moreError: true } : { loading: false, loadError: true });
    }).finally(() => { if (callback) callback(); });
  },
  onUnload() { this._requestId = (this._requestId || 0) + 1; this.closeDrawer(); },
  onHide() { this.closeDrawer(); },
  onPullDownRefresh() { return this.loadProjects(() => wx.stopPullDownRefresh()); },
  onReachBottom() { return this.loadProjects(null, true); },
  onLoadMore() { return this.loadProjects(null, true); },
  onRetryLoad() { return this.loadProjects(); },
  onClearKeyword() { this.setData({ keyword: '' }); this.refreshTabs(); this.loadProjects(); },
  onSearchInput(e) { this.setData({ keyword: safeDecode(e.detail.value, config.MAX_SEARCH_QUERY_LENGTH) }); },
  onSearch() { this.refreshTabs(); this.loadProjects(); },
  onQuickFilter(e) {
    const { key, value } = e.currentTarget.dataset;
    if (!['sceneGroup', 'businessScene', 'listingKind'].includes(key)) return;
    const next = { ...this.data.filters, [key]: value };
    if (key === 'sceneGroup') { next.businessScene = ALL; next.projectType = ALL; }
    if (key === 'businessScene') next.sceneGroup = ALL;
    this.setData({ filters: normalize(next), activeTab: '' });
    this.refreshTabs();
    this.loadProjects();
  },
  onTabTap(e) {
    const key = e.currentTarget.dataset.tab;
    if (this.data.activeTab === key) return this.closeDrawer();
    if (key === 'more') {
      const draftFilters = { ...this.data.filters };
      this.setData({ activeTab: key, draftFilters, moreGroups: moreGroups(draftFilters), draftCount: null });
      this.previewDraftCount();
      return;
    }
    const filter = FILTERS.find(f => f.key === key);
    if (filter) this.setData({ activeTab: key, activeOptions: filter.options, activeValue: this.data.filters[key] });
  },
  onSelectOption(e) {
    if (!['district', 'rent', 'area'].includes(this.data.activeTab)) return;
    this.setData({ filters: normalize({ ...this.data.filters, [this.data.activeTab]: e.currentTarget.dataset.val }), activeTab: '' });
    this.refreshTabs();
    this.loadProjects();
  },
  onDraftOption(e) {
    const { key, value } = e.currentTarget.dataset;
    if (!['listingKind', 'opportunityType', 'business', 'status', 'projectType', 'businessScene'].includes(key)) return;
    const draftFilters = normalize({ ...this.data.draftFilters, [key]: value });
    this.setData({ draftFilters, moreGroups: moreGroups(draftFilters) });
    this.previewDraftCount();
  },
  onResetDraft() {
    const draftFilters = { ...this.data.draftFilters };
    ['listingKind', 'opportunityType', 'business', 'status', 'projectType'].forEach(key => { draftFilters[key] = ALL; });
    if (draftFilters.sceneGroup === 'workplace') draftFilters.businessScene = ALL;
    this.setData({ draftFilters, moreGroups: moreGroups(draftFilters) });
    this.previewDraftCount();
  },
  onApplyDraft() {
    this.closeDrawer();
    this.setData({ filters: normalize(this.data.draftFilters), activeTab: '' });
    this.refreshTabs();
    this.loadProjects();
  },
  previewDraftCount() {
    clearTimeout(this._countTimer);
    const requestId = this._countRequestId = (this._countRequestId || 0) + 1;
    this.setData({ draftCounting: true });
    this._countTimer = setTimeout(() => {
      const params = { ...this.data.draftFilters, public: true, q: this.data.keyword, page: 1, limit: 1 };
      if (!this.data.isFavoritesOnly && !this.data.isRecentOnly && params.status === ALL) params.available = 'true';
      if (this.data.isFavoritesOnly) params.ids = (wx.getStorageSync('favorites') || []).join(',');
      if (this.data.isRecentOnly) params.ids = recentIds().join(',');
      if (this.data.isRecommendedOnly) params.recommended = 'true';
      api.getProjectPage(params).then(result => {
        if (requestId === this._countRequestId && this.data.activeTab === 'more') this.setData({ draftCount: result.totalDocs, draftCounting: false });
      }).catch(() => {
        if (requestId === this._countRequestId) this.setData({ draftCount: null, draftCounting: false });
      });
    }, 180);
  },
  closeDrawer() { clearTimeout(this._countTimer); this._countRequestId = (this._countRequestId || 0) + 1; this.setData({ activeTab: '' }); },
  noop() {},
  onRemoveFilter(e) {
    const key = e.currentTarget.dataset.key;
    if (key === 'recommended') this.setData({ isRecommendedOnly: false });
    else {
      const next = { ...this.data.filters, [key]: ALL };
      if (key === 'sceneGroup') { next.businessScene = ALL; next.projectType = ALL; }
      this.setData({ filters: normalize(next) });
    }
    this.refreshTabs();
    this.loadProjects();
  },
  onResetFilters() { this.setFilters({ favs: this.data.isFavoritesOnly, recent: this.data.isRecentOnly }); this.loadProjects(); },
  onBrowseAll() { this.setFilters({}); wx.setNavigationBarTitle({ title: '找饭堂与商铺' }); this.loadProjects(); },
  onBackToMy() { wx.switchTab({ url: '/pages/my/my' }); },
  onCoverError(e) {
    const index = this.data.projectList.findIndex(p => String(p.id) === String(e.currentTarget.dataset.id));
    if (index >= 0 && !this.data.projectList[index].coverImageError) this.setData({ ['projectList[' + index + '].coverImageError']: true });
  },
  onSubmitNeed() {
    const { sceneGroup, businessScene } = this.data.filters;
    const query = businessScene !== ALL ? '?businessScene=' + encodeURIComponent(businessScene) : sceneGroup === 'workplace' ? '?sceneGroup=workplace' : '';
    wx.navigateTo({ url: '/pages/apply/apply' + query });
  },
  onProjectDetail(e) { wx.navigateTo({ url: '/pages/detail/detail?id=' + encodeURIComponent(e.currentTarget.dataset.id) }); },
  onShareAppMessage() {
    return { title: '找饭堂与商铺 · 发现适合你的经营空间', path: '/pages/list/list' + this.shareQuery() };
  },
  onShareTimeline() { return { title: '饭堂与商铺 · 招租房源', query: this.shareQuery().slice(1) }; },
  shareQuery() {
    const filters = { ...this.data.filters, q: this.data.keyword };
    return '?' + Object.keys(filters).filter(key => filters[key] && filters[key] !== ALL).map(key => key + '=' + encodeURIComponent(filters[key])).join('&');
  },
  onToggleFavInList(e) {
    const id = e.currentTarget.dataset.id;
    const isFav = toggleFavorite(id);
    // Removing an item shifts server pagination; restart to avoid skipping the next item.
    if (this.data.isFavoritesOnly) return this.loadProjects();
    this.setData({ projectList: this.data.projectList.map(p => String(p.id) === String(id) ? { ...p, isFav } : p) });
  }
});
