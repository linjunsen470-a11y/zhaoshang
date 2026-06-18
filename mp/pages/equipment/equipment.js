const api = require('../../services/api.js');

Page({
  data: {
    leadType: 'equipment_sell',
    name: '',
    phone: '',
    equipmentName: '',
    specText: '',
    budgetRange: '',
    regionPreference: '',
    remark: '',
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
  onInputBudget(e) { this.setData({ budgetRange: e.detail.value.trim() }); },
  onInputRegion(e) { this.setData({ regionPreference: e.detail.value.trim() }); },
  onInputRemark(e) { this.setData({ remark: e.detail.value.trim() }); },

  onSubmitForm() {
    const { leadType, name, phone, equipmentName, specText, budgetRange, regionPreference, remark } = this.data;

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

    const typeName = {
      equipment_sell: '出售设备',
      equipment_buy: '求购设备',
      equipment_recycle: '回收咨询'
    }[leadType];
    const combinedRemark = [
      `需求类型：${typeName}`,
      specText ? `数量/规格：${specText}` : '',
      budgetRange ? `预算/期望价格：${budgetRange}` : '',
      regionPreference ? `所在区域：${regionPreference}` : '',
      remark ? `补充说明：${remark}` : ''
    ].filter(Boolean).join('\n');

    this.setData({ submitting: true });
    api.submitEquipment({
      leadType,
      sourceChannel: 'mini_program',
      name,
      phone,
      businessType: equipmentName,
      budgetRange: budgetRange || '待评估',
      regionPreference,
      remark: combinedRemark
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
