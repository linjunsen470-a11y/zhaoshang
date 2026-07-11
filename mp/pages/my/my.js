const app = getApp();
const { clip, validatePhone, config } = require('../../utils/form.js');

Page({
  data: {
    userInfo: {
      nickname: '',
      avatarUrl: '/images/tab_my.png',
      phone: ''
    },
    showEditModal: false,
    editNickname: '',
    editPhone: ''
  },

  onShow() {
    const localInfo = wx.getStorageSync('userInfo');
    if (localInfo) {
      this.setData({
        userInfo: {
          ...this.data.userInfo,
          nickname: localInfo.nickname || this.data.userInfo.nickname,
          phone: localInfo.phone || this.data.userInfo.phone
        }
      });
    } else {
      this.setData({ userInfo: app.globalData.userInfo });
    }
  },

  onEditProfile() {
    this.setData({
      showEditModal: true,
      editNickname: this.data.userInfo.nickname,
      editPhone: this.data.userInfo.phone
    });
  },

  onNicknameInput(e) {
    this.setData({ editNickname: clip(e.detail.value, config.MAX_NAME_LENGTH) });
  },

  onPhoneInput(e) {
    this.setData({ editPhone: clip(e.detail.value, config.MAX_PHONE_LENGTH) });
  },

  onCancelEdit() {
    this.setData({ showEditModal: false });
  },

  onSaveEdit() {
    const { editNickname, editPhone } = this.data;

    if (!editNickname) {
      wx.showToast({ title: '昵称不能为空', icon: 'none' });
      return;
    }
    if (!validatePhone(editPhone)) {
      wx.showToast({ title: '手机号格式不正确', icon: 'none' });
      return;
    }

    const updatedUser = {
      nickname: editNickname,
      phone: editPhone
    };

    wx.setStorageSync('userInfo', updatedUser);
    app.globalData.userInfo.nickname = editNickname;
    app.globalData.userInfo.phone = editPhone;

    this.setData({
      userInfo: {
        ...this.data.userInfo,
        nickname: editNickname,
        phone: editPhone
      },
      showEditModal: false
    });

    wx.showToast({ title: '信息更新成功', icon: 'success' });
  },

  onGoToLeads() {
    wx.navigateTo({ url: '/pages/leads/leads' });
  },

  onGoToFavorites() {
    wx.setStorageSync('pendingListFilter', { favs: true });
    wx.switchTab({ url: '/pages/list/list' });
  },

  onCallService() {
    getApp().callAdvisor();
  },

  onGoToPrivacy() {
    wx.navigateTo({ url: '/pages/privacy/privacy' });
  },

  onShowAbout() {
    wx.showModal({
      title: '关于学校招商宝',
      content: '学校商铺招商宝是一款专注于高校食堂档口、商业街铺位、校内外服务网点的信息展示与意向线索对接平台。版本：v1.0.0',
      showCancel: false,
      confirmText: '我知道了'
    });
  },

});
