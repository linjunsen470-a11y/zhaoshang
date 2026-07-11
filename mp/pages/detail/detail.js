const api = require('../../services/api.js');
const { isPublicProject } = require('../../utils/project.js');
const { encodeRouteValue, safeIdentifier } = require('../../utils/navigation.js');

Page({
  data: {
    projectId: '',
    project: null,
    isFavorited: false,
    loading: true,
    loadError: false,
    formattedUpdateTime: '',
    currentImageIndex: 0
  },

  onLoad(options) {
    const id = safeIdentifier(options.id);
    if (!id) {
      wx.showToast({ title: '项目参数无效', icon: 'none' });
      return;
    }
    this.setData({ projectId: id });
    this.loadDetail(id);
    this.checkFavoriteStatus(id);
  },

  onShow() {
    if (this.data.projectId) {
      this.checkFavoriteStatus(this.data.projectId);
    }
  },

  loadDetail(id) {
    this.setData({ loading: true, loadError: false });
    api.getProjectDetail(id)
      .then(project => {
        if (!isPublicProject(project)) {
          wx.showModal({
            title: '提示',
            content: '项目已下架或不存在',
            showCancel: false,
            success: () => wx.navigateBack()
          });
          return;
        }

        const images = Array.isArray(project.images) && project.images.length
          ? project.images
          : (project.coverImage ? [project.coverImage] : []);
        const date = new Date(project.updatedAt || Date.now());
        const formattedDate = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

        this.setData({
          project: { ...project, images },
          formattedUpdateTime: formattedDate,
          currentImageIndex: 0,
          loading: false,
          loadError: false
        });
      })
      .catch(err => {
        console.error(err);
        this.setData({ loading: false, loadError: true });
        wx.showToast({ title: '拉取详情失败', icon: 'none' });
      });
  },

  onRetryLoad() {
    if (this.data.projectId) this.loadDetail(this.data.projectId);
  },

  checkFavoriteStatus(id) {
    const favs = wx.getStorageSync('favorites') || [];
    this.setData({ isFavorited: favs.includes(id) });
  },

  onSwiperChange(e) {
    this.setData({ currentImageIndex: e.detail.current || 0 });
  },

  onPreviewImage(e) {
    const urls = (this.data.project && this.data.project.images) || [];
    const current = e.currentTarget.dataset.src || urls[this.data.currentImageIndex];
    if (!urls.length) return;
    wx.previewImage({ urls, current });
  },

  onToggleFavorite() {
    const id = this.data.projectId;
    let favs = wx.getStorageSync('favorites') || [];
    let isFav = false;

    if (favs.includes(id)) {
      favs = favs.filter(item => item !== id);
      wx.showToast({ title: '已取消收藏', icon: 'success' });
    } else {
      favs.push(id);
      isFav = true;
      wx.showToast({ title: '收藏成功', icon: 'success' });
    }

    wx.setStorageSync('favorites', favs);
    this.setData({ isFavorited: isFav });
  },

  onCallAdvisor() {
    getApp().callAdvisor();
  },

  onGoToConsult() {
    if (this.data.project) {
      wx.navigateTo({ url: `/pages/apply/apply?projectId=${encodeRouteValue(this.data.projectId)}` });
    }
  },

  onCopyAddress() {
    const p = this.data.project;
    const text = p.addressText || `${p.city || ''}${p.district || ''}${p.schoolName || ''}`;
    if (!text) {
      wx.showToast({ title: '暂无地址', icon: 'none' });
      return;
    }
    wx.setClipboardData({
      data: text,
      success: () => wx.showToast({ title: '地址已复制', icon: 'success' })
    });
  },

  onShareAppMessage() {
    return {
      title: this.data.project ? `校园商铺招商：${this.data.project.title}` : '学校商铺招商',
      path: `/pages/detail/detail?id=${encodeRouteValue(this.data.projectId)}`
    };
  }
});
