const api = require('../services/api.js');
const upload = require('../services/upload.js');
const {
  clip,
  validatePhone,
  validateName,
  validatePrivacyConsent,
  rememberPrivacyConsent,
  hasPrivacyConsent,
  loadLeadForEdit,
  config
} = require('./form.js');

module.exports = Behavior({
  data: {
    name: '',
    phone: '',
    remark: '',
    attachments: [],
    uploadingImages: false,
    submitting: false,
    isEditMode: false,
    leadId: '',
    privacyAccepted: false
  },
  methods: {
    initCommonData(options, onLeadLoaded) {
      this.setData({ privacyAccepted: hasPrivacyConsent() });
      const userInfo = wx.getStorageSync('userInfo') || (getApp().globalData && getApp().globalData.userInfo);
      if (userInfo && !options.leadId) {
        this.setData({
          name: userInfo.nickname || '',
          phone: userInfo.phone || ''
        });
      }

      if (options.leadId) {
        this.setData({ isEditMode: true, leadId: options.leadId });
        loadLeadForEdit(api, options.leadId, lead => {
          this.setData({
            name: lead.name,
            phone: lead.phone,
            remark: lead.remark || '',
            attachments: lead.attachments || []
          });
          if (onLeadLoaded) onLeadLoaded(lead);
        });
      }
    },

    onInputName(e) {
      this.setData({ name: clip(e.detail.value, config.MAX_NAME_LENGTH) });
    },

    onInputPhone(e) {
      this.setData({ phone: clip(e.detail.value, config.MAX_PHONE_LENGTH) });
    },

    onInputRemark(e) {
      this.setData({ remark: clip(e.detail.value, config.MAX_REMARK_LENGTH) });
    },

    onTogglePrivacy() {
      this.setData({ privacyAccepted: !this.data.privacyAccepted });
    },

    onGoPrivacy() {
      wx.navigateTo({ url: '/pages/privacy/privacy' });
    },

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

    validateCommonForm() {
      const { name, phone, uploadingImages } = this.data;
      if (uploadingImages) {
        wx.showToast({ title: '图片仍在上传', icon: 'none' });
        return false;
      }
      const nameError = validateName(name);
      if (nameError) {
        wx.showToast({ title: nameError, icon: 'none' });
        return false;
      }
      if (!validatePhone(phone)) {
        wx.showToast({ title: '手机号格式不正确', icon: 'none' });
        return false;
      }
      const privacyError = validatePrivacyConsent(this.data.privacyAccepted);
      if (privacyError) {
        wx.showToast({ title: privacyError, icon: 'none' });
        return false;
      }
      return true;
    },

    saveUserInfo() {
      const { name, phone } = this.data;
      rememberPrivacyConsent();
      const userInfo = wx.getStorageSync('userInfo') || {};
      userInfo.nickname = name;
      userInfo.phone = phone;
      wx.setStorageSync('userInfo', userInfo);

      const app = getApp();
      if (app && app.globalData && app.globalData.userInfo) {
        app.globalData.userInfo.phone = phone;
        app.globalData.userInfo.nickname = name;
      }
    }
  }
});
