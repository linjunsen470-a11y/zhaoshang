const api = require('../../services/api.js');
const { isPublicProject } = require('../../utils/project.js');

Page({
  data: {
    searchKeyword: '',
    primaryService: {
      id: 'find',
      name: '全部铺位',
      desc: '校园、社区、文旅与购物中心',
      icon: '/images/icons/shops.png',
      action: 'list'
    },
    secondaryServices: [
      { id: 'transfer', name: '委托转让', desc: '登记信息，协助联系意向方', icon: '/images/icons/transfer.png', action: 'transfer' },
      { id: 'equipment', name: '餐饮设备', desc: '求购、出售与回收登记', icon: '/images/icons/equipment.png', action: 'equipment' },
      { id: 'renovation', name: '商铺装修', desc: '登记需求，对接施工服务', icon: '/images/icons/renovation.png', action: 'renovation' }
    ],
    categories: [
      { id: 'campus', name: '校园商铺', icon: '/images/icons/campus.png', type: 'businessScene', val: 'campus' },
      { id: 'community', name: '社区商业', icon: '/images/icons/community.png', type: 'businessScene', val: 'community' },
      { id: 'tourism', name: '文旅街区', icon: '/images/icons/tourism.png', type: 'businessScene', val: 'tourism' },
      { id: 'mall', name: '购物中心', icon: '/images/icons/mall.png', type: 'businessScene', val: 'mall' },
    ],
    services: [],
    recommendedList: [],
    latestList: [],
    loading: true,
    loadError: false
  },

  onLoad() {
    this.setData({ services: [this.data.primaryService, ...this.data.secondaryServices] });
    this.loadData();
  },

  onShow() {
    if (this.data.recommendedList.length > 0 || this.data.latestList.length > 0) {
      const favs = wx.getStorageSync('favorites') || [];
      this.setData({
        recommendedList: this.data.recommendedList.map(p => ({ ...p, isFav: favs.includes(p.id) })),
        latestList: this.data.latestList.map(p => ({ ...p, isFav: favs.includes(p.id) }))
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
      api.getProjectPage({ public: true, recommended: 'true', page: 1, limit: 6 }),
      api.getProjectPage({ public: true, sort: 'latest', page: 1, limit: 4 })
    ]), requestTimeout])
      .then(([recommended, latest]) => {
        const favs = wx.getStorageSync('favorites') || [];
        const prepare = rows => rows.filter(isPublicProject).map(p => ({ ...p, isFav: favs.includes(p.id) }));
        this.setData({ recommendedList: prepare(recommended.docs), latestList: prepare(latest.docs), loading: false, loadError: false });
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

  onCategoryTap(e) {
    const { type, val } = e.currentTarget.dataset;
    const filter = {};
    if (type === 'businessScene') filter.businessScene = val;
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

  onToggleFav(e) {
    const id = e.currentTarget.dataset.id;
    let favs = wx.getStorageSync('favorites') || [];
    const isFav = favs.includes(id);

    if (isFav) {
      favs = favs.filter(x => x !== id);
      wx.showToast({ title: '已取消收藏', icon: 'none' });
    } else {
      favs.push(id);
      wx.showToast({ title: '收藏成功', icon: 'success' });
    }
    wx.setStorageSync('favorites', favs);

    const updateFav = arr => arr.map(item => item.id === id ? { ...item, isFav: !isFav } : item);
    this.setData({
      recommendedList: updateFav(this.data.recommendedList),
      latestList: updateFav(this.data.latestList)
    });
  }
});
