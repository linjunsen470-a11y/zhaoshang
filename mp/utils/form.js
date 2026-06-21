const config = require('../config.js');

const PRIVACY_CONSENT_KEY = 'privacyConsentAccepted';

const LEAD_TYPE_LABELS = {
  leasing: '找铺咨询',
  transfer: '店铺转让',
  equipment_sell: '设备出售',
  equipment_buy: '设备求购',
  equipment_recycle: '设备回收'
};

function clip(value, max) {
  const text = String(value || '').trim();
  return text.length > max ? text.slice(0, max) : text;
}

function validatePhone(phone) {
  return config.PHONE_PATTERN.test(String(phone || '').trim());
}

function validateName(name) {
  const value = clip(name, config.MAX_NAME_LENGTH);
  if (!value) return '请输入称呼';
  return '';
}

function getLeadTypeLabel(leadType) {
  return LEAD_TYPE_LABELS[leadType] || leadType || '咨询';
}

function hasPrivacyConsent() {
  return Boolean(wx.getStorageSync(PRIVACY_CONSENT_KEY));
}

function rememberPrivacyConsent() {
  wx.setStorageSync(PRIVACY_CONSENT_KEY, true);
}

function validatePrivacyConsent(accepted) {
  if (!accepted && !hasPrivacyConsent()) return '请先阅读并同意《隐私政策》';
  return '';
}

function loadLeadForEdit(api, leadId, onSuccess, onFail) {
  wx.showLoading({ title: '加载中...' });
  api.getLead(leadId)
    .then(lead => {
      if (!lead) {
        wx.showToast({ title: '未找到该咨询记录', icon: 'none' });
        return;
      }
      onSuccess(lead);
    })
    .catch(err => {
      console.error(err);
      if (onFail) onFail(err);
      else wx.showToast({ title: '加载失败', icon: 'none' });
    })
    .finally(() => wx.hideLoading());
}

module.exports = {
  clip,
  validatePhone,
  validateName,
  getLeadTypeLabel,
  hasPrivacyConsent,
  rememberPrivacyConsent,
  validatePrivacyConsent,
  loadLeadForEdit,
  config
};