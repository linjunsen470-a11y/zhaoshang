const api = require('../../services/api.js');
const { snapshot, subscribeFavorites, syncFavorites } = require('../../utils/favorites.js');
const { clip, validatePhone, config } = require('../../utils/form.js');
const { rememberContact } = require('../../utils/wechatContact.js');

async function readAvatar(path) {
  const source = await new Promise(resolve => wx.compressImage({
    src: path, quality: 80, compressedWidth: 256,
    success: result => resolve(result.tempFilePath), fail: () => resolve(path)
  }));
  const data = await new Promise((resolve, reject) => wx.getFileSystemManager().readFile({
    filePath: source, encoding: 'base64', success: result => resolve(result.data), fail: reject
  }));
  if (data.length > 780 * 1024) throw new Error('头像过大，请换一张图片');
  return data;
}

Page({
  data: {
    userInfo: {
      nickname: '',
      avatar: '',
      phone: ''
    },
    favoriteCount: 0, favoriteSyncStatus: 'idle', leadCount: null,
    companyName: config.COMPANY_NAME,
    appName: config.APP_NAME,
    maxNameLength: config.MAX_NAME_LENGTH,
    maxPhoneLength: config.MAX_PHONE_LENGTH,
    miniProgramIcpNumber: config.MINIPROGRAM_ICP_NUMBER,
    showEditModal: false,
    editNickname: '',
    editPhone: '',
    editAvatar: '',
    hasPhoneCode: false,
    profileStatus: 'loading',
    saving: false
  },

  onShow() {
    this._privacyTapAt = 0;
    if (!this._unsubscribeFavorites) this._unsubscribeFavorites = subscribeFavorites(value => this.updateFavorites(value));
    this.updateFavorites(snapshot());
    syncFavorites().catch(() => {});
    const owner = wx.getStorageSync('authOpenId') || config.DEV_OPEN_ID;
    if (!this.data.showEditModal && (!this._profileRequest || this._lastSeenOwner !== owner)) this.loadProfile();
    api.getLeadPage(1, 1).then(result => this.setData({ leadCount: result.totalDocs })).catch(() => this.setData({ leadCount: null }));
  },

  async loadProfile() {
    const requestId = this._profileRequest = (this._profileRequest || 0) + 1;
    this._lastSeenOwner = wx.getStorageSync('authOpenId') || config.DEV_OPEN_ID;
    this._owner = '';
    this.setData({ profileStatus: 'loading', userInfo: { nickname: '', phone: '', avatar: '' } });
    try {
      const { owner, profile } = await api.getProfile();
      if (requestId !== this._profileRequest) return;
      this._owner = owner;
      this._lastSeenOwner = owner;
      this.setData({ profileStatus: 'ready', userInfo: profile });
      if (this.data.showEditModal) this.startDraft();
    } catch {
      if (requestId === this._profileRequest) this.setData({ profileStatus: 'error' });
    }
  },

  onHide() {
    if (this._unsubscribeFavorites) this._unsubscribeFavorites();
    this._unsubscribeFavorites = null;
  },

  updateFavorites(value) {
    if (this.data.favoriteCount !== value.ids.length || this.data.favoriteSyncStatus !== value.status)
      this.setData({ favoriteCount: value.ids.length, favoriteSyncStatus: value.status });
  },

  onEditProfile() {
    this.startDraft();
    this.setData({ showEditModal: true });
    if (this.data.profileStatus === 'error') this.loadProfile();
  },

  startDraft() {
    this._phoneCode = '';
    this._avatarPath = '';
    const { nickname, phone, avatar } = this.data.userInfo;
    this.setData({ editNickname: nickname, editPhone: phone, editAvatar: avatar, hasPhoneCode: false });
  },

  onChooseAvatar(e) {
    const path = e.detail.avatarUrl;
    if (!path || this.data.saving) return;
    this._avatarPath = path;
    this.setData({ editAvatar: path });
  },

  onRemoveAvatar() {
    this._avatarPath = '';
    this.setData({ editAvatar: '' });
  },

  onNicknameInput(e) {
    this.setData({ editNickname: clip(e.detail.value, config.MAX_NAME_LENGTH) });
  },

  onProfilePhoneInput(e) {
    this._phoneCode = '';
    this.setData({ editPhone: clip(e.detail.value, config.MAX_PHONE_LENGTH), hasPhoneCode: false });
  },

  onGetProfilePhone(e) {
    if (this.data.saving || /deny|cancel/i.test(e.detail.errMsg || '')) return;
    if (!e.detail.code) return wx.showToast({ title: '未取得手机号，请重试', icon: 'none' });
    this._phoneCode = e.detail.code;
    this.setData({ hasPhoneCode: true });
  },

  onCancelEdit() {
    if (this.data.saving) return;
    this.startDraft();
    this.setData({ showEditModal: false });
  },

  noop() {},

  async onSaveEdit() {
    if (this.data.saving || this.data.profileStatus !== 'ready') return;
    const { editNickname, editPhone, editAvatar, userInfo } = this.data;
    if (!this._phoneCode && editPhone && !validatePhone(editPhone)) {
      wx.showToast({ title: '请输入有效手机号或使用微信授权', icon: 'none' });
      return;
    }
    this.setData({ saving: true });
    try {
      const changes = {};
      if (editNickname !== userInfo.nickname) changes.nickname = editNickname;
      if (this._phoneCode) changes.phoneCode = this._phoneCode;
      else if (editPhone !== userInfo.phone) changes.phone = editPhone;
      if (this._avatarPath) changes.avatar = await readAvatar(this._avatarPath);
      else if (!editAvatar && userInfo.avatar) changes.avatar = '';
      const profile = Object.keys(changes).length ? await api.saveProfile(changes, this._owner) : userInfo;
      this.setData({ userInfo: profile, showEditModal: false });
      this.startDraft();
      rememberContact({ nickname: profile.nickname, phone: profile.phone });
      wx.showToast({ title: '资料已保存', icon: 'success' });
    } catch (error) {
      wx.showToast({ title: error.message || '保存失败，请重试', icon: 'none' });
    } finally {
      this.setData({ saving: false });
    }
  },

  onGoToPrivacy() {
    const now = Date.now();
    if (now - (this._privacyTapAt || 0) < 600) return;
    this._privacyTapAt = now;
    wx.navigateTo({
      url: '/pages/privacy/privacy',
      fail: () => {
        this._privacyTapAt = 0;
        wx.showToast({ title: '页面未打开，请重试', icon: 'none' });
      }
    });
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

  onShowAbout() {
    const { version } = wx.getAccountInfoSync().miniProgram;
    wx.showModal({
      title: `关于${config.APP_NAME}`,
      content: `${config.COMPANY_NAME}运营。专注学校、工业园区、写字楼等物业的饭堂档口与配套商铺，为经营者提供需求登记和咨询对接服务。${version ? '版本：' + version : ''}`,
      showCancel: false,
      confirmText: '我知道了'
    });
  },

});
