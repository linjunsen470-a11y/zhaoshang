const api = require('../services/api.js');
const upload = require('../services/upload.js');
const { normalizeAttachments, previewUrls } = require('./attachment.js');
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
    privacyAccepted: false,
    fieldErrors: {},
    focusField: '',
    formLoading: false,
    formLoadError: false
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
        this.setData({ isEditMode: true, leadId: options.leadId, formLoading: true, formLoadError: false });
        loadLeadForEdit(api, options.leadId, lead => {
          this.setData({
            formLoading: false,
            name: lead.name,
            phone: lead.phone,
            remark: lead.remark || '',
            attachments: normalizeAttachments(lead.attachments)
          });
          if (onLeadLoaded) onLeadLoaded(lead);
        }, () => this.setData({ formLoading: false, formLoadError: true }));
      }
    },

    onInputName(e) {
      this.clearFieldError('name');
      this.setData({ name: clip(e.detail.value, config.MAX_NAME_LENGTH) });
    },

    onInputPhone(e) {
      this.clearFieldError('phone');
      this.setData({ phone: clip(e.detail.value, config.MAX_PHONE_LENGTH) });
    },

    onInputRemark(e) {
      this.setData({ remark: clip(e.detail.value, config.MAX_REMARK_LENGTH) });
    },

    onTogglePrivacy() {
      this.clearFieldError('privacy');
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
        this.setData({ attachments: normalizeAttachments(this.data.attachments.concat(files)) });
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

    onAttachmentError(e) {
      const index = Number(e.currentTarget.dataset.index);
      if (this.data.attachments[index]) this.setData({ [`attachments[${index}].imageError`]: true });
    },

    onRetryForm() { this.onLoad({ leadId: this.data.leadId, projectId: this.data.projectId }); },

    clearFieldError(field) {
      if (this.data.fieldErrors[field]) this.setData({ [`fieldErrors.${field}`]: '' });
    },

    showFieldError(field, message) {
      this.setData({ fieldErrors: { ...this.data.fieldErrors, [field]: message }, focusField: field });
      wx.pageScrollTo({ selector: '#field-' + field, offsetTop: -24, duration: 180 });
      return false;
    },

    onPreviewAttachment(e) {
      const current = e.currentTarget.dataset.url;
      const urls = previewUrls(this.data.attachments);
      if (urls.length) wx.previewImage({ urls, current: urls.includes(current) ? current : urls[0] });
    },

    validateCommonForm() {
      if (this.data.submitting) return false;
      if (this.data.formLoading || this.data.projectLoading || this.data.formLoadError || this.data.projectLoadError) {
        wx.showToast({ title: '请先重新加载咨询信息', icon: 'none' });
        return false;
      }
      const { name, phone, uploadingImages, isEditMode } = this.data;
      if (uploadingImages) {
        wx.showToast({ title: '图片仍在上传', icon: 'none' });
        return false;
      }
      const errors = {};
      (this.data.requiredFields || []).forEach(field => { if (!String(this.data[field.key] || '').trim()) errors[field.key] = field.message; });
      const nameError = validateName(name);
      if (nameError) errors.name = nameError;
      if (!validatePhone(phone)) errors.phone = '请输入正确的 11 位手机号';
      if (!isEditMode) {
        const privacyError = validatePrivacyConsent(this.data.privacyAccepted);
        if (privacyError) {
          errors.privacy = privacyError;
        }
      }
      this.setData({ fieldErrors: errors, focusField: '' });
      const first = Object.keys(errors)[0];
      if (first) return this.showFieldError(first, errors[first]);
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
