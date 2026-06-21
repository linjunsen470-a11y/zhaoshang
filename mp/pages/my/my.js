const app = getApp();

Page({
  data: {
    userInfo: {
      nickname: '商户老板',
      avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=100&q=80',
      phone: '13800138000'
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
    this.setData({ editNickname: e.detail.value.trim() });
  },

  onPhoneInput(e) {
    this.setData({ editPhone: e.detail.value.trim() });
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
    if (!editPhone || !/^1[3-9]\d{9}$/.test(editPhone)) {
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
    getApp().callAdvisor('18888888888');
  },

  onShowAbout() {
    wx.showModal({
      title: '关于学校招商宝',
      content: '学校商铺招商宝是一款专注于高校食堂档口、商业街铺位、校内外服务网点的信息展示与意向线索对接平台。版本：v1.0.0',
      showCancel: false,
      confirmText: '我知道了'
    });
  },

  onShowAdminTip() {
    wx.showModal({
      title: 'Web 管理后台入口',
      content: '本地 Mock 后台：http://localhost:5173/admin/index.html\n\nPayload CMS 后台：http://localhost:3000/admin',
      confirmText: '复制链接',
      cancelText: '取消',
      success: (res) => {
        if (res.confirm) {
          wx.setClipboardData({
            data: 'http://localhost:3000/admin',
            success: () => wx.showToast({ title: '链接已复制', icon: 'success' })
          });
        }
      }
    });
  }
});
