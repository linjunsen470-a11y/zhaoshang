const api = require('../../services/api.js');
const { normalizeAttachments, previewUrls } = require('../../utils/attachment.js');
const { allowedValue } = require('../../utils/navigation.js');

function formatTime(timestamp) {
  if (!timestamp) return '';
  const date = new Date(/^\d+$/.test(String(timestamp)) ? Number(timestamp) : timestamp);
  if (Number.isNaN(date.getTime())) return '';
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

Page({
  data: {
    tabs: [
      { val: '全部', name: '全部' },
      { val: 'equipment_sell', name: '出售设备' },
      { val: 'equipment_buy', name: '求购设备' },
      { val: 'equipment_recycle', name: '设备回收' }
    ],
    activeTab: '全部',
    equipmentList: [],
    loading: true,
    loadError: false
  },

  onLoad() {
    this.loadData();
  },

  onPullDownRefresh() {
    this.loadData(() => {
      wx.stopPullDownRefresh();
      wx.showToast({ title: '已刷新', icon: 'none', duration: 1000 });
    });
  },

  loadData(callback) {
    const requestId = this._requestId = (this._requestId || 0) + 1;
    this.setData({ loading: true, loadError: false });
    
    const params = {};
    if (this.data.activeTab !== '全部') {
      params.leadType = this.data.activeTab;
    }

    api.getEquipments(params)
      .then(res => {
        if (requestId !== this._requestId) return;
        const formatted = (res || []).map(item => ({
          ...item,
          attachments: normalizeAttachments(item.attachments),
          formattedDate: formatTime(item.createdAt),
          tagText: item.leadType === 'equipment_sell' ? '出售' : (item.leadType === 'equipment_buy' ? '求购' : '回收'),
          tagClass: item.leadType === 'equipment_sell' ? 'tag-sell' : (item.leadType === 'equipment_buy' ? 'tag-buy' : 'tag-recycle')
        }));

        this.setData({
          equipmentList: formatted,
          loading: false
        });
        if (callback) callback();
      })
      .catch(err => {
        if (requestId !== this._requestId) return;
        console.error('获取设备列表失败:', err);
        this.setData({ loading: false, loadError: true });
        wx.showToast({ title: '获取列表失败', icon: 'none' });
        if (callback) callback();
      });
  },

  onTabTap(e) {
    const tab = allowedValue(e.currentTarget.dataset.tab, this.data.tabs.map(item => item.val), '全部');
    this.setData({ activeTab: tab }, () => {
      this.loadData();
    });
  },

  onRetryLoad() { this.loadData(); },
  onUnload() { this._requestId = (this._requestId || 0) + 1; },
  onImageError(e) {
    const { itemindex, imageindex } = e.currentTarget.dataset;
    this.setData({ [`equipmentList[${itemindex}].attachments[${imageindex}].imageError`]: true });
  },

  onPreviewImage(e) {
    const current = e.currentTarget.dataset.url;
    const itemIndex = e.currentTarget.dataset.itemindex;
    const item = this.data.equipmentList[itemIndex];
    if (!item || !item.attachments) return;

    const urls = previewUrls(item.attachments);
    if (urls.length > 0) {
      wx.previewImage({
        urls,
        current: urls.includes(current) ? current : urls[0]
      });
    }
  },

  onContactAdvisor() {
    getApp().callAdvisor();
  },

  onCopyEquipment(e) {
    const item = this.data.equipmentList.find(item => String(item.id) === String(e.currentTarget.dataset.id));
    if (!item) return;
    const details = item.equipmentDetails || {};
    const summary = [
      `【设备${item.tagText || '咨询'}】${details.equipmentName || item.businessType || '设备'}`,
      `信息编号：${item.displayId || item.id}`,
      details.specText && `数量规格：${details.specText}`,
      `期望价格：${item.budgetRange || details.expectedPrice || '面议/待评估'}`,
      item.regionPreference && `所在区域：${item.regionPreference}`
    ].filter(Boolean).join('\n');
    wx.setClipboardData({
      data: summary,
      success: () => wx.showToast({ title: '设备信息已复制，可发给顾问', icon: 'none' }),
      fail: () => wx.showToast({ title: '复制失败，请重试', icon: 'none' })
    });
  },

  onPublishTap() {
    const type = allowedValue(this.data.activeTab, ['equipment_sell', 'equipment_buy', 'equipment_recycle'], '');
    wx.navigateTo({
      url: '/pages/equipment/equipment' + (type ? '?leadType=' + encodeURIComponent(type) : '')
    });
  }
});
