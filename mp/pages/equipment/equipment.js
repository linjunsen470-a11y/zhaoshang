const api = require('../../services/api.js');
const formBehavior = require('../../utils/formBehavior.js');
const { clip, config } = require('../../utils/form.js');
const { attachmentIds } = require('../../utils/attachment.js');
const { allowedValue, safeIdentifier } = require('../../utils/navigation.js');

const EQUIPMENT_LEAD_TYPES = ['equipment_sell', 'equipment_buy', 'equipment_recycle'];

Page({
  behaviors: [formBehavior],
  data: {
    requiredFields: [{ key: 'leadType', message: '请选择设备需求类型' }, { key: 'equipmentName', message: '请填写设备名称' }],
    leadType: '',
    equipmentName: ''
  },
  onLoad(options) {
    const leadId = safeIdentifier(options.leadId);
    if (!leadId) this.setData({ leadType: allowedValue(options.leadType, EQUIPMENT_LEAD_TYPES, '') });
    this.initCommonData({ ...options, leadId }, lead => {
      this.setData({ leadType: allowedValue(lead.leadType, EQUIPMENT_LEAD_TYPES, ''), equipmentName: (lead.equipmentDetails && lead.equipmentDetails.equipmentName) || '' });
    });
  },
  onTypeTap(e) {
    if (this.data.isEditMode) return;
    this.clearFieldError('leadType');
    this.setData({ leadType: allowedValue(e.currentTarget.dataset.type, EQUIPMENT_LEAD_TYPES, '') });
  },
  onInputEquipmentName(e) {
    this.clearFieldError('equipmentName');
    this.setData({ equipmentName: clip(e.detail.value, config.MAX_TEXT_LENGTH) });
  },
  onSubmitForm() {
    if (!this.validateCommonForm()) return;
    const { leadType, name, phone, equipmentName, remark, attachments } = this.data;
    const payload = {
      leadType, sourceChannel: 'mini_program', name, phone, businessType: equipmentName, remark,
      equipmentDetails: { equipmentName }, attachments: attachmentIds(attachments)
    };
    this.saveUserInfo();
    this.setData({ submitting: true });
    const request = this.data.isEditMode ? api.updateLead(this.data.leadId, payload) : api.submitEquipment(payload);
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
