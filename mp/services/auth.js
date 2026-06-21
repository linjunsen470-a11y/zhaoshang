function getAppConfig() {
  return (getApp && getApp()) ? getApp().globalData : {
    apiUrl: 'http://127.0.0.1:3000/api',
    devOpenId: 'dev-openid-local',
    useLocalMock: true
  };
}

function wxLogin() {
  return new Promise(resolve => {
    wx.login({
      success: res => resolve(res.code || 'dev'),
      fail: () => resolve('dev')
    });
  });
}

function postLogin(code, config) {
  return new Promise((resolve, reject) => {
    wx.request({
      url: `${config.apiUrl}/auth/wechat-login`,
      method: 'POST',
      data: {
        code,
        devOpenId: config.devOpenId || 'dev-openid-local'
      },
      header: {
        'X-Dev-OpenId': config.devOpenId || 'dev-openid-local'
      },
      success: res => {
        if (res.statusCode >= 200 && res.statusCode < 300 && res.data && res.data.token) {
          wx.setStorageSync('authToken', res.data.token);
          wx.setStorageSync('authOpenId', res.data.openid);
          resolve(res.data.token);
        } else {
          reject(res.data || res);
        }
      },
      fail: reject
    });
  });
}

async function getAuthToken(forceRefresh = false) {
  const config = getAppConfig();
  if (config.useLocalMock) return '';

  const cached = wx.getStorageSync('authToken');
  if (cached && !forceRefresh) return cached;

  const code = await wxLogin();
  return postLogin(code, config);
}

module.exports = {
  getAuthToken
};
