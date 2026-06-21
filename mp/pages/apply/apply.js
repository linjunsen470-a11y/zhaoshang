const api = require('../../services/api.js');
const upload = require('../../services/upload.js');
const { clip, validatePhone, validateName, loadLeadForEdit, config } = require('../../utils/form.js');

Page({
  data: {
    leadType: 'leasing',
    projectId: '',
    projectTitle: '',
    name: '',
    phone: '',
    businessType: '',
    budgetRange: '',
    regionPreference: '',
    hasCampusExperience: false,
    remark: '',
    attachments: [],
    uploadingImages: false,
    businesses: ['快餐', '粉面', '小吃', '奶茶', '咖啡', '便利店', '水果', '文具', '打印', '快递', '维修', '洗衣', '其他'],
    budgets: ['5万以内', '5-10万', '10-20万', '20-50万', '50万以上', '暂不确定'],
    businessIndex: -1,
    budgetIndex: -1,
    submitting: false,
    isEditMode: false,
    leadId: ''
  },

  onLoad(options) {
    if (options.leadType) this.setData({ leadType: options.leadType });
    if (options.projectId) {
      this.setData({ projectId: options.projectId });
      this.loadProjectTitle(options.projectId);
    }
    if (options.from === 'budget') {
      this.setData({
        remark: '希望顾问协助做开店预算测算，并匹配适合预算的校园铺位。'
      });
    }

    const userInfo = wx.getStorageSync('userInfo') || getApp().globalData.userInfo;
    if (userInfo && !options.leadId) {
      this.setData({
        name: userInfo.nickname || '',
        phone: userInfo.phone || ''
      });
    }

    if (options.leadId) {
      this.setData({ isEditMode: true, leadId: options.leadId });
      wx.setNavigationBarTitle({ title: '修改咨询信息' });
      loadLeadForEdit(api, options.leadId, lead => {
        const businessIndex = this.data.businesses.indexOf(lead.businessType);
        const budgetIndex = this.data.budgets.indexOf(lead.budgetRange);
        this.setData({
          leadType: lead.leadType || 'leasing',
          projectId: lead.projectId || '',
          projectTitle: lead.projectTitle || '',
          name: lead.name,
          phone: lead.phone,
          businessType: lead.businessType,
          budgetRange: lead.budgetRange,
          regionPreference: lead.regionPreference || '',
          hasCampusExperience: lead.hasCampusExperience || false,
          remark: lead.remark || '',
          attachments: lead.attachments || [],
          businessIndex,
          budgetIndex
        });
      });
    }
  },

  loadProjectTitle(id) {
    api.getProjectDetail(id)
      .then(project => {
        if (project) {
          this.setData({
            projectTitle: project.title,
            regionPreference: project.district
          });
        }
      })
      .catch(err => console.error('获取项目标题失败', err));
  },

  onInputName(e) { this.setData({ name: clip(e.detail.value, config.MAX_NAME_LENGTH) }); },
  onInputPhone(e) { this.setData({ phone: clip(e.detail.value, config.MAX_PHONE_LENGTH) }); },
  onInputRegion(e) { this.setData({ regionPreference: clip(e.detail.value, config.MAX_REGION_LENGTH) }); },
  onInputRemark(e) { this.setData({ remark: clip(e.detail.value, config.MAX_REMARK_LENGTH) }); },
  onBusinessChange(e) {
    const val = e.detail.value;
    this.setData({ businessIndex: val, businessType: this.data.businesses[val] });
  },
  onBudgetChange(e) {
    const val = e.detail.value;
    this.setData({ budgetIndex: val, budgetRange: this.data.budgets[val] });
  },
  onExperienceChange(e) {
    this.setData({ hasCampusExperience: e.detail.value === 'true' });
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
    const attachments = this.data.attachments.filter((_, i) => i !== index);
    this.setData({ attachments });
  },

  onPreviewAttachment(e) {
    const current = e.currentTarget.dataset.url;
    const urls = this.data.attachments.map(item => item.url || item.localPath).filter(Boolean);
    if (urls.length) wx.previewImage({ urls, current });
  },

  onClearForm() {
    this.setData({
      name: '',
      phone: '',
      businessType: '',
      budgetRange: '',
      regionPreference: '',
      hasCampusExperience: false,
      remark: '',
      attachments: [],
      businessIndex: -1,
      budgetIndex: -1
    });
    wx.showToast({ title: '表单已清空', icon: 'none' });
  },

  onSubmitForm() {
    const { leadType, name, phone, businessType, budgetRange, projectId, regionPreference, hasCampusExperience, remark, attachments, uploadingImages } = this.data;

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
    if (!businessType) {
      wx.showToast({ title: '请选择经营品类', icon: 'none' });
      return;
    }
    if (!budgetRange) {
      wx.showToast({ title: '请选择投资预算', icon: 'none' });
      return;
    }

    this.setData({ submitting: true });
    const payload = {
      leadType,
      sourceChannel: 'mini_program',
      name,
      phone,
      businessType,
      budgetRange,
      projectId: projectId || undefined,
      regionPreference: regionPreference || undefined,
      hasCampusExperience,
      remark: remark || undefined,
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
            content: err.message || '网络拥堵，请稍后重试',
            showCancel: false
          });
        });
    } else {
      api.submitLead(payload).then(res => {
        const userInfo = wx.getStorageSync('userInfo') || {};
        userInfo.nickname = name;
        userInfo.phone = phone;
        wx.setStorageSync('userInfo', userInfo);
        getApp().globalData.userInfo.phone = phone;
        getApp().globalData.userInfo.nickname = name;
        this.setData({ submitting: false });
        wx.navigateTo({ url: `/pages/success/success?projectId=${projectId || ''}&leadId=${res.id}` });
      }).catch(err => {
        console.error(err);
        this.setData({ submitting: false });
        wx.showModal({
          title: '提交失败',
          content: '网络拥堵，请稍后重试',
          showCancel: false
        });
      });
    }
  }
});
