App({
  globalData: {
    userInfo: {
      nickname: '商户老板',
      avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=100&q=80',
      phone: '13800138000'
    },
    apiUrl: 'http://127.0.0.1:5173/api',
    fallbackUrl: 'http://localhost:5173/api',
    // Demo 模式默认不发起 wx.request，避免微信开发者工具的合法域名校验拦截 localhost/127.0.0.1。
    // 如需联调本地 mock API，可改为 false，并在开发者工具中关闭“校验合法域名”。
    useLocalMock: true
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
