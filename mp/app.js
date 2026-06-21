App({
  globalData: {
    userInfo: {
      nickname: '商户老板',
      avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=100&q=80',
      phone: '13800138000'
    },
    apiUrl: 'http://127.0.0.1:3000/api',
    fallbackUrl: 'http://127.0.0.1:5173/api',
    devOpenId: 'dev-openid-local',
    // true: use built-in mock data without network.
    // false: request Payload/Next compatible API at apiUrl and use auth token.
    useLocalMock: false
  },

  onLaunch() {
    console.log('校园商铺招商平台小程序已启动');
    const favs = wx.getStorageSync('favorites');
    if (!favs) wx.setStorageSync('favorites', []);
  },

  callAdvisor(phoneNumber = '18888888888') {
    wx.showModal({
      title: '联系招商顾问',
      content: `确认拨打 ${phoneNumber} 吗？`,
      confirmText: '立即拨打',
      cancelText: '取消',
      success: res => {
        if (!res.confirm) return;
        wx.makePhoneCall({
          phoneNumber,
          success: () => wx.showToast({ title: '正在拨打...', icon: 'none', duration: 1500 }),
          fail: err => {
            console.log('makePhoneCall fail:', err);
            wx.showToast({
              title: `模拟拨打：${phoneNumber}`,
              icon: 'none',
              duration: 2800
            });
          }
        });
      }
    });
  }
});
