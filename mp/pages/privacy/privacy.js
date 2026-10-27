Page({
  data: {
    updatedAt: '2026-10-25'
  },

  onGoBack() {
    wx.navigateBack({
      fail: () => wx.switchTab({ url: '/pages/my/my' })
    });
  }
});
