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
    envVersion: config.ENV_VERSION,
    devOpenId: config.DEV_OPEN_ID,
    configError: config.CONFIG_ERROR,
    useLocalMock: config.USE_LOCAL_MOCK
  },

  onLaunch() {
    const favs = wx.getStorageSync('favorites');
    if (!favs) wx.setStorageSync('favorites', []);
    if (config.CONFIG_ERROR) {
      wx.showModal({
        title: '运行环境未配置',
        content: config.CONFIG_ERROR,
        showCancel: false
      });
    }
  },

  onError(message) {
    console.error('MiniProgram runtime error:', message);
  },

  callAdvisor(phoneNumber) {
    const phone = phoneNumber || this.globalData.advisorPhone || config.ADVISOR_PHONE;
    wx.showActionSheet({
      itemList: [`呼叫顾问：${phone}`, '复制电话 (微信同号)'],
      success: (res) => {
        if (res.tapIndex === 0) {
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
                }
              });
            }
          });
        } else if (res.tapIndex === 1) {
          wx.setClipboardData({
            data: phone,
            success: () => {
              wx.showToast({
                title: '已复制，可去微信添加好友',
                icon: 'none',
                duration: 2000
              });
            }
          });
        }
      }
    });
  }
});
