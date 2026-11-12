const config = require('../../config.js');

Page({
  data: {
    updatedAt: '2026-11-12',
    companyName: config.COMPANY_NAME,
    contactPhone: config.ADVISOR_PHONE
  },

  onGoBack() {
    const now = Date.now();
    if (now - (this._backTapAt || 0) < 600) return;
    this._backTapAt = now;
    const options = {
      fail: () => {
        this._backTapAt = 0;
        wx.showToast({ title: '返回失败，请重试', icon: 'none' });
      }
    };
    if (getCurrentPages().length > 1) wx.navigateBack(options);
    else wx.switchTab({ ...options, url: '/pages/my/my' });
  }
});
