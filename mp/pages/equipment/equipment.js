const api = require('../../services/api.js');
const upload = require('../../services/upload.js');

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

  onTypeTap(e) { this.setData({ leadType: e.currentTarget.dataset.type }); },
  onInputName(e) { this.setData({ name: e.detail.value.trim() }); },
  onInputPhone(e) { this.setData({ phone: e.detail.value.trim() }); },
  onInputEquipmentName(e) { this.setData({ equipmentName: e.detail.value.trim() }); },
  onInputSpec(e) { this.setData({ specText: e.detail.value.trim() }); },
  onInputCondition(e) { this.setData({ equipmentCondition: e.detail.value.trim() }); },
  onInputBudget(e) { this.setData({ budgetRange: e.detail.value.trim() }); },
  onInputRegion(e) { this.setData({ regionPreference: e.detail.value.trim() }); },
  onInputRemark(e) { this.setData({ remark: e.detail.value.trim() }); },

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
    if (!name) {
      wx.showToast({ title: '请输入称呼', icon: 'none' });
      return;
    }
    if (!/^1[3-9]\d{9}$/.test(phone)) {
      wx.showToast({ title: '手机号格式不正确', icon: 'none' });
      return;
    }
    if (!equipmentName) {
      wx.showToast({ title: '请填写设备名称', icon: 'none' });
      return;
    }

    this.setData({ submitting: true });
    api.submitEquipment({
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
