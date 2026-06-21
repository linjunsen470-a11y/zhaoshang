const api = require('../../services/api.js');

function formatTime(timestamp) {
  if (!timestamp) return '';
  const date = new Date(Number(timestamp));
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
    loading: true
  },

  onLoad() {
    this.loadData();
  },

  onShow() {
    this.loadData();
  },

  onPullDownRefresh() {
    this.loadData(() => {
      wx.stopPullDownRefresh();
      wx.showToast({ title: '已刷新', icon: 'none', duration: 1000 });
    });
  },

  loadData(callback) {
    this.setData({ loading: true });
    
    const params = {};
    if (this.data.activeTab !== '全部') {
      params.leadType = this.data.activeTab;
    }

    api.getEquipments(params)
      .then(res => {
        const formatted = (res || []).map(item => ({
          ...item,
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
        console.error('获取设备列表失败:', err);
        this.setData({ loading: false });
        wx.showToast({ title: '获取列表失败', icon: 'none' });
        if (callback) callback();
      });
  },

  onTabTap(e) {
    const tab = e.currentTarget.dataset.tab;
    this.setData({ activeTab: tab }, () => {
      this.loadData();
    });
  },

  onPreviewImage(e) {
    const current = e.currentTarget.dataset.url;
    const itemIndex = e.currentTarget.dataset.itemindex;
    const item = this.data.equipmentList[itemIndex];
    if (!item || !item.attachments) return;

    const urls = item.attachments.map(att => att.url).filter(Boolean);
    if (urls.length > 0) {
      wx.previewImage({
        urls,
        current
      });
    }
  },

  onContactAdvisor() {
    getApp().callAdvisor('18888888888');
  },

  onPublishTap() {
    wx.navigateTo({
      url: '/pages/equipment/equipment'
    });
  }
});
