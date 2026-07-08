const api = require('../../services/api.js');
const formBehavior = require('../../utils/formBehavior.js');
const { clip, config } = require('../../utils/form.js');

Page({
  behaviors: [formBehavior],
  data: {
    leadType: 'equipment_sell',
    equipmentName: '',
    specText: '',
    equipmentCondition: '',
    budgetRange: '',
    regionPreference: ''
  },

  onLoad(options) {
    this.initCommonData(options, lead => {
      const details = lead.equipmentDetails || {};
      this.setData({
        leadType: lead.leadType || 'equipment_sell',
        equipmentName: details.equipmentName || lead.businessType || '',
        specText: details.specText || '',
        equipmentCondition: details.equipmentCondition || '',
        budgetRange: details.expectedPrice || lead.budgetRange || '',
        regionPreference: lead.regionPreference || ''
      });
    });
  },

  onTypeTap(e) { this.setData({ leadType: e.currentTarget.dataset.type }); },
  onInputEquipmentName(e) { this.setData({ equipmentName: clip(e.detail.value, config.MAX_TEXT_LENGTH) }); },
  onInputSpec(e) { this.setData({ specText: clip(e.detail.value, config.MAX_TEXT_LENGTH) }); },
  onInputCondition(e) { this.setData({ equipmentCondition: clip(e.detail.value, config.MAX_TEXT_LENGTH) }); },
  onInputBudget(e) { this.setData({ budgetRange: clip(e.detail.value, config.MAX_TEXT_LENGTH) }); },
  onInputRegion(e) { this.setData({ regionPreference: clip(e.detail.value, config.MAX_REGION_LENGTH) }); },

  onSubmitForm() {
    if (!this.validateCommonForm()) return;

    const { leadType, name, phone, equipmentName, specText, equipmentCondition, budgetRange, regionPreference, remark, attachments } = this.data;

    if (!equipmentName) {
      wx.showToast({ title: '请填写设备名称', icon: 'none' });
      return;
    }

    this.saveUserInfo();
    this.setData({ submitting: true });
    const payload = {
      leadType,
      sourceChannel: 'mini_program',
      name,
      phone,
      businessType: equipmentName,
      budgetRange: budgetRange || '待评估',
      regionPreference,
      remark: remark || undefined,
      equipmentDetails: {
        equipmentName,
        specText,
        equipmentCondition,
        expectedPrice: budgetRange
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
      api.submitEquipment(payload).then(res => {
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
