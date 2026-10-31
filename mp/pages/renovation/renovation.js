const api = require('../../services/api.js');
const formBehavior = require('../../utils/formBehavior.js');
const { clip, config } = require('../../utils/form.js');
const { safeIdentifier } = require('../../utils/navigation.js');

Page({
  behaviors: [formBehavior],
  data: { requiredFields: [], regionPreference: '' },
  onLoad(options) {
    this.initCommonData({ ...options, leadId: safeIdentifier(options.leadId) }, lead => {
      this.setData({ regionPreference: lead.regionPreference || '' });
    });
  },
  onInputRegion(e) { this.setData({ regionPreference: clip(e.detail.value, config.MAX_REGION_LENGTH) }); },
  onSubmitForm() {
    if (!this.validateCommonForm()) return;
    const { name, phone, regionPreference, remark } = this.data;
    const payload = { leadType: 'renovation_consult', sourceChannel: 'mini_program', name, phone, regionPreference, remark };
    this.saveUserInfo();
    this.setData({ submitting: true });
    const request = this.data.isEditMode ? api.updateLead(this.data.leadId, payload) : api.submitLead(payload);
    request.then(res => {
      this.setData({ submitting: false });
      if (this.data.isEditMode) wx.showToast({ title: '修改成功', icon: 'success', duration: 1500, success: () => setTimeout(() => wx.navigateBack(), 1500) });
      else wx.navigateTo({ url: `/pages/success/success?leadId=${res.id}` });
    }).catch(err => {
      console.error(err);
      this.setData({ submitting: false });
      wx.showModal({ title: this.data.isEditMode ? '修改失败' : '提交失败', content: '请稍后重试', showCancel: false });
    });
  }
});
