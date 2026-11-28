const { options: commercialOptions } = require('../../utils/commercial.js');
const api = require('../../services/api.js');
const formBehavior = require('../../utils/formBehavior.js');
const { clip, config } = require('../../utils/form.js');
const { allowedValue, safeIdentifier } = require('../../utils/navigation.js');

Page({
  behaviors: [formBehavior],
  data: {
    requiredFields: [],
    businessScene: '',
    leadType: 'leasing',
    projectId: '',
    projectTitle: '',
    projectCover: '',
    projectCoverError: false,
    projectFeeText: '',
    regionPreference: ''
  },

  onLoad(options) {
    const leadId = safeIdentifier(options.leadId);
    const projectId = safeIdentifier(options.projectId);
    wx.setNavigationBarTitle({ title: leadId ? '编辑找铺需求' : (projectId ? '咨询房源' : '帮我找铺') });
    this.initCommonData({ ...options, leadId }, lead => this.setData({
      leadType: lead.leadType || 'leasing',
      projectId: lead.projectId || '',
      projectTitle: lead.projectTitle || '',
      regionPreference: lead.regionPreference || '',
      businessScene: lead.businessScene || ''
    }));
    if (!leadId) {
      const businessScene = allowedValue(options.businessScene, commercialOptions.scenes.map(scene => scene.value), '');
      this.setData({ businessScene });
      if (projectId) {
        this.setData({ projectId });
        this.loadProjectTitle(projectId);
      } else {
        const rent = commercialOptions.rents.find(item => item.value === options.rent);
        const area = commercialOptions.areas.find(item => item.value === options.area);
        const preferences = [];
        if (!businessScene && options.sceneGroup === 'workplace') preferences.push('园区或写字楼');
        if (rent) preferences.push('基础月租' + rent.label);
        if (area) preferences.push('面积' + area.label);
        this.setData({
          regionPreference: allowedValue(options.district, commercialOptions.districts),
          remark: preferences.join('，')
        });
      }
    }
  },

  loadProjectTitle(id) {
    this.setData({ projectLoading: true, projectLoadError: false });
    api.getProjectDetail(id).then(project => {
      if (!project) throw new Error('项目暂不可用');
      this.setData({
        projectTitle: project.title,
        businessScene: project.businessScene || '',
        projectCover: project.coverImage || '',
        projectCoverError: false,
        projectFeeText: project.priceText || project.feeText || '',
        projectLoading: false
      });
    }).catch(err => {
      console.error('获取项目标题失败', err);
      this.setData({ projectLoading: false, projectLoadError: true });
    });
  },

  onProjectCoverError() { this.setData({ projectCoverError: true }); },
  onInputRegion(e) { this.setData({ regionPreference: clip(e.detail.value, config.MAX_REGION_LENGTH) }); },

  onSubmitForm() {
    if (!this.validateCommonForm()) return;
    const { name, phone, projectId, regionPreference, remark, businessScene } = this.data;
    const payload = {
      leadType: 'leasing',
      businessScene,
      sourceChannel: 'mini_program',
      name,
      phone,
      projectId: projectId || undefined,
      regionPreference: projectId ? undefined : regionPreference,
      remark
    };
    this.saveUserInfo();
    this.setData({ submitting: true });
    const request = this.data.isEditMode ? api.updateLead(this.data.leadId, payload) : api.submitLead(this.createSubmission(payload));
    request.then(res => {
      if (this.data.isEditMode) {
        this.finishEditing();
      } else {
        this.finishCreating(res);
      }
    }).catch(err => {
      console.error(err);
      this.setData({ submitting: false });
      wx.showModal({ title: this.data.isEditMode ? '修改失败' : '提交失败', content: err.message || '请稍后重试', showCancel: false });
    });
  }
});
