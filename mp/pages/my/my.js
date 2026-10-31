const app = getApp();
const api = require('../../services/api.js');
const { recentIds } = require('../../utils/recent.js');
const { clip, validatePhone, config } = require('../../utils/form.js');
const { authorizeWechatPhone, rememberContact } = require('../../utils/wechatContact.js');

Page({
  data: {
    userInfo: {
      nickname: '',
      avatarUrl: '/images/tab_my.png',
      phone: ''
    },
    favoriteCount: 0, recentCount: 0, leadCount: null,
    companyName: config.COMPANY_NAME,
    appName: config.APP_NAME,
    maxNameLength: config.MAX_NAME_LENGTH,
    maxPhoneLength: config.MAX_PHONE_LENGTH,
    miniProgramIcpNumber: config.MINIPROGRAM_ICP_NUMBER,
    showEditModal: false,
    editNickname: '',
    editPhone: '',
    phoneAuthorizing: false
  },

  onShow() {
    config.refreshRuntimeConfig();
    this.setData({ favoriteCount: (wx.getStorageSync('favorites') || []).length, recentCount: recentIds().length });
    api.getLeads().then(leads => this.setData({ leadCount: leads.length })).catch(() => this.setData({ leadCount: null }));
    const localInfo = wx.getStorageSync('userInfo');
    if (localInfo) {
      this.setData({
        userInfo: {
          ...this.data.userInfo,
          nickname: localInfo.nickname || '',
          phone: localInfo.phone || ''
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

  onProfilePhoneInput(e) {
    this.setData({ editPhone: clip(e.detail.value, config.MAX_PHONE_LENGTH) });
  },

  async onGetProfilePhone(e) {
    if (this.data.phoneAuthorizing) return;
    this.setData({ phoneAuthorizing: true });
    try {
      const phone = await authorizeWechatPhone(e);
      if (phone) this.setData({ editPhone: phone });
    } catch (error) {
      wx.showToast({ title: error.message || '手机号获取失败，请重试', icon: 'none' });
    } finally {
      this.setData({ phoneAuthorizing: false });
    }
  },

  onCancelEdit() {
    this.setData({ showEditModal: false });
  },

  noop() {},

  onSaveEdit() {
    if (this.data.phoneAuthorizing) return;
    const { editNickname, editPhone } = this.data;

    if (!validatePhone(editPhone)) {
      wx.showToast({ title: '请输入有效手机号或使用微信授权', icon: 'none' });
      return;
    }

    const updatedUser = {
      nickname: editNickname,
      phone: editPhone
    };

    rememberContact(updatedUser);

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

  onGoToRecent() {
    wx.setStorageSync('pendingListFilter', { recent: true });
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
      title: `关于${config.APP_NAME}`,
      content: `${config.COMPANY_NAME}运营。专注学校、工业园区、写字楼等物业的饭堂档口与配套商铺，为经营者提供需求登记和咨询对接服务。版本：v1.0.0`,
      showCancel: false,
      confirmText: '我知道了'
    });
  },

});
