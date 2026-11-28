const { allowedValue, safeIdentifier } = require('../../utils/navigation.js');
const { getLeadTypeLabel } = require('../../utils/form.js');

const nextSteps = {
  leasing: '顾问会联系你核对找铺需求，沟通合适的房源和看铺安排。',
  transfer: '顾问会联系你核实店铺位置和转让条件，再协助对接意向方。',
  equipment_sell: '顾问会核实设备资料，审核通过后可公开展示出售信息。',
  equipment_buy: '顾问会联系你确认需要的设备和规格，再协助匹配。',
  equipment_recycle: '顾问会联系你确认设备情况和回收需求。',
  renovation_consult: '顾问会联系你了解场地情况和装修需求。'
};

Page({
  data: {
    title: '咨询已提交',
    nextStep: '顾问已收到你的需求，你可以查看记录或补充信息。',
    leadId: ''
  },

  onLoad(options) {
    const type = allowedValue(options.leadType, Object.keys(nextSteps));
    this.setData({
      leadId: safeIdentifier(options.leadId),
      title: type ? getLeadTypeLabel(type) + '已提交' : this.data.title,
      nextStep: type ? nextSteps[type] : this.data.nextStep
    });
  },

  onViewLeads() {
    const query = this.data.leadId ? '?leadId=' + this.data.leadId : '';
    wx.navigateTo({ url: '/pages/leads/leads' + query });
  },

  onGoHome() {
    wx.switchTab({ url: '/pages/index/index' });
  },

  onCallAdvisor() {
    getApp().callAdvisor();
  }
});
