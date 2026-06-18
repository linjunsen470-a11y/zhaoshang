const api = require('../../services/api.js');

Page({
  data: {
    leadType: 'leasing',
    projectId: '',
    projectTitle: '',
    name: '',
    phone: '',
    businessType: '',
    budgetRange: '',
    regionPreference: '',
    hasCampusExperience: false,
    remark: '',
    businesses: ['快餐', '粉面', '小吃', '奶茶', '咖啡', '便利店', '水果', '文具', '打印', '快递', '维修', '洗衣', '其他'],
    budgets: ['5万以内', '5-10万', '10-20万', '20-50万', '50万以上', '暂不确定'],
    businessIndex: -1,
    budgetIndex: -1,
    submitting: false
  },

  onLoad(options) {
    if (options.leadType) this.setData({ leadType: options.leadType });
    if (options.projectId) {
      this.setData({ projectId: options.projectId });
      this.loadProjectTitle(options.projectId);
    }
    if (options.from === 'budget') {
      this.setData({
        remark: '希望顾问协助做开店预算测算，并匹配适合预算的校园铺位。'
      });
    }

    const userInfo = wx.getStorageSync('userInfo') || getApp().globalData.userInfo;
    if (userInfo) {
      this.setData({
        name: userInfo.nickname || '',
        phone: userInfo.phone || ''
      });
    }
  },

  loadProjectTitle(id) {
    api.getProjectDetail(id)
      .then(project => {
        if (project) {
          this.setData({
            projectTitle: project.title,
            regionPreference: project.district
          });
        }
      })
      .catch(err => console.error('获取项目标题失败', err));
  },

  onInputName(e) { this.setData({ name: e.detail.value.trim() }); },
  onInputPhone(e) { this.setData({ phone: e.detail.value.trim() }); },
  onInputRegion(e) { this.setData({ regionPreference: e.detail.value.trim() }); },
  onInputRemark(e) { this.setData({ remark: e.detail.value.trim() }); },
  onBusinessChange(e) {
    const val = e.detail.value;
    this.setData({ businessIndex: val, businessType: this.data.businesses[val] });
  },
  onBudgetChange(e) {
    const val = e.detail.value;
    this.setData({ budgetIndex: val, budgetRange: this.data.budgets[val] });
  },
  onExperienceChange(e) {
    this.setData({ hasCampusExperience: e.detail.value === 'true' });
  },

  onClearForm() {
    this.setData({
      name: '',
      phone: '',
      businessType: '',
      budgetRange: '',
      regionPreference: '',
      hasCampusExperience: false,
      remark: '',
      businessIndex: -1,
      budgetIndex: -1
    });
    wx.showToast({ title: '表单已清空', icon: 'none' });
  },

  onSubmitForm() {
    const { leadType, name, phone, businessType, budgetRange, projectId, regionPreference, hasCampusExperience, remark } = this.data;

    if (!name) {
      wx.showToast({ title: '请输入称呼', icon: 'none' });
      return;
    }
    if (!/^1[3-9]\d{9}$/.test(phone)) {
      wx.showToast({ title: '手机号格式不正确', icon: 'none' });
      return;
    }
    if (!businessType) {
      wx.showToast({ title: '请选择经营品类', icon: 'none' });
      return;
    }
    if (!budgetRange) {
      wx.showToast({ title: '请选择投资预算', icon: 'none' });
      return;
    }

    this.setData({ submitting: true });
    api.submitLead({
      leadType,
      sourceChannel: 'mini_program',
      name,
      phone,
      businessType,
      budgetRange,
      projectId: projectId || undefined,
      regionPreference: regionPreference || undefined,
      hasCampusExperience,
      remark: remark || undefined
    }).then(res => {
      const userInfo = wx.getStorageSync('userInfo') || {};
      userInfo.nickname = name;
      userInfo.phone = phone;
      wx.setStorageSync('userInfo', userInfo);
      getApp().globalData.userInfo.phone = phone;
      getApp().globalData.userInfo.nickname = name;
      this.setData({ submitting: false });
      wx.navigateTo({ url: `/pages/success/success?projectId=${projectId || ''}&leadId=${res.id}` });
    }).catch(err => {
      console.error(err);
      this.setData({ submitting: false });
      wx.showModal({
        title: '提交失败',
        content: '网络拥堵，请稍后重试',
        showCancel: false
      });
    });
  }
});
