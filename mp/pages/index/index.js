const api = require('../../services/api.js');

Page({
  data: {
    searchKeyword: '',
    categories: [
      { id: 'cat1', name: '食堂档口', icon: '🍲', type: 'projectType', val: '食堂档口' },
      { id: 'cat2', name: '校园商业街', icon: '🛍️', type: 'projectType', val: '校园商业街' },
      { id: 'cat3', name: '快餐小吃', icon: '🍟', type: 'business', val: '小吃' },
      { id: 'cat4', name: '奶茶咖啡', icon: '🧋', type: 'business', val: '奶茶' },
      { id: 'cat5', name: '便利零售', icon: '🏪', type: 'business', val: '便利店' },
      { id: 'cat6', name: '校园服务', icon: '🛠️', type: 'projectType', val: '校园服务点' },
      { id: 'cat7', name: '低预算项目', icon: '💰', type: 'budget', val: '5万以内' },
      { id: 'cat8', name: '热门项目', icon: '🔥', type: 'status', val: 'online' }
    ],
    recommendedList: [],
    latestList: [],
    loading: true
  },

  onLoad: function () {
    this.loadData();
  },

  onPullDownRefresh: function () {
    this.loadData(() => {
      wx.stopPullDownRefresh();
    });
  },

  loadData: function (callback) {
    this.setData({ loading: true });
    
    // 拉取所有项目
    api.getProjects()
      .then(projects => {
        // 推荐项目：isRecommended === true 且不是 offline
        const recommended = projects.filter(p => p.isRecommended && p.status !== 'offline');
        
        // 最新项目：按创建时间倒序排的前4个（不包括 offline 和 draft）
        const activeProjects = projects.filter(p => p.status !== 'offline' && p.status !== 'draft');
        activeProjects.sort((a, b) => b.createdAt - a.createdAt);
        const latest = activeProjects.slice(0, 4);

        this.setData({
          recommendedList: recommended,
          latestList: latest,
          loading: false
        });
        if (callback) callback();
      })
      .catch(err => {
        console.error(err);
        this.setData({ loading: false });
        wx.showToast({ title: '加载失败', icon: 'none' });
        if (callback) callback();
      });
  },

  // 搜索框输入
  onSearchInput: function (e) {
    this.setData({
      searchKeyword: e.detail.value
    });
  },

  // 点击搜索确定/点击按钮
  onSearch: function () {
    const q = this.data.searchKeyword.trim();
    wx.navigateTo({
      url: `/pages/list/list?q=${encodeURIComponent(q)}`
    });
  },

  // 分类按钮点击
  onCategoryTap: function (e) {
    const { type, val } = e.currentTarget.dataset;
    wx.navigateTo({
      url: `/pages/list/list?${type}=${encodeURIComponent(val)}`
    });
  },

  // 查看项目详情
  onProjectDetail: function (e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: `/pages/detail/detail?id=${id}`
    });
  },

  // 拨打招商顾问电话
  onContactAdvisor: function () {
    wx.makePhoneCall({
      phoneNumber: '18888888888',
      success: () => console.log('拨打电话成功'),
      fail: () => console.log('取消拨打')
    });
  },

  // 提交自定义咨询
  onApplyCustom: function () {
    wx.navigateTo({
      url: '/pages/apply/apply'
    });
  }
});
