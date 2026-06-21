Page({
  data: {
    updatedAt: '2026-06-21'
  },

  onGoBack() {
    wx.navigateBack({
      fail: () => wx.switchTab({ url: '/pages/my/my' })
    });
  }
});