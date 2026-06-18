const api = require('../../services/api.js');

Page({
  data: {
    projectId: '',
    projectTitle: '',

    // 表单数据
    name: '',
    phone: '',
    businessType: '',
    budgetRange: '',
    regionPreference: '',
    hasCampusExperience: false, // 默认无经验
    remark: '',

    // 下拉选择选项
    businesses: ['快餐', '粉面', '小吃', '奶茶', '咖啡', '便利店', '水果', '文具', '打印', '快递', '维修', '洗衣', '其他'],
    budgets: ['5万以内', '5-10万', '10-20万', '20-50万', '50万以上', '暂不确定'],
    
    // UI索引值
    businessIndex: -1,
    budgetIndex: -1,

    submitting: false
  },

  onLoad: function (options) {
    console.log('Apply page options:', options);
    
    // 如果是从详情页进入，自动带入项目 ID 并获取标题
    if (options.projectId) {
      this.setData({ projectId: options.projectId });
      this.loadProjectTitle(options.projectId);
    }

    // 自动回填本地缓存中记录的手机号及称呼，提升商户体验
    const userInfo = wx.getStorageSync('userInfo') || getApp().globalData.userInfo;
    if (userInfo) {
      this.setData({
        name: userInfo.nickname || '',
        phone: userInfo.phone || ''
      });
    }
  },

  // 加载关联项目标题
  loadProjectTitle: function (id) {
    api.getProjectDetail(id)
      .then(project => {
        if (project) {
          this.setData({
            projectTitle: project.title,
            regionPreference: project.district // 默认意向区域为当前项目所在区
          });
        }
      })
      .catch(err => {
        console.error('获取项目标题失败', err);
      });
  },

  // 输入监听
  onInputName: function (e) {
    this.setData({ name: e.detail.value.trim() });
  },

  onInputPhone: function (e) {
    this.setData({ phone: e.detail.value.trim() });
  },

  onInputRegion: function (e) {
    this.setData({ regionPreference: e.detail.value.trim() });
  },

  onInputRemark: function (e) {
    this.setData({ remark: e.detail.value.trim() });
  },

  // 经营品类选择
  onBusinessChange: function (e) {
    const val = e.detail.value;
    this.setData({
      businessIndex: val,
      businessType: this.data.businesses[val]
    });
  },

  // 预算选择
  onBudgetChange: function (e) {
    const val = e.detail.value;
    this.setData({
      budgetIndex: val,
      budgetRange: this.data.budgets[val]
    });
  },

  // 经验单选改变
  onExperienceChange: function (e) {
    this.setData({
      hasCampusExperience: e.detail.value === 'true'
    });
  },

  // 提交咨询表单
  onSubmitForm: function () {
    const { name, phone, businessType, budgetRange, projectId, regionPreference, hasCampusExperience, remark } = this.data;

    // 1. 称呼校验
    if (!name) {
      wx.showToast({ title: '请输入您的称呼', icon: 'none' });
      return;
    }

    // 2. 手机号校验
    if (!phone) {
      wx.showToast({ title: '请输入手机号', icon: 'none' });
      return;
    }
    const phoneRegex = /^1[3-9]\d{9}$/;
    if (!phoneRegex.test(phone)) {
      wx.showToast({ title: '手机号格式不正确', icon: 'none' });
      return;
    }

    // 3. 品类校验
    if (!businessType) {
      wx.showToast({ title: '请选择经营品类', icon: 'none' });
      return;
    }

    // 4. 预算校验
    if (!budgetRange) {
      wx.showToast({ title: '请选择投资预算', icon: 'none' });
      return;
    }

    // 准备提交数据
    const leadData = {
      name: name,
      phone: phone,
      businessType: businessType,
      budgetRange: budgetRange,
      projectId: projectId || undefined,
      regionPreference: regionPreference || undefined,
      hasCampusExperience: hasCampusExperience,
      remark: remark || undefined
    };

    this.setData({ submitting: true });
    
    api.submitLead(leadData)
      .then(res => {
        this.setData({ submitting: false });
        
        // 保存联系人信息，以便下次自动填充
        const userInfo = wx.getStorageSync('userInfo') || {};
        userInfo.nickname = name;
        userInfo.phone = phone;
        wx.setStorageSync('userInfo', userInfo);
        
        // 更新全局对象中的信息
        getApp().globalData.userInfo.phone = phone;
        getApp().globalData.userInfo.nickname = name;

        // 跳转成功页
        wx.navigateTo({
          url: `/pages/success/success?projectId=${projectId}&leadId=${res.id}`
        });
      })
      .catch(err => {
        console.error(err);
        this.setData({ submitting: false });
        wx.showModal({
          title: '提交失败',
          content: err.error || '网络拥堵，请稍后重试',
          showCancel: false
        });
      });
  }
});
