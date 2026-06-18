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

  onShow: function () {
    // 每次页面展示，拉取最新的用户信息
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
      this.setData({
        userInfo: app.globalData.userInfo
      });
    }
  },

  // 触发修改信息弹窗
  onEditProfile: function () {
    this.setData({
      showEditModal: true,
      editNickname: this.data.userInfo.nickname,
      editPhone: this.data.userInfo.phone
    });
  },

  onNicknameInput: function (e) {
    this.setData({ editNickname: e.detail.value.trim() });
  },

  onPhoneInput: function (e) {
    this.setData({ editPhone: e.detail.value.trim() });
  },

  onCancelEdit: function () {
    this.setData({ showEditModal: false });
  },

  onSaveEdit: function () {
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

  // 我的咨询
  onGoToLeads: function () {
    wx.navigateTo({
      url: '/pages/leads/leads'
    });
  },

  // 我的收藏 (复用项目列表页，传入 favs=true)
  onGoToFavorites: function () {
    wx.navigateTo({
      url: '/pages/list/list?favs=true'
    });
  },

  // 联系客服
  onCallService: function () {
    wx.makePhoneCall({
      phoneNumber: '18888888888',
      success: () => console.log('拨打成功'),
      fail: () => console.log('取消拨打')
    });
  },

  // 显示关于平台
  onShowAbout: function () {
    wx.showModal({
      title: '关于学校招商宝',
      content: '学校商铺招商宝是一款专注于高校食堂档口、商业街铺位、校内外服务网点的招商信息展示与意向线索对接平台。版本：v1.0.0',
      showCancel: false,
      confirmText: '我知道了'
    });
  },

  // 提示后台管理端入口
  onShowAdminTip: function () {
    wx.showModal({
      title: 'Web 管理后台入口',
      content: '管理端已部署在 PC 浏览器端。请在电脑浏览器上打开以下链接进行管理和跟进：\n\nhttp://localhost:5173/admin/index.html',
      confirmText: '复制链接',
      cancelText: '取消',
      success: (res) => {
        if (res.confirm) {
          wx.setClipboardData({
            data: 'http://localhost:5173/admin/index.html',
            success: () => {
              wx.showToast({ title: '链接已复制', icon: 'success' });
            }
          });
        }
      }
    });
  }
});
