const { toggleFavorite, isFavorite } = require('../../utils/favorites.js');
const api = require('../../services/api.js');
const config = require('../../config.js');
const { isPublicProject } = require('../../utils/project.js');
const { options } = require('../../utils/commercial.js');

Page({
  data: {
    appName: config.APP_NAME,
    searchKeyword: '',
    secondaryServices: [
      { id: 'transfer', name: '委托转让', desc: '登记信息，协助联系意向方', icon: '/images/icons/transfer.png', action: 'transfer' },
      { id: 'equipment', name: '餐饮设备', desc: '求购、出售与回收登记', icon: '/images/icons/equipment.png', action: 'equipment' },
      { id: 'renovation', name: '商铺装修', desc: '登记需求，对接施工服务', icon: '/images/icons/renovation.png', action: 'renovation' }
    ],
    categories: options.browseGroups.map(group => ({ id: group.value, name: group.label, desc: group.description, type: 'sceneGroup', val: group.value })),
    showServices: false,
    recommendedList: [],
    latestList: [],
    loading: true,
    loadError: false
  },

  onLoad() {
    if (typeof wx.showShareMenu === 'function') wx.showShareMenu({ menus: ['shareAppMessage', 'shareTimeline'] });
    this._useLocalMock = config.USE_LOCAL_MOCK;
    this.loadData();
  },

  onShow() {
    if (this._useLocalMock !== config.USE_LOCAL_MOCK) {
      this._useLocalMock = config.USE_LOCAL_MOCK;
      this.loadData();
      return;
    }
    if (this.data.recommendedList.length > 0 || this.data.latestList.length > 0) {
      const favs = wx.getStorageSync('favorites') || [];
      this.setData({
        recommendedList: this.data.recommendedList.map(p => ({ ...p, isFav: isFavorite(favs, p.id) })),
        latestList: this.data.latestList.map(p => ({ ...p, isFav: isFavorite(favs, p.id) }))
      });
    }
  },

  onPullDownRefresh() {
    this.loadData(() => {
      wx.stopPullDownRefresh();
      wx.showToast({ title: '已刷新', icon: 'none', duration: 1200 });
    });
  },

  loadData(callback) {
    this.setData({ loading: true, loadError: false });

    let timer;
    const requestTimeout = new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error('请求超时，请稍后重试')), 16000);
    });

    Promise.race([Promise.all([
      api.getProjectPage({ public: true, available: 'true', recommended: 'true', page: 1, limit: 3 }),
      api.getProjectPage({ public: true, available: 'true', sort: 'latest', page: 1, limit: 6 })
    ]), requestTimeout])
      .then(([recommended, latest]) => {
        const favs = wx.getStorageSync('favorites') || [];
        const prepare = rows => rows.filter(p => isPublicProject(p) && p.status !== 'full').map(p => ({ ...p, isFav: isFavorite(favs, p.id) }));
        const recommendedList = prepare(recommended.docs);
        const recommendedIds = new Set(recommendedList.map(project => String(project.id)));
        this.setData({ recommendedList, latestList: prepare(latest.docs).filter(project => !recommendedIds.has(String(project.id))).slice(0, 4), loading: false, loadError: false });
        if (callback) callback();
      })
      .catch(err => {
        console.error('index.loadData failed:', err);
        this.setData({ loading: false, loadError: true });
        wx.showToast({
          title: '项目与铺位加载失败',
          icon: 'none',
          duration: 2000
        });
        if (callback) callback();
      }).finally(() => clearTimeout(timer));
  },

  onRetryLoad() {
    this.loadData();
  },

  onSearchInput(e) {
    this.setData({ searchKeyword: e.detail.value });
  },

  onSearch() {
    const q = this.data.searchKeyword.trim();
    wx.setStorageSync('pendingListFilter', { q });
    wx.switchTab({ url: '/pages/list/list' });
  },

  onServiceTap(e) {
    const action = e.currentTarget.dataset.action;
    this.onCloseServices();
    if (action === 'list') {
      wx.setStorageSync('pendingListFilter', {});
      wx.switchTab({ url: '/pages/list/list' });
    } else if (action === 'transfer') {
      wx.navigateTo({ url: '/pages/transfer/transfer' });
    } else if (action === 'equipment') {
      wx.navigateTo({ url: '/pages/equipment-list/equipment-list' });
    } else if (action === 'renovation') {
      wx.navigateTo({ url: '/pages/renovation/renovation' });
    }
  },
  onOpenServices() { this.setData({ showServices: true }); },
  onCloseServices() { this.setData({ showServices: false }); },
  onHide() { this.onCloseServices(); },
  noop() {},
  onCategoryTap(e) {
    const { type, val } = e.currentTarget.dataset;
    const filter = {};
    if (type === 'sceneGroup') filter.sceneGroup = val;
    else if (type === 'businessScene') filter.businessScene = val;
    else if (type === 'projectType') filter.projectType = val;
    else if (type === 'business') filter.business = val;
    else if (type === 'budget') filter.budget = val;
    else if (type === 'status') filter.status = val;
    else if (type === 'opportunityType') filter.opportunityType = val;
    else if (type === 'recommended') filter.recommended = val === 'true' || val === true;

    wx.setStorageSync('pendingListFilter', filter);
    wx.switchTab({ url: '/pages/list/list' });
  },

  onProjectDetail(e) {
    wx.navigateTo({ url: `/pages/detail/detail?id=${e.currentTarget.dataset.id}` });
  },

  onContactAdvisor() {
    getApp().callAdvisor();
  },

  onApplyCustom() {
    wx.navigateTo({ url: '/pages/apply/apply' });
  },

  onViewRecommended() {
    wx.setStorageSync('pendingListFilter', { recommended: true });
    wx.switchTab({ url: '/pages/list/list' });
  },

  onCoverError(e) {
    const listName = e.currentTarget.dataset.list;
    if (listName !== 'recommendedList' && listName !== 'latestList') return;
    const index = this.data[listName].findIndex(project => String(project.id) === String(e.currentTarget.dataset.id));
    if (index < 0 || this.data[listName][index].coverImageError) return;
    this.setData({ [`${listName}[${index}].coverImageError`]: true });
  },

  onShareAppMessage() { return { title: `${config.APP_NAME} · 校园、园区与写字楼商铺`, path: '/pages/index/index' }; },
  onShareTimeline() { return { title: `${config.APP_NAME} · 校园、园区与写字楼商铺` }; },
  onToggleFav(e) {
    const id = e.currentTarget.dataset.id;
    const isFav = toggleFavorite(id);

    const updateFav = arr => arr.map(item => item.id === id ? { ...item, isFav } : item);
    this.setData({
      recommendedList: updateFav(this.data.recommendedList),
      latestList: updateFav(this.data.latestList)
    });
  }
});
