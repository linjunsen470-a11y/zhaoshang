const api = require('../../services/api.js');
const formBehavior = require('../../utils/formBehavior.js');
const { clip, config } = require('../../utils/form.js');
const { attachmentIds } = require('../../utils/attachment.js');
const { safeIdentifier } = require('../../utils/navigation.js');

Page({
  behaviors: [formBehavior],
  data: {
    requiredFields: [{ key: 'locationText', message: '请填写店铺所在城市或区域' }],
    locationText: ''
  },
  onLoad(options) {
    this.initCommonData({ ...options, leadId: safeIdentifier(options.leadId) }, lead => {
      this.setData({ locationText: (lead.transferDetails && lead.transferDetails.locationText) || '' });
    });
  },
  onInputLocation(e) {
    this.clearFieldError('locationText');
    this.setData({ locationText: clip(e.detail.value, config.MAX_REGION_LENGTH) });
  },
  onSubmitForm() {
    if (!this.validateCommonForm()) return;
    const { name, phone, locationText, remark, attachments } = this.data;
    const payload = {
      name, phone, regionPreference: locationText, sourceChannel: 'mini_program', remark,
      transferDetails: { locationText }, attachments: attachmentIds(attachments)
    };
    this.saveUserInfo();
    this.setData({ submitting: true });
    const request = this.data.isEditMode ? api.updateLead(this.data.leadId, payload) : api.submitTransfer(payload);
    request.then(res => {
      if (!this.data.isEditMode) this.setData({ submitting: false });
      if (this.data.isEditMode) this.finishEditing();
      else wx.navigateTo({ url: `/pages/success/success?leadId=${res.id}` });
    }).catch(err => {
      console.error(err);
      this.setData({ submitting: false });
      wx.showModal({ title: this.data.isEditMode ? '修改失败' : '提交失败', content: err.message || '请稍后重试', showCancel: false });
    });
  }
});
