const config = require('../../config.js');

Page({
  data: {
    updatedAt: '2026-10-31',
    companyName: config.COMPANY_NAME,
    contactPhone: config.ADVISOR_PHONE
  },

  onGoBack() {
    wx.navigateBack({
      fail: () => wx.switchTab({ url: '/pages/my/my' })
    });
  }
});
