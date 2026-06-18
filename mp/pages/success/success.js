Page({
  data: {
    projectId: '',
    leadId: ''
  },

  onLoad: function (options) {
    this.setData({
      projectId: options.projectId || '',
      leadId: options.leadId || ''
    });
  },

  // 查看咨询记录
  onViewLeads: function () {
    wx.navigateTo({
      url: '/pages/leads/leads'
    });
  },

  // 返回首页
  onGoHome: function () {
    wx.switchTab({
      url: '/pages/index/index'
    });
  },

  // 联系顾问
  onCallAdvisor: function () {
    wx.makePhoneCall({
      phoneNumber: '18888888888',
      success: () => console.log('拨号成功'),
      fail: () => console.log('取消')
    });
  }
});
