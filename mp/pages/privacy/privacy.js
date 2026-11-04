const config = require('../../config.js');

Page({
  data: {
    updatedAt: '2026-11-05',
    companyName: config.COMPANY_NAME,
    contactPhone: config.ADVISOR_PHONE
  },

  onGoBack() {
    wx.navigateBack({
      fail: () => wx.switchTab({ url: '/pages/my/my' })
    });
  }
});
