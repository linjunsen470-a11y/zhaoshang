const api = require('../../services/api.js');

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

  onSubmitForm() {
    const { name, phone, locationText, businessType, feeText, transferFee, remainingTerm, includesEquipment, remark } = this.data;

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

    const combinedRemark = [
      `店铺位置：${locationText}`,
      feeText ? `面积与费用：${feeText}` : '',
      transferFee ? `转让费预期：${transferFee}` : '',
      remainingTerm ? `剩余合同期：${remainingTerm}` : '',
      `是否含设备：${includesEquipment ? '含设备' : '不含/待定'}`,
      remark ? `补充说明：${remark}` : ''
    ].filter(Boolean).join('\n');

    this.setData({ submitting: true });
    api.submitTransfer({
      name,
      phone,
      businessType,
      budgetRange: transferFee || '待评估',
      regionPreference: locationText,
      sourceChannel: 'mini_program',
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
