const api = require('../services/api.js');
const { validatePhone } = require('./form.js');

async function authorizeWechatPhone(event) {
  const detail = (event && event.detail) || {};
  if (/deny|denied|cancel/i.test(detail.errMsg || '')) return null;
  if (typeof detail.code !== 'string' || !detail.code.trim()) {
    throw new Error('未取得微信手机号授权，请重新授权');
  }
  const result = await api.getWechatPhone(detail.code);
  if (!result || !validatePhone(result.phone)) throw new Error('微信手机号获取失败，请重新授权');
  return result.phone;
}

function rememberContact(changes) {
  const app = getApp();
  const current = wx.getStorageSync('userInfo') || (app && app.globalData && app.globalData.userInfo) || {};
  const userInfo = { ...current, ...changes };
  wx.setStorageSync('userInfo', userInfo);
  if (app && app.globalData) app.globalData.userInfo = userInfo;
  return userInfo;
}

module.exports = { authorizeWechatPhone, rememberContact };
