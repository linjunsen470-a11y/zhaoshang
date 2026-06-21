const config = require('./config.js');

App({
  globalData: {
    userInfo: {
      nickname: '',
      avatarUrl: '/images/tab_my.png',
      phone: ''
    },
    advisorPhone: config.ADVISOR_PHONE,
    apiUrl: config.API_URL,
    devOpenId: 'dev-openid-local',
    // Plan A (default): Payload backend at apiUrl.
    // Start Postgres, then run `pnpm backend:seed` once and `pnpm backend:dev`.
    // Set true only for offline demo without a running backend.
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
            wx.setClipboardData({
              data: phone,
              success: () => {
                wx.showToast({
                  title: '拨打失败，号码已复制',
                  icon: 'none',
                  duration: 2500
                });
              },
              fail: () => {
                wx.showToast({
                  title: `请手动拨打 ${phone}`,
                  icon: 'none',
                  duration: 2800
                });
              }
            });
          }
        });
      }
    });
  }
});
