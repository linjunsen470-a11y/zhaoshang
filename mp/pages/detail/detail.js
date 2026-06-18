const api = require('../../services/api.js');

Page({
  data: {
    projectId: '',
    project: null,
    isFavorited: false,
    loading: true,
    formattedUpdateTime: ''
  },

  onLoad: function (options) {
    const id = options.id;
    this.setData({ projectId: id });
    this.loadDetail(id);
    this.checkFavoriteStatus(id);
  },

  onShow: function () {
    // 每次显示时重新检查一下，以防在收藏页面删除了收藏，返回时状态没同步
    if (this.data.projectId) {
      this.checkFavoriteStatus(this.data.projectId);
    }
  },

  // 加载项目详情
  loadDetail: function (id) {
    this.setData({ loading: true });
    api.getProjectDetail(id)
      .then(project => {
        if (!project) {
          wx.showModal({
            title: '提示',
            content: '项目已下架或不存在',
            showCancel: false,
            success: () => {
              wx.navigateBack();
            }
          });
          return;
        }

        // 格式化更新时间
        const date = new Date(project.updatedAt);
        const formattedDate = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

        this.setData({
          project: project,
          formattedUpdateTime: formattedDate,
          loading: false
        });
      })
      .catch(err => {
        console.error(err);
        this.setData({ loading: false });
        wx.showToast({ title: '拉取详情失败', icon: 'none' });
      });
  },

  // 检查收藏状态
  checkFavoriteStatus: function (id) {
    const favs = wx.getStorageSync('favorites') || [];
    this.setData({
      isFavorited: favs.includes(id)
    });
  },

  // 切换收藏状态
  onToggleFavorite: function () {
    const id = this.data.projectId;
    let favs = wx.getStorageSync('favorites') || [];
    let isFav = false;

    if (favs.includes(id)) {
      // 取消收藏
      favs = favs.filter(item => item !== id);
      isFav = false;
      wx.showToast({ title: '已取消收藏', icon: 'success' });
    } else {
      // 收藏
      favs.push(id);
      isFav = true;
      wx.showToast({ title: '收藏成功', icon: 'success' });
    }

    wx.setStorageSync('favorites', favs);
    this.setData({ isFavorited: isFav });
  },

  // 拨打顾问电话
  onCallAdvisor: function () {
    wx.makePhoneCall({
      phoneNumber: '18888888888',
      success: () => console.log('拨打成功'),
      fail: () => console.log('取消拨打')
    });
  },

  // 我要咨询跳转
  onGoToConsult: function () {
    if (this.data.project) {
      wx.navigateTo({
        url: `/pages/apply/apply?projectId=${this.data.projectId}`
      });
    }
  },

  // 分享功能
  onShareAppMessage: function () {
    return {
      title: this.data.project ? `校园商铺招商：${this.data.project.title}` : '学校商铺招商宝',
      path: `/pages/detail/detail?id=${this.data.projectId}`
    };
  }
});
