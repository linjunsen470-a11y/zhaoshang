const config = require('../config.js');
let loginPromise = null;

function getAppConfig() {
  const app = typeof getApp === 'function' ? getApp() : null;
  return app ? app.globalData : {
    apiUrl: config.API_URL,
    devOpenId: config.DEV_OPEN_ID,
    useLocalMock: config.USE_LOCAL_MOCK,
    configError: config.CONFIG_ERROR
  };
}

function wxLogin() {
  return new Promise((resolve, reject) => {
    wx.login({
      success: res => {
        if (res.code) {
          resolve(res.code);
        } else {
          reject(new Error('微信登录未返回 code'));
        }
      },
      fail: err => reject(err || new Error('微信登录失败'))
    });
  });
}

function postLogin(code, config) {
  if (config.configError || !config.apiUrl) {
    return Promise.reject(new Error(config.configError || '服务地址未配置'));
  }
  const useDevHeaders = config.envVersion === 'develop' && Boolean(config.devOpenId);
  const devOpenId = useDevHeaders ? config.devOpenId : '';
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
  const appConfig = getAppConfig();
  if (appConfig.useLocalMock) return '';
  if (appConfig.configError || !appConfig.apiUrl) {
    throw new Error(appConfig.configError || '服务地址未配置');
  }

  const cached = wx.getStorageSync('authToken');
  const expiresAt = wx.getStorageSync('authTokenExpiresAt');
  
  // Proactively refresh if the token is within 30 minutes of expiration or has already expired
  const isExpired = expiresAt ? (Date.now() + 30 * 60 * 1000 > Number(expiresAt)) : true;

  if (cached && !isExpired && !forceRefresh) return cached;

  if (!loginPromise) {
    loginPromise = wxLogin()
      .then(code => postLogin(code, appConfig))
      .finally(() => {
        loginPromise = null;
      });
  }
  return loginPromise;
}

function clearAuth() {
  wx.removeStorageSync('authToken');
  wx.removeStorageSync('authOpenId');
  wx.removeStorageSync('authTokenExpiresAt');
}


module.exports = {
  clearAuth,
  getAuthToken
};
