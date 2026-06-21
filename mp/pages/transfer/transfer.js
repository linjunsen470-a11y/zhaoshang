const api = require('../../services/api.js');
const upload = require('../../services/upload.js');
const { clip, validatePhone, validateName, loadLeadForEdit, config } = require('../../utils/form.js');

Page({
  data: {
    name: '',
    phone: '',
    locationText: '',
    businessType: '',
    feeText: '',
    transferFee: '',
    remainingTerm: '',
    includesEquipment: true,
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
      wx.setNavigationBarTitle({ title: '修改转让信息' });
      loadLeadForEdit(api, options.leadId, lead => {
        const details = lead.transferDetails || {};
        this.setData({
          name: lead.name,
          phone: lead.phone,
          locationText: details.locationText || lead.regionPreference || '',
          businessType: lead.businessType,
          feeText: details.feeText || '',
          transferFee: details.transferFee || lead.budgetRange || '',
          remainingTerm: details.remainingTerm || '',
          includesEquipment: details.includesEquipment !== undefined ? details.includesEquipment : true,
          remark: lead.remark || '',
          attachments: lead.attachments || []
        });
      });
    }
  },

  onInputName(e) { this.setData({ name: clip(e.detail.value, config.MAX_NAME_LENGTH) }); },
  onInputPhone(e) { this.setData({ phone: clip(e.detail.value, config.MAX_PHONE_LENGTH) }); },
  onInputLocation(e) { this.setData({ locationText: clip(e.detail.value, config.MAX_REGION_LENGTH) }); },
  onInputBusiness(e) { this.setData({ businessType: clip(e.detail.value, config.MAX_TEXT_LENGTH) }); },
  onInputFee(e) { this.setData({ feeText: clip(e.detail.value, config.MAX_TEXT_LENGTH) }); },
  onInputTransferFee(e) { this.setData({ transferFee: clip(e.detail.value, config.MAX_TEXT_LENGTH) }); },
  onInputTerm(e) { this.setData({ remainingTerm: clip(e.detail.value, config.MAX_TEXT_LENGTH) }); },
  onInputRemark(e) { this.setData({ remark: clip(e.detail.value, config.MAX_REMARK_LENGTH) }); },
  onEquipmentIncludedChange(e) { this.setData({ includesEquipment: e.detail.value === 'true' }); },

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
    const { name, phone, locationText, businessType, feeText, transferFee, remainingTerm, includesEquipment, remark, attachments, uploadingImages } = this.data;

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
    if (!locationText) {
      wx.showToast({ title: '请填写店铺位置', icon: 'none' });
      return;
    }
    if (!businessType) {
      wx.showToast({ title: '请填写当前业态', icon: 'none' });
      return;
    }

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
