const { options: commercialOptions } = require('../../utils/commercial.js');
const api = require('../../services/api.js');
const formBehavior = require('../../utils/formBehavior.js');
const { clip, config } = require('../../utils/form.js');
const { attachmentIds } = require('../../utils/attachment.js');
const { allowedValue, safeIdentifier } = require('../../utils/navigation.js');

Page({
  behaviors: [formBehavior],
  data: {
    requiredFields: [{ key: 'businessType', message: '请选择经营品类' }, { key: 'budgetRange', message: '请选择投资预算' }],
    businessScene: '',
    scenes: [{ label: '不限', value: '' }, ...commercialOptions.scenes],
    sceneIndex: 0,
    workplaceHint: false,
    leadType: 'leasing',
    projectId: '',
    projectTitle: '',
    projectCover: '',
    projectCoverError: false,
    projectFeeText: '',
    businessType: '',
    budgetRange: '',
    regionPreference: '',
    hasCampusExperience: false,
    businesses: commercialOptions.businesses,
    budgets: ['5万以内', '5-10万', '10-20万', '20-50万', '50万以上', '暂不确定'],
    businessIndex: -1,
    budgetIndex: -1
  },

  onLoad(options) {
    const leadId = safeIdentifier(options.leadId);
    wx.setNavigationBarTitle({ title: leadId ? '编辑找铺需求' : (options.projectId ? '咨询房源' : '帮我找铺') });
    const projectId = safeIdentifier(options.projectId);
    this.initCommonData({ ...options, leadId }, lead => {
      const businessIndex = this.data.businesses.indexOf(lead.businessType);
      const budgetIndex = this.data.budgets.indexOf(lead.budgetRange);
      this.setData({
        leadType: lead.leadType || 'leasing',
        projectId: lead.projectId || '',
        projectTitle: lead.projectTitle || '',
        businessType: lead.businessType,
        budgetRange: lead.budgetRange,
        regionPreference: lead.regionPreference || '',
        hasCampusExperience: lead.hasCampusExperience || false,
        businessScene: lead.businessScene || '',
        sceneIndex: Math.max(0, this.data.scenes.findIndex(s => s.value === lead.businessScene)),
        businessIndex,
        budgetIndex
      });
    });

    if (!leadId) {
      const businessScene = allowedValue(options.businessScene, commercialOptions.scenes.map(scene => scene.value), '');
      this.setData({ leadType: allowedValue(options.leadType, ['leasing'], 'leasing'), businessScene, sceneIndex: Math.max(0, this.data.scenes.findIndex(scene => scene.value === businessScene)), workplaceHint: options.sceneGroup === 'workplace' && !businessScene });
    }
    if (!leadId && projectId) {
      this.setData({ projectId });
      this.loadProjectTitle(projectId);
    }
  },

  loadProjectTitle(id) {
    this.setData({ projectLoading: true, projectLoadError: false });
    api.getProjectDetail(id)
      .then(project => {
        if (!project) throw new Error('项目暂不可用');
        if (project) {
          this.setData({
            projectTitle: project.title,
            businessScene: project.businessScene || '',
            sceneIndex: Math.max(0, this.data.scenes.findIndex(s => s.value === project.businessScene)),
            projectCover: project.coverImage || '',
            projectCoverError: false,
            projectFeeText: project.priceText || project.feeText || '',
            projectLoading: false,
            regionPreference: project.district
          });
        }
      })
      .catch(err => { console.error('获取项目标题失败', err); this.setData({ projectLoading: false, projectLoadError: true }); });
  },

  onProjectCoverError() {
    this.setData({ projectCoverError: true });
  },

  onSceneChange(e) {
    const sceneIndex = Number(e.detail.value);
    this.setData({ sceneIndex, businessScene: this.data.scenes[sceneIndex].value });
  },
  onInputRegion(e) { this.clearFieldError('regionPreference'); this.setData({ regionPreference: clip(e.detail.value, config.MAX_REGION_LENGTH) }); },
  onBusinessChange(e) { this.clearFieldError('businessType');
    const val = e.detail.value;
    this.setData({ businessIndex: val, businessType: this.data.businesses[val] });
  },
  onBudgetChange(e) { this.clearFieldError('budgetRange');
    const val = e.detail.value;
    this.setData({ budgetIndex: val, budgetRange: this.data.budgets[val] });
  },
  onExperienceChange(e) {
    this.setData({ hasCampusExperience: e.detail.value === 'true' });
  },

  onClearForm() {
    wx.showModal({ title: '清空已填写的内容？', content: '清空后需要重新填写，当前咨询对象会保留。', confirmText: '清空', success: res => { if (res.confirm) this.clearFormFields(); } });
  },

  clearFormFields() {
    this.setData({
      fieldErrors: {},
      focusField: '',
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
    if (!this.validateCommonForm()) return;

    const { leadType, name, phone, businessType, budgetRange, projectId, regionPreference, hasCampusExperience, remark, attachments } = this.data;

    if (!businessType) {
      wx.showToast({ title: '请选择经营品类', icon: 'none' });
      return;
    }
    if (!budgetRange) {
      wx.showToast({ title: '请选择投资预算', icon: 'none' });
      return;
    }

    this.saveUserInfo();
    this.setData({ submitting: true });
    const payload = {
      leadType,
      businessScene: this.data.businessScene,
      sourceChannel: 'mini_program',
      name,
      phone,
      businessType,
      budgetRange,
      projectId: projectId || undefined,
      regionPreference: regionPreference || undefined,
      hasCampusExperience,
      remark: remark || undefined,
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
            content: err.message || '网络拥堵，请稍后重试',
            showCancel: false
          });
        });
    } else {
      api.submitLead(payload).then(res => {
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
