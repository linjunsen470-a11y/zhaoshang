const api = require('../../services/api.js');

Page({
  data: {
    districts: ['全部', '天河', '番禺', '增城', '白云', '黄埔', '从化'],
    opportunityTypes: [
      { val: '全部', name: '全部来源' },
      { val: 'leasing', name: '重点招商' },
      { val: 'transfer', name: '委托转让' }
    ],
    types: ['全部', '食堂档口', '校园商业街', '校内铺位', '校外临校铺位', '校园服务点', '店铺转让', '其他'],
    budgets: ['全部', '5万以内', '5-10万', '10-20万', '20-50万', '50万以上', '面议'],
    businesses: ['全部', '快餐', '粉面', '小吃', '奶茶', '咖啡', '便利店', '水果', '文具', '打印', '快递', '维修', '洗衣'],
    statuses: [
      { val: '全部', name: '全部状态' },
      { val: 'online', name: '开放中' },
      { val: 'coming', name: '即将开放' },
      { val: 'full', name: '已满/已转' }
    ],
    selectedDistrict: '全部',
    selectedType: '全部',
    selectedOpportunityType: '全部',
    selectedBudget: '全部',
    selectedBusiness: '全部',
    selectedStatus: '全部',
    keyword: '',
    isRecommendedOnly: false,
    isFavoritesOnly: false,
    activeTab: '',
    projectList: [],
    loading: true,
    loadError: false
  },

  onLoad(options) {
    const base = this.getBaseFilters();
    this.setData({ ...base, ...this.applyFilterParams(options) }, () => this.loadProjects());
  },

  onShow() {
    const pending = wx.getStorageSync('pendingListFilter');
    if (pending) {
      wx.removeStorageSync('pendingListFilter');
      const newState = { ...this.getBaseFilters(), ...this.applyFilterParams(pending) };
      if (pending.favs || newState.isFavoritesOnly) {
        newState.isFavoritesOnly = true;
        wx.setNavigationBarTitle({ title: '我的收藏' });
      } else {
        wx.setNavigationBarTitle({ title: '找校园铺位' });
      }
      this.setData(newState, () => this.loadProjects());
      return;
    }

    const favs = wx.getStorageSync('favorites') || [];
    if (this.data.projectList.length > 0) {
      let list = this.data.projectList.map(p => ({ ...p, isFav: favs.includes(p.id) }));
      if (this.data.isFavoritesOnly) list = list.filter(p => p.isFav);
      this.setData({ projectList: list });
    }
  },

  getBaseFilters() {
    return {
      selectedDistrict: '全部',
      selectedType: '全部',
      selectedOpportunityType: '全部',
      selectedBudget: '全部',
      selectedBusiness: '全部',
      selectedStatus: '全部',
      keyword: '',
      isRecommendedOnly: false,
      isFavoritesOnly: false,
      activeTab: ''
    };
  },

  applyFilterParams(params = {}) {
    const newState = {};
    if (params.q) newState.keyword = typeof params.q === 'string' ? decodeURIComponent(params.q) : params.q;
    if (params.projectType) newState.selectedType = typeof params.projectType === 'string' ? decodeURIComponent(params.projectType) : params.projectType;
    if (params.opportunityType) newState.selectedOpportunityType = typeof params.opportunityType === 'string' ? decodeURIComponent(params.opportunityType) : params.opportunityType;
    if (params.business) newState.selectedBusiness = typeof params.business === 'string' ? decodeURIComponent(params.business) : params.business;
    if (params.budget) newState.selectedBudget = typeof params.budget === 'string' ? decodeURIComponent(params.budget) : params.budget;
    if (params.status) newState.selectedStatus = typeof params.status === 'string' ? decodeURIComponent(params.status) : params.status;
    if (params.recommended) newState.isRecommendedOnly = true;
    if (params.favs) newState.isFavoritesOnly = true;
    return newState;
  },

  onPullDownRefresh() {
    this.loadProjects(() => {
      wx.stopPullDownRefresh();
      wx.showToast({ title: '已刷新项目列表', icon: 'none', duration: 1200 });
    });
  },

  loadProjects(callback) {
    this.setData({ loading: true, loadError: false });

    const params = { public: true };
    if (this.data.keyword) params.q = this.data.keyword;
    if (this.data.selectedDistrict !== '全部') params.district = this.data.selectedDistrict;
    if (this.data.selectedType !== '全部') params.projectType = this.data.selectedType;
    if (this.data.selectedOpportunityType !== '全部') params.opportunityType = this.data.selectedOpportunityType;
    if (this.data.selectedBudget !== '全部') params.budget = this.data.selectedBudget;
    if (this.data.selectedBusiness !== '全部') params.business = this.data.selectedBusiness;
    if (this.data.selectedStatus !== '全部') params.status = this.data.selectedStatus;

    api.getProjects(params)
      .then(res => {
        let list = (res || []).filter(p => p.status !== 'draft' && p.status !== 'offline');
        if (this.data.isRecommendedOnly) list = list.filter(p => p.isRecommended);

        const favs = wx.getStorageSync('favorites') || [];
        if (this.data.isFavoritesOnly) list = list.filter(p => favs.includes(p.id));

        this.setData({
          projectList: list.map(p => ({ ...p, isFav: favs.includes(p.id) })),
          loading: false,
          loadError: false
        });
        if (callback) callback();
      })
      .catch(err => {
        console.error(err);
        this.setData({ loading: false, loadError: true });
        wx.showToast({
          title: '加载失败，请稍后重试',
          icon: 'none',
          duration: 2000
        });
        if (callback) callback();
      });
  },

  onRetryLoad() {
    this.loadProjects();
  },

  onClearKeyword() {
    this.setData({ keyword: '' }, () => {
      wx.showLoading({ title: '搜索中...', mask: false });
      this.loadProjects(() => wx.hideLoading());
    });
  },

  onSearchInput(e) {
    this.setData({ keyword: e.detail.value });
  },

  onSearch() {
    wx.showLoading({ title: '搜索中...', mask: false });
    this.loadProjects(() => wx.hideLoading());
  },

  onTabTap(e) {
    const tab = e.currentTarget.dataset.tab;
    this.setData({ activeTab: this.data.activeTab === tab ? '' : tab });
  },

  onSelectOption(e) {
    const { field, val } = e.currentTarget.dataset;
    const updates = { activeTab: '' };
    if (field === 'district') updates.selectedDistrict = val;
    else if (field === 'opportunityType') updates.selectedOpportunityType = val;
    else if (field === 'type') updates.selectedType = val;
    else if (field === 'budget') updates.selectedBudget = val;
    else if (field === 'business') updates.selectedBusiness = val;
    else if (field === 'status') updates.selectedStatus = val;

    this.setData(updates, () => {
      wx.showLoading({ title: '筛选中...', mask: false });
      this.loadProjects(() => wx.hideLoading());
    });
  },

  closeDrawer() {
    this.setData({ activeTab: '' });
  },

  onProjectDetail(e) {
    wx.navigateTo({ url: `/pages/detail/detail?id=${e.currentTarget.dataset.id}` });
  },

  onResetFilters() {
    this.setData(this.getBaseFilters(), () => this.loadProjects());
  },

  onToggleFavInList(e) {
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

    let finalList = this.data.projectList.map(p => p.id === id ? { ...p, isFav: !isFav } : p);
    if (this.data.isFavoritesOnly && isFav) finalList = finalList.filter(p => p.isFav);
    this.setData({ projectList: finalList });
  }
});
