const { toggleFavorite, isFavorite } = require('../../utils/favorites.js');
const api = require('../../services/api.js');
const config = require('../../config.js');
const { rememberProject } = require('../../utils/recent.js');
const { isPublicProject } = require('../../utils/project.js');
const { encodeRouteValue, safeIdentifier } = require('../../utils/navigation.js');

Page({
  data: {
    similarProjects: [], similarLoading: false, similarError: false, anchors: [],
    units: [], unitPage: 0, unitsLoading: false, unitsError: false, unitsHasNext: false,
    projectId: '',
    project: null,
    isFavorited: false,
    loading: true,
    loadError: false,
    unavailable: false,
    formattedUpdateTime: '',
    currentImageIndex: 0,
    imageErrors: []
  },

  onLoad(options) {
    if (typeof wx.showShareMenu === 'function') wx.showShareMenu({ menus: ['shareAppMessage', 'shareTimeline'] });
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
    this.setData({ loading: true, loadError: false, unavailable: false });
    api.getProjectDetail(id)
      .then(project => {
        if (!isPublicProject(project)) {
          this.setData({ loading: false, loadError: false, unavailable: true });
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
        wx.setNavigationBarTitle({ title: project.locationLabel || project.title || '房源详情' });
        rememberProject(id);
        this.setData({ anchors: [
          { id: 'fees', label: '费用' }, { id: 'space', label: '空间' },
          ...(project.operatingRequirements || (project.suitableBusiness || []).length || (project.unsuitableBusiness || []).length || project.premisesConditions ? [{ id: 'conditions', label: '条件' }] : []),
          ...(project.introduction || (project.highlights || []).length || project.customerInfo ? [{ id: 'intro', label: '介绍' }] : [])
        ] });
        if (project.listingKind === 'project') this.loadUnits(false);
        this.loadSimilar();
      })
      .catch(err => {
        console.error(err);
        const unavailable = err.statusCode === 404;
        this.setData({ loading: false, loadError: !unavailable, unavailable });
        if (!unavailable) wx.showToast({ title: '房源加载失败，请稍后重试', icon: 'none' });
      });
  },

  onAnchorTap(e) {
    const id = e.currentTarget.dataset.id;
    if (this.data.anchors.some(anchor => anchor.id === id)) wx.pageScrollTo({ selector: '#section-' + id, offsetTop: -64, duration: 200 });
  },
  loadSimilar() {
    this.setData({ similarLoading: true, similarError: false });
    api.getProjectPage({ public: true, available: 'true', businessScene: this.data.project.businessScene, page: 1, limit: 5 }).then(result => {
      this.setData({ similarProjects: result.docs.filter(item => String(item.id) !== String(this.data.projectId)).slice(0, 3), similarLoading: false });
    }).catch(() => this.setData({ similarLoading: false, similarError: true }));
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
  onSimilarCoverError(e) {
    const id = e.currentTarget.dataset.id;
    this.setData({ similarProjects: this.data.similarProjects.map(item => String(item.id) === String(id) ? { ...item, coverImageError: true } : item) });
  },

  onRetryLoad() {
    if (this.data.projectId) this.loadDetail(this.data.projectId);
  },
  onBrowseActive() { wx.setStorageSync('pendingListFilter', {}); wx.switchTab({ url: '/pages/list/list' }); },
  onGeneralNeed() { wx.navigateTo({ url: '/pages/apply/apply' }); },
  onFindSimilar() { wx.setStorageSync('pendingListFilter', { businessScene: this.data.project.businessScene }); wx.switchTab({ url: '/pages/list/list' }); },

  checkFavoriteStatus(id) {
    const favs = wx.getStorageSync('favorites') || [];
    this.setData({ isFavorited: isFavorite(favs, id) });
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
    const isFav = toggleFavorite(id);
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

  onShareTimeline() {
    return { title: this.data.project ? this.data.project.title : config.APP_NAME, query: 'id=' + encodeRouteValue(this.data.projectId), ...(this.data.project && this.data.project.coverImage ? { imageUrl: this.data.project.coverImage } : {}) };
  },
  onShareAppMessage() {
    return {
      title: this.data.project ? `${config.APP_NAME}：${this.data.project.title}` : `${config.APP_NAME} · 商铺招租`,
      path: `/pages/detail/detail?id=${encodeRouteValue(this.data.projectId)}`,
      ...(this.data.project && this.data.project.coverImage ? { imageUrl: this.data.project.coverImage } : {})
    };
  }
});
