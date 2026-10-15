const api = require('../../services/api.js');
const { isPublicProject } = require('../../utils/project.js');
const { encodeRouteValue, safeIdentifier } = require('../../utils/navigation.js');

Page({
  data: {
    units: [], unitPage: 0, unitsLoading: false, unitsError: false, unitsHasNext: false,
    projectId: '',
    project: null,
    isFavorited: false,
    loading: true,
    loadError: false,
    formattedUpdateTime: '',
    currentImageIndex: 0,
    imageErrors: []
  },

  onLoad(options) {
    let sceneId = '';
    try {
      sceneId = options.scene ? decodeURIComponent(options.scene) : '';
    } catch (_) {}
    const id = safeIdentifier(options.id || sceneId);
    if (!id) {
      this.setData({ loading: false, loadError: true });
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
          this.setData({ loading: false, loadError: true });
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
          imageErrors: [],
          loading: false,
          loadError: false
        });
        if (project.listingKind === 'project') this.loadUnits(false);
      })
      .catch(err => {
        console.error(err);
        this.setData({ loading: false, loadError: true });
        wx.showToast({ title: '拉取详情失败', icon: 'none' });
      });
  },

  loadUnits(append = true) {
    if (this.data.unitsLoading || (append && !this.data.unitsHasNext)) return;
    const page = append ? this.data.unitPage + 1 : 1;
    this.setData({ unitsLoading: true, unitsError: false });
    api.getProjectPage({ public: true, parentProject: this.data.projectId, page, limit: 20 }).then(result => {
      this.setData({ units: append ? [...this.data.units, ...result.docs] : result.docs, unitPage: result.page, unitsHasNext: result.hasNextPage, unitsLoading: false });
    }).catch(() => this.setData({ unitsLoading: false, unitsError: true }));
  },
  onMoreUnits() { this.loadUnits(this.data.unitPage > 0); },
  onRelatedProject(e) { wx.navigateTo({ url: `/pages/detail/detail?id=${encodeRouteValue(e.currentTarget.dataset.id)}` }); },

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

  onImageError(e) {
    const index = Number(e.currentTarget.dataset.index);
    if (!this.data.project || !Number.isInteger(index) || index < 0 || index >= this.data.project.images.length) return;
    const imageErrors = [...this.data.imageErrors];
    imageErrors[index] = true;
    this.setData({ imageErrors });
  },

  onPreviewImage(e) {
    const urls = ((this.data.project && this.data.project.images) || []).filter((url, index) => url && !this.data.imageErrors[index]);
    const current = e.currentTarget.dataset.src || urls[this.data.currentImageIndex];
    if (!urls.includes(current)) return;
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
    if (this.data.project && ['online', 'coming'].includes(this.data.project.status)) {
      wx.navigateTo({ url: `/pages/apply/apply?projectId=${encodeRouteValue(this.data.projectId)}` });
    }
  },

  onCopyAddress() {
    const p = this.data.project;
    const text = p.addressText || p.locationLabel || `${p.city || ''}${p.district || ''}`;
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
      title: this.data.project ? `项目与铺位：${this.data.project.title}` : '商业空间招商服务',
      path: `/pages/detail/detail?id=${encodeRouteValue(this.data.projectId)}`
    };
  }
});
