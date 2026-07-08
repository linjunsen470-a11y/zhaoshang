const api = require('../../services/api.js');
const formBehavior = require('../../utils/formBehavior.js');
const { clip, config } = require('../../utils/form.js');

Page({
  behaviors: [formBehavior],
  data: {
    locationText: '',
    businessType: '',
    feeText: '',
    transferFee: '',
    remainingTerm: '',
    includesEquipment: true
  },

  onLoad(options) {
    this.initCommonData(options, lead => {
      const details = lead.transferDetails || {};
      this.setData({
        locationText: details.locationText || lead.regionPreference || '',
        businessType: lead.businessType,
        feeText: details.feeText || '',
        transferFee: details.transferFee || lead.budgetRange || '',
        remainingTerm: details.remainingTerm || '',
        includesEquipment: details.includesEquipment !== undefined ? details.includesEquipment : true
      });
    });
  },

  onInputLocation(e) { this.setData({ locationText: clip(e.detail.value, config.MAX_REGION_LENGTH) }); },
  onInputBusiness(e) { this.setData({ businessType: clip(e.detail.value, config.MAX_TEXT_LENGTH) }); },
  onInputFee(e) { this.setData({ feeText: clip(e.detail.value, config.MAX_TEXT_LENGTH) }); },
  onInputTransferFee(e) { this.setData({ transferFee: clip(e.detail.value, config.MAX_TEXT_LENGTH) }); },
  onInputTerm(e) { this.setData({ remainingTerm: clip(e.detail.value, config.MAX_TEXT_LENGTH) }); },
  onEquipmentIncludedChange(e) { this.setData({ includesEquipment: e.detail.value === 'true' }); },

  onSubmitForm() {
    if (!this.validateCommonForm()) return;

    const { name, phone, locationText, businessType, feeText, transferFee, remainingTerm, includesEquipment, remark, attachments } = this.data;

    if (!locationText) {
      wx.showToast({ title: '请填写店铺位置', icon: 'none' });
      return;
    }
    if (!businessType) {
      wx.showToast({ title: '请填写当前业态', icon: 'none' });
      return;
    }

    this.saveUserInfo();
    this.setData({ submitting: true });
    const payload = {
      name,
      phone,
      businessType,
      budgetRange: transferFee || '待评估',
      regionPreference: locationText,
      sourceChannel: 'mini_program',
      remark: remark || undefined,
      transferDetails: {
        locationText,
        feeText,
        transferFee,
        remainingTerm,
        includesEquipment
      },
      attachments: attachments.map(item => item.id)
    };

    if (this.data.isEditMode) {
      api.updateLead(this.data.leadId, payload)
        .then(res => {
          this.setData({ submitting: false });
          wx.showToast({
            title: '修改成功',
            icon: 'success',
            duration: 1500,
            success: () => {
              setTimeout(() => {
                wx.navigateBack();
              }, 1500);
            }
          });
        }).catch(err => {
          console.error(err);
          this.setData({ submitting: false });
          wx.showModal({
            title: '修改失败',
            content: err.message || '请稍后重试',
            showCancel: false
          });
        });
    } else {
      api.submitTransfer(payload).then(res => {
        this.saveUserInfo();
        this.setData({ submitting: false });
        wx.navigateTo({ url: `/pages/success/success?leadId=${res.id}` });
      }).catch(err => {
        console.error(err);
        this.setData({ submitting: false });
        wx.showModal({ title: '提交失败', content: '请稍后重试', showCancel: false });
      });
    }
  }
});
