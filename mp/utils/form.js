const config = require('../config.js');

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
  loadLeadForEdit,
  config
};