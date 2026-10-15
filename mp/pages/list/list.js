const api = require('../../services/api.js');
const config = require('../../config.js');
const { safeDecode } = require('../../utils/navigation.js');
const { ALL, FILTERS, defaults, normalize, tabs, moreGroups } = require('../../utils/projectFilters.js');
Page({
  data: {
    filters: defaults(), filterTabs: [], primaryTabs: [], selectedChips: [],
    scenes: FILTERS[0].options, kinds: FILTERS[1].options,
    activeTab: '', activeOptions: [], activeValue: ALL, draftFilters: defaults(), moreGroups: [],
    keyword: '', isRecommendedOnly: false, isFavoritesOnly: false,
    projectList: [], loading: true, loadError: false, loadingMore: false, moreError: false,
    page: 0, hasNextPage: false, hasFilters: false
  },
  onLoad(params) { this.setFilters(params || {}); this.loadProjects(); },
  onShow() {
    const pending = wx.getStorageSync('pendingListFilter');
    if (pending) {
      wx.removeStorageSync('pendingListFilter');
      this.setFilters(pending);
      wx.setNavigationBarTitle({ title: this.data.isFavoritesOnly ? '我的收藏' : '找商铺' });
      this.loadProjects();
      return;
    }
    const favorites = wx.getStorageSync('favorites') || [];
    this.setData({ projectList: this.data.projectList.map(p => ({ ...p, isFav: favorites.includes(p.id) })).filter(p => !this.data.isFavoritesOnly || p.isFav) });
  },
  setFilters(params) {
    const incoming = { ...params };
    if (params.projectType && params.projectType !== ALL) incoming.businessScene = 'campus';
    this.setData({ filters: normalize(incoming), keyword: safeDecode(params.q || '', config.MAX_SEARCH_QUERY_LENGTH), isRecommendedOnly: Boolean(params.recommended), isFavoritesOnly: Boolean(params.favs), activeTab: '' });
    this.refreshTabs();
  },
  refreshTabs() {
    const filterTabs = tabs(this.data.filters);
    const moreCount = filterTabs.filter(f => ['opportunityType', 'business', 'status', 'projectType'].includes(f.key) && f.active).length;
    const selectedChips = filterTabs.filter(f => f.active);
    if (this.data.isRecommendedOnly) selectedChips.push({ key: 'recommended', label: '重点推荐' });
    this.setData({
      filterTabs,
      primaryTabs: ['district', 'rent', 'area'].map(key => filterTabs.find(f => f.key === key)).concat({ key: 'more', label: moreCount ? '更多 · ' + moreCount : '更多', active: moreCount > 0 }),
      selectedChips,
      hasFilters: selectedChips.length > 0 || Boolean(this.data.keyword)
    });
  },
  loadProjects(callback, append = false) {
    if (append && (this.data.loadingMore || this.data.loading || !this.data.hasNextPage)) return;
    const requestId = (this._requestId || 0) + 1;
    this._requestId = requestId;
    const page = append ? this.data.page + 1 : 1;
    this.setData(append ? { loadingMore: true, moreError: false } : { loading: true, loadError: false, loadingMore: false, moreError: false });
    const params = { ...this.data.filters, public: true, q: this.data.keyword, page, limit: 20 };
    if (this.data.isRecommendedOnly) params.recommended = 'true';
    if (this.data.isFavoritesOnly) params.ids = (wx.getStorageSync('favorites') || []).join(',');
    return api.getProjectPage(params).then(result => {
      if (requestId !== this._requestId) return;
      const favorites = wx.getStorageSync('favorites') || [];
      const items = result.docs.map(p => ({ ...p, isFav: favorites.includes(p.id) }));
      const combined = append ? [...this.data.projectList, ...items] : items;
      this.setData({ projectList: combined.filter((p, i, arr) => arr.findIndex(other => other.id === p.id) === i), page: result.page, hasNextPage: result.hasNextPage, loading: false, loadingMore: false, loadError: false, moreError: false });
    }).catch(error => {
      if (requestId !== this._requestId) return;
      console.error(error);
      this.setData(append ? { loadingMore: false, moreError: true } : { loading: false, loadError: true });
    }).finally(() => { if (callback) callback(); });
  },
  onUnload() { this._requestId = (this._requestId || 0) + 1; },
  onPullDownRefresh() { return this.loadProjects(() => wx.stopPullDownRefresh()); },
  onReachBottom() { return this.loadProjects(null, true); },
  onLoadMore() { return this.loadProjects(null, true); },
  onRetryLoad() { return this.loadProjects(); },
  onClearKeyword() { this.setData({ keyword: '' }); this.refreshTabs(); this.loadProjects(); },
  onSearchInput(e) { this.setData({ keyword: safeDecode(e.detail.value, config.MAX_SEARCH_QUERY_LENGTH) }); },
  onSearch() { this.refreshTabs(); this.loadProjects(); },
  onQuickFilter(e) {
    const { key, value } = e.currentTarget.dataset;
    if (!['businessScene', 'listingKind'].includes(key)) return;
    this.setData({ filters: normalize({ ...this.data.filters, [key]: value }), activeTab: '' });
    this.refreshTabs();
    this.loadProjects();
  },
  onTabTap(e) {
    const key = e.currentTarget.dataset.tab;
    if (this.data.activeTab === key) return this.closeDrawer();
    if (key === 'more') {
      const draftFilters = { ...this.data.filters };
      this.setData({ activeTab: key, draftFilters, moreGroups: moreGroups(draftFilters) });
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
    if (!['opportunityType', 'business', 'status', 'projectType'].includes(key)) return;
    const draftFilters = normalize({ ...this.data.draftFilters, [key]: value });
    this.setData({ draftFilters, moreGroups: moreGroups(draftFilters) });
  },
  onResetDraft() {
    const draftFilters = { ...this.data.draftFilters };
    ['opportunityType', 'business', 'status', 'projectType'].forEach(key => { draftFilters[key] = ALL; });
    this.setData({ draftFilters, moreGroups: moreGroups(draftFilters) });
  },
  onApplyDraft() {
    this.setData({ filters: normalize(this.data.draftFilters), activeTab: '' });
    this.refreshTabs();
    this.loadProjects();
  },
  closeDrawer() { this.setData({ activeTab: '' }); },
  noop() {},
  onRemoveFilter(e) {
    const key = e.currentTarget.dataset.key;
    if (key === 'recommended') this.setData({ isRecommendedOnly: false });
    else this.setData({ filters: normalize({ ...this.data.filters, [key]: ALL }) });
    this.refreshTabs();
    this.loadProjects();
  },
  onResetFilters() { this.setFilters({ favs: this.data.isFavoritesOnly }); this.loadProjects(); },
  onBrowseAll() { this.setFilters({}); wx.setNavigationBarTitle({ title: '找商铺' }); this.loadProjects(); },
  onCoverError(e) {
    const index = this.data.projectList.findIndex(p => String(p.id) === String(e.currentTarget.dataset.id));
    if (index >= 0 && !this.data.projectList[index].coverImageError) this.setData({ ['projectList[' + index + '].coverImageError']: true });
  },
  onSubmitNeed() { wx.navigateTo({ url: '/pages/apply/apply' }); },
  onProjectDetail(e) { wx.navigateTo({ url: '/pages/detail/detail?id=' + encodeURIComponent(e.currentTarget.dataset.id) }); },
  onToggleFavInList(e) {
    const id = e.currentTarget.dataset.id;
    let favs = wx.getStorageSync('favorites') || [];
    const isFav = favs.includes(id);
    favs = isFav ? favs.filter(x => x !== id) : favs.concat(id);
    wx.setStorageSync('favorites', favs);
    wx.showToast({ title: isFav ? '已取消收藏' : '收藏成功', icon: 'none' });
    this.setData({ projectList: this.data.projectList.map(p => p.id === id ? { ...p, isFav: !isFav } : p).filter(p => !this.data.isFavoritesOnly || p.isFav) });
  }
});
