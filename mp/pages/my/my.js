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

    if (!editNickname) {
      wx.showToast({ title: '请先选择微信昵称', icon: 'none' });
      return;
    }
    if (!validatePhone(editPhone)) {
      wx.showToast({ title: '请授权获取微信手机号', icon: 'none' });
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
      title: '关于饭堂与商铺招租服务',
      content: '专注学校、工业园区、写字楼等封闭或半封闭物业，为经营者匹配饭堂档口与配套商铺，并提供需求登记、看铺沟通和顾问跟进服务。版本：v1.0.0',
      showCancel: false,
      confirmText: '我知道了'
    });
  },

});
