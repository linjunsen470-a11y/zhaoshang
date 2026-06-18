App({
  globalData: {
    // 默认提供一个 Mock 用户，手机号可以由用户修改
    userInfo: {
      nickname: '商户老板',
      avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=100&q=80',
      phone: '13800138000'
    },
    // 本地 API 服务器地址
    apiUrl: 'http://127.0.0.1:5173/api',
    // 备用地址（某些模拟器中使用 localhost 或 10.0.2.2 等，这里提供可配性）
    fallbackUrl: 'http://localhost:5173/api'
  },

  onLaunch: function () {
    console.log('学校商铺招商宝小程序已启动');
    
    // 初始化本地存储的收藏列表
    const favs = wx.getStorageSync('favorites');
    if (!favs) {
      wx.setStorageSync('favorites', []);
    }
  }
});
