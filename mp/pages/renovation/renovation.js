const api = require('../../services/api.js');
const formBehavior = require('../../utils/formBehavior.js');
const { clip, config } = require('../../utils/form.js');
const { attachmentIds } = require('../../utils/attachment.js');
const { safeIdentifier } = require('../../utils/navigation.js');

Page({
  behaviors: [formBehavior],
  data: {
    shopArea: '',
    renovationType: '',
    designStyle: '',
    budgetText: '',
    expectedStartDate: '',
    renovationTypes: ['新铺装修', '旧铺翻新', '局部改造'],
    renovationTypeValues: ['new_build', 'renovation', 'partial'],
    renovationTypeIndex: -1
  },

  onLoad(options) {
    this.initCommonData({ ...options, leadId: safeIdentifier(options.leadId) }, lead => {
      const details = lead.renovationDetails || {};
      const renovationTypeIndex = this.data.renovationTypeValues.indexOf(details.renovationType);
      this.setData({
        shopArea: details.shopArea || '',
        renovationType: details.renovationType || '',
        designStyle: details.designStyle || '',
        budgetText: details.budgetText || '',
        expectedStartDate: details.expectedStartDate || '',
        renovationTypeIndex
      });
    });
  },

  onInputShopArea(e) {
    this.setData({ shopArea: clip(e.detail.value, config.MAX_TEXT_LENGTH) });
  },

  onRenovationTypeChange(e) {
    const val = e.detail.value;
    this.setData({
      renovationTypeIndex: val,
      renovationType: this.data.renovationTypeValues[val]
    });
  },

  onInputDesignStyle(e) {
    this.setData({ designStyle: clip(e.detail.value, config.MAX_TEXT_LENGTH) });
  },

  onInputBudgetText(e) {
    this.setData({ budgetText: clip(e.detail.value, config.MAX_TEXT_LENGTH) });
  },

  onInputExpectedStartDate(e) {
    this.setData({ expectedStartDate: clip(e.detail.value, config.MAX_TEXT_LENGTH) });
  },

  onSubmitForm() {
    if (!this.validateCommonForm()) return;

    const {
      name,
      phone,
      shopArea,
      renovationType,
      designStyle,
      budgetText,
      expectedStartDate,
      remark,
      attachments
    } = this.data;

    if (!shopArea) {
      wx.showToast({ title: '请填写店铺面积', icon: 'none' });
      return;
    }
    if (!renovationType) {
      wx.showToast({ title: '请选择装修类型', icon: 'none' });
      return;
    }

    this.saveUserInfo();
    this.setData({ submitting: true });

    const payload = {
      leadType: 'renovation_consult',
      sourceChannel: 'mini_program',
      name,
      phone,
      businessType: '商铺装修咨询',
      budgetRange: budgetText || '待评估',
      regionPreference: '现场面议',
      remark: remark || undefined,
      renovationDetails: {
        shopArea,
        renovationType,
        designStyle,
        budgetText,
        expectedStartDate
      },
      attachments: attachmentIds(attachments)
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
      api.submitLead(payload).then(res => {
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
