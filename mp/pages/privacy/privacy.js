Page({
  data: {
    updatedAt: '2026-07-11'
  },

  onGoBack() {
    wx.navigateBack({
      fail: () => wx.switchTab({ url: '/pages/my/my' })
    });
  }
});
