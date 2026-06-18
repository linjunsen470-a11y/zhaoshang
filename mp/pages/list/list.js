const api = require('../../services/api.js');

Page({
  data: {
    // 筛选选项
    districts: ['全部', '天河', '番禺', '增城', '白云', '黄埔', '从化'],
    types: ['全部', '食堂档口', '校园商业街', '校内铺位', '校外临校铺位', '校园服务点', '其他'],
    budgets: ['全部', '5万以内', '5-10万', '10-20万', '20-50万', '50万以上', '面议'],
    businesses: ['全部', '快餐', '粉面', '小吃', '奶茶', '咖啡', '便利店', '水果', '文具', '打印', '快递', '维修', '洗衣'],
    statuses: [
      { val: '全部', name: '全部状态' },
      { val: 'online', name: '招商中' },
      { val: 'coming', name: '即将开放' },
      { val: 'full', name: '已满租' }
    ],

    // 选中筛选值
    selectedDistrict: '全部',
    selectedType: '全部',
    selectedBudget: '全部',
    selectedBusiness: '全部',
    selectedStatus: '全部',
    keyword: '',
    isRecommendedOnly: false,
    isFavoritesOnly: false,

    // 下拉抽屉状态
    activeTab: '', // 'district', 'type', 'budget', 'business', 'status' 或空

    // 数据列表
    projectList: [],
    loading: true
  },

  onLoad: function (options) {
    console.log('List page onLoad options:', options);
    
    // 解析传入的初始化筛选参数
    const newState = {};
    if (options.q) newState.keyword = decodeURIComponent(options.q);
    if (options.projectType) newState.selectedType = decodeURIComponent(options.projectType);
    if (options.business) newState.selectedBusiness = decodeURIComponent(options.business);
    if (options.budget) newState.selectedBudget = decodeURIComponent(options.budget);
    if (options.status) newState.selectedStatus = decodeURIComponent(options.status);
    if (options.recommended) newState.isRecommendedOnly = true;
    if (options.favs) {
      newState.isFavoritesOnly = true;
      wx.setNavigationBarTitle({
        title: '我的收藏'
      });
    }

    this.setData(newState, () => {
      this.loadProjects();
    });
  },

  onShow: function() {
    // 每次显示页面时刷新一次数据，保证在管理端修改状态后，回到小程序能立即刷新
    this.loadProjects();
  },

  onPullDownRefresh: function () {
    this.loadProjects(() => {
      wx.stopPullDownRefresh();
    });
  },

  // 获取并过滤数据
  loadProjects: function (callback) {
    this.setData({ loading: true });

    // 请求参数映射
    const params = {};
    if (this.data.keyword) params.q = this.data.keyword;
    if (this.data.selectedDistrict !== '全部') params.district = this.data.selectedDistrict;
    if (this.data.selectedType !== '全部') params.projectType = this.data.selectedType;
    if (this.data.selectedBudget !== '全部') params.budget = this.data.selectedBudget;
    if (this.data.selectedBusiness !== '全部') params.business = this.data.selectedBusiness;
    if (this.data.selectedStatus !== '全部') params.status = this.data.selectedStatus;

    api.getProjects(params)
      .then(res => {
        let list = res;
        
        // 过滤掉草稿和已下架状态的
        list = list.filter(p => p.status !== 'draft' && p.status !== 'offline');

        // 是否仅推荐
        if (this.data.isRecommendedOnly) {
          list = list.filter(p => p.isRecommended);
        }

        // 是否仅收藏
        if (this.data.isFavoritesOnly) {
          const favs = wx.getStorageSync('favorites') || [];
          list = list.filter(p => favs.includes(p.id));
        }

        this.setData({
          projectList: list,
          loading: false
        });
        if (callback) callback();
      })
      .catch(err => {
        console.error(err);
        this.setData({ loading: false });
        wx.showToast({ title: '加载项目失败', icon: 'none' });
        if (callback) callback();
      });
  },

  // 搜索关键字输入
  onSearchInput: function (e) {
    this.setData({
      keyword: e.detail.value
    });
  },

  // 触发搜索
  onSearch: function () {
    this.loadProjects();
  },

  // 切换筛选 Tab 打开/关闭
  onTabTap: function (e) {
    const tab = e.currentTarget.dataset.tab;
    this.setData({
      activeTab: this.data.activeTab === tab ? '' : tab
    });
  },

  // 选择某个筛选选项值
  onSelectOption: function (e) {
    const { field, val } = e.currentTarget.dataset;
    
    const updates = {
      activeTab: '' // 关闭抽屉
    };

    if (field === 'district') updates.selectedDistrict = val;
    else if (field === 'type') updates.selectedType = val;
    else if (field === 'budget') updates.selectedBudget = val;
    else if (field === 'business') updates.selectedBusiness = val;
    else if (field === 'status') updates.selectedStatus = val;

    this.setData(updates, () => {
      this.loadProjects();
    });
  },

  // 关闭下拉浮层
  closeDrawer: function () {
    this.setData({ activeTab: '' });
  },

  // 导航到详情页
  onProjectDetail: function (e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: `/pages/detail/detail?id=${id}`
    });
  },

  // 重置所有筛选条件
  onResetFilters: function() {
    this.setData({
      selectedDistrict: '全部',
      selectedType: '全部',
      selectedBudget: '全部',
      selectedBusiness: '全部',
      selectedStatus: '全部',
      keyword: '',
      isRecommendedOnly: false,
      activeTab: ''
    }, () => {
      this.loadProjects();
    });
  }
});
