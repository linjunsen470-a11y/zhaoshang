const config = require('./config.js');

App({
  globalData: {
    userInfo: {
      nickname: '',
      avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=100&q=80',
      phone: ''
    },
    advisorPhone: config.ADVISOR_PHONE,
    apiUrl: 'http://127.0.0.1:3000/api',
    fallbackUrl: 'http://127.0.0.1:5173/api',
    devOpenId: 'dev-openid-local',
    // true: use built-in mock data without network.
    // false: request Payload/Next compatible API at apiUrl and use auth token.
    useLocalMock: false
  },

  onLaunch() {
    const favs = wx.getStorageSync('favorites');
    if (!favs) wx.setStorageSync('favorites', []);
  },

  callAdvisor(phoneNumber) {
    const phone = phoneNumber || this.globalData.advisorPhone || config.ADVISOR_PHONE;
    wx.showModal({
      title: '联系招商顾问',
      content: `确认拨打 ${phone} 吗？`,
      confirmText: '立即拨打',
      cancelText: '取消',
      success: res => {
        if (!res.confirm) return;
        wx.makePhoneCall({
          phoneNumber: phone,
          success: () => wx.showToast({ title: '正在拨打...', icon: 'none', duration: 1500 }),
          fail: () => {
            wx.showToast({
              title: `模拟拨打：${phone}`,
              icon: 'none',
              duration: 2800
            });
          }
        });
      }
    });
  }
});
