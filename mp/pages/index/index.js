const api = require('../../services/api.js');

Page({
  data: {
    searchKeyword: '',
    primaryService: {
      id: 'find',
      name: '找校园铺位',
      desc: '食堂档口/商业街/服务点',
      icon: '🏫',
      action: 'list'
    },
    secondaryServices: [
      { id: 'transfer', name: '委托转让', desc: '退店换店，平台撮合', icon: '🔁', action: 'transfer' },
      { id: 'equipment', name: '餐饮设备', desc: '设备求购/出售/回收', icon: '🧊', action: 'equipment' },
      { id: 'renovation', name: '商铺装修', desc: '设计施工，一步到位', icon: '🛠', action: 'renovation' }
    ],
    categories: [
      { id: 'cat1', name: '食堂档口', icon: '🍜', type: 'projectType', val: '食堂档口' },
      { id: 'cat2', name: '商业街', icon: '🏬', type: 'projectType', val: '校园商业街' },
      { id: 'cat3', name: '小吃快餐', icon: '🍔', type: 'business', val: '小吃' },
      { id: 'cat4', name: '奶茶咖啡', icon: '🥤', type: 'business', val: '奶茶' },
      { id: 'cat5', name: '便利零售', icon: '🛒', type: 'business', val: '便利店' },
      { id: 'cat6', name: '店铺转让', icon: '🔁', type: 'opportunityType', val: 'transfer' },
      { id: 'cat7', name: '低预算', icon: '💰', type: 'budget', val: '5万以内' },
      { id: 'cat8', name: '推荐项目', icon: '🔥', type: 'recommended', val: 'true' }
    ],
    recommendedList: [],
    latestList: [],
    loading: true,
    loadError: false
  },

  onLoad() {
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

    const requestTimeout = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('请求超时，请检查后端是否已启动')), 16000);
    });

    Promise.race([api.getProjects({ public: true }), requestTimeout])
      .then(projects => {
        const list = Array.isArray(projects) ? projects : [];
        const favs = wx.getStorageSync('favorites') || [];
        const activeProjects = list.filter(p => p.status !== 'offline' && p.status !== 'draft');
        activeProjects.sort((a, b) => Number(b.createdAt || 0) - Number(a.createdAt || 0));

        this.setData({
          recommendedList: list
            .filter(p => p.isRecommended && p.status !== 'offline')
            .map(p => ({ ...p, isFav: favs.includes(p.id) })),
          latestList: activeProjects.slice(0, 4).map(p => ({ ...p, isFav: favs.includes(p.id) })),
          loading: false,
          loadError: false
        });
        if (callback) callback();
      })
      .catch(err => {
        console.error('index.loadData failed:', err);
        this.setData({ loading: false, loadError: true });
        wx.showToast({
          title: '项目加载失败',
          icon: 'none',
          duration: 2000
        });
        if (callback) callback();
      });
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
    if (type === 'projectType') filter.projectType = val;
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
