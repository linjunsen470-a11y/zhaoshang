const api = require('../../services/api.js');
const formBehavior = require('../../utils/formBehavior.js');
const { clip, config } = require('../../utils/form.js');

Page({
  behaviors: [formBehavior],
  data: {
    leadType: 'leasing',
    projectId: '',
    projectTitle: '',
    projectCover: '',
    projectFeeText: '',
    businessType: '',
    budgetRange: '',
    regionPreference: '',
    hasCampusExperience: false,
    businesses: ['快餐', '粉面', '小吃', '奶茶', '咖啡', '便利店', '水果', '文具', '打印', '快递', '维修', '洗衣', '其他'],
    budgets: ['5万以内', '5-10万', '10-20万', '20-50万', '50万以上', '暂不确定'],
    businessIndex: -1,
    budgetIndex: -1
  },

  onLoad(options) {
    this.initCommonData(options, lead => {
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
        businessIndex,
        budgetIndex
      });
    });

    if (options.leadType) this.setData({ leadType: options.leadType });
    if (options.projectId) {
      this.setData({ projectId: options.projectId });
      this.loadProjectTitle(options.projectId);
    }
  },

  loadProjectTitle(id) {
    api.getProjectDetail(id)
      .then(project => {
        if (project) {
          this.setData({
            projectTitle: project.title,
            projectCover: project.coverImage || '',
            projectFeeText: project.feeText || '',
            regionPreference: project.district
          });
        }
      })
      .catch(err => console.error('获取项目标题失败', err));
  },

  onInputRegion(e) { this.setData({ regionPreference: clip(e.detail.value, config.MAX_REGION_LENGTH) }); },
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
