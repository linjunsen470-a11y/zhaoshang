Page({
  data: {
    projectId: '',
    leadId: ''
  },

  onLoad(options) {
    this.setData({
      projectId: options.projectId || '',
      leadId: options.leadId || ''
    });
  },

  onViewLeads() {
    wx.navigateTo({ url: '/pages/leads/leads' });
  },

  onGoHome() {
    wx.switchTab({ url: '/pages/index/index' });
  },

  onCallAdvisor() {
    getApp().callAdvisor();
  }
});
