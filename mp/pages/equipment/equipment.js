const api = require('../../services/api.js');
const upload = require('../../services/upload.js');
const { clip, validatePhone, validateName, loadLeadForEdit, config } = require('../../utils/form.js');

Page({
  data: {
    leadType: 'equipment_sell',
    name: '',
    phone: '',
    equipmentName: '',
    specText: '',
    equipmentCondition: '',
    budgetRange: '',
    regionPreference: '',
    remark: '',
    attachments: [],
    uploadingImages: false,
    submitting: false,
    isEditMode: false,
    leadId: ''
  },

  onLoad(options) {
    const userInfo = wx.getStorageSync('userInfo') || getApp().globalData.userInfo;
    if (userInfo && !options.leadId) {
      this.setData({
        name: userInfo.nickname || '',
        phone: userInfo.phone || ''
      });
    }

    if (options.leadId) {
      this.setData({ isEditMode: true, leadId: options.leadId });
      wx.setNavigationBarTitle({ title: '修改供需信息' });
      loadLeadForEdit(api, options.leadId, lead => {
        const details = lead.equipmentDetails || {};
        this.setData({
          leadType: lead.leadType || 'equipment_sell',
          name: lead.name,
          phone: lead.phone,
          equipmentName: details.equipmentName || lead.businessType || '',
          specText: details.specText || '',
          equipmentCondition: details.equipmentCondition || '',
          budgetRange: details.expectedPrice || lead.budgetRange || '',
          regionPreference: lead.regionPreference || '',
          remark: lead.remark || '',
          attachments: lead.attachments || []
        });
      });
    }
  },

  onTypeTap(e) { this.setData({ leadType: e.currentTarget.dataset.type }); },
  onInputName(e) { this.setData({ name: clip(e.detail.value, config.MAX_NAME_LENGTH) }); },
  onInputPhone(e) { this.setData({ phone: clip(e.detail.value, config.MAX_PHONE_LENGTH) }); },
  onInputEquipmentName(e) { this.setData({ equipmentName: clip(e.detail.value, config.MAX_TEXT_LENGTH) }); },
  onInputSpec(e) { this.setData({ specText: clip(e.detail.value, config.MAX_TEXT_LENGTH) }); },
  onInputCondition(e) { this.setData({ equipmentCondition: clip(e.detail.value, config.MAX_TEXT_LENGTH) }); },
  onInputBudget(e) { this.setData({ budgetRange: clip(e.detail.value, config.MAX_TEXT_LENGTH) }); },
  onInputRegion(e) { this.setData({ regionPreference: clip(e.detail.value, config.MAX_REGION_LENGTH) }); },
  onInputRemark(e) { this.setData({ remark: clip(e.detail.value, config.MAX_REMARK_LENGTH) }); },

  async onChooseImages() {
    if (this.data.uploadingImages) return;
    this.setData({ uploadingImages: true });
    try {
      const files = await upload.pickCompressAndUpload(this.data.attachments);
      this.setData({ attachments: this.data.attachments.concat(files) });
    } catch (err) {
      console.error(err);
      wx.showToast({ title: '图片上传失败', icon: 'none' });
    } finally {
      this.setData({ uploadingImages: false });
    }
  },

  onRemoveImage(e) {
    const index = e.currentTarget.dataset.index;
    this.setData({ attachments: this.data.attachments.filter((_, i) => i !== index) });
  },

  onPreviewAttachment(e) {
    const current = e.currentTarget.dataset.url;
    const urls = this.data.attachments.map(item => item.url || item.localPath).filter(Boolean);
    if (urls.length) wx.previewImage({ urls, current });
  },

  onSubmitForm() {
    const { leadType, name, phone, equipmentName, specText, equipmentCondition, budgetRange, regionPreference, remark, attachments, uploadingImages } = this.data;

    if (uploadingImages) {
      wx.showToast({ title: '图片仍在上传', icon: 'none' });
      return;
    }
    const nameError = validateName(name);
    if (nameError) {
      wx.showToast({ title: nameError, icon: 'none' });
      return;
    }
    if (!validatePhone(phone)) {
      wx.showToast({ title: '手机号格式不正确', icon: 'none' });
      return;
    }
    if (!equipmentName) {
      wx.showToast({ title: '请填写设备名称', icon: 'none' });
      return;
    }

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
        const userInfo = wx.getStorageSync('userInfo') || {};
        userInfo.nickname = name;
        userInfo.phone = phone;
        wx.setStorageSync('userInfo', userInfo);
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
