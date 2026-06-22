const config = require('../config.js');

function getAppConfig() {
  return (getApp && getApp()) ? getApp().globalData : {
    apiUrl: config.API_URL,
    devOpenId: 'dev-openid-local',
    useLocalMock: false
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
  const useDevHeaders = Boolean(config.useLocalMock);
  const devOpenId = config.devOpenId || 'dev-openid-local';
  const headers = {};
  const payload = { code };

  if (useDevHeaders) {
    headers['X-Dev-OpenId'] = devOpenId;
    payload.devOpenId = devOpenId;
  }

  return new Promise((resolve, reject) => {
    wx.request({
      url: `${config.apiUrl}/auth/wechat-login`,
      method: 'POST',
      data: payload,
      header: headers,
      success: res => {
        if (res.statusCode >= 200 && res.statusCode < 300 && res.data && res.data.token) {
          wx.setStorageSync('authToken', res.data.token);
          wx.setStorageSync('authOpenId', res.data.openid);
          // Store token expiration time (default to 7 days if not provided)
          wx.setStorageSync('authTokenExpiresAt', res.data.expiresAt || (Date.now() + 7 * 24 * 60 * 60 * 1000));
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
  const expiresAt = wx.getStorageSync('authTokenExpiresAt');
  
  // Proactively refresh if the token is within 30 minutes of expiration or has already expired
  const isExpired = expiresAt ? (Date.now() + 30 * 60 * 1000 > Number(expiresAt)) : true;

  if (cached && !isExpired && !forceRefresh) return cached;

  const code = await wxLogin();
  return postLogin(code, config);
}


module.exports = {
  getAuthToken
};
