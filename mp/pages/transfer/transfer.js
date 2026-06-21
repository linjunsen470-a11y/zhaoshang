const api = require('../../services/api.js');
const upload = require('../../services/upload.js');

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
    submitting: false
  },

  onLoad() {
    const userInfo = wx.getStorageSync('userInfo') || getApp().globalData.userInfo;
    if (userInfo) {
      this.setData({
        name: userInfo.nickname || '',
        phone: userInfo.phone || ''
      });
    }
  },

  onInputName(e) { this.setData({ name: e.detail.value.trim() }); },
  onInputPhone(e) { this.setData({ phone: e.detail.value.trim() }); },
  onInputLocation(e) { this.setData({ locationText: e.detail.value.trim() }); },
  onInputBusiness(e) { this.setData({ businessType: e.detail.value.trim() }); },
  onInputFee(e) { this.setData({ feeText: e.detail.value.trim() }); },
  onInputTransferFee(e) { this.setData({ transferFee: e.detail.value.trim() }); },
  onInputTerm(e) { this.setData({ remainingTerm: e.detail.value.trim() }); },
  onInputRemark(e) { this.setData({ remark: e.detail.value.trim() }); },
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
    if (!name) {
      wx.showToast({ title: '请输入称呼', icon: 'none' });
      return;
    }
    if (!/^1[3-9]\d{9}$/.test(phone)) {
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
    api.submitTransfer({
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
    }).then(res => {
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
});
