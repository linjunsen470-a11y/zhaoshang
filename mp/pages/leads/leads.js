const api = require('../../services/api.js');
const { getLeadTypeLabel } = require('../../utils/form.js');

function formatDateTime(value) {
  const date = new Date(value || Date.now());
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

function formatLeadId(id) {
  if (!id) return '';
  const cleaned = String(id).replace(/^l_?/, '');
  const num = parseInt(cleaned, 10);
  if (!isNaN(num)) {
    if (num < 10000000) {
      return String(26000000 + num);
    }
    return String(num);
  }
  return id;
}

Page({
  data: {
    phone: '',
    openId: '',
    leadsList: [],
    expandedMap: {},
    loading: true,
    statusMap: {
      new: { name: '已提交', color: '#3b82f6', bg: '#eff6ff' },
      contacted: { name: '已联系', color: '#10b981', bg: '#ecfdf5' },
      interested: { name: '意向明确', color: '#8b5cf6', bg: '#f5f3ff' },
      viewing_scheduled: { name: '已约看铺', color: '#f59e0b', bg: '#fef3c7' },
      viewed: { name: '已看铺', color: '#f97316', bg: '#fff7ed' },
      negotiating: { name: '合同谈判中', color: '#ec4899', bg: '#fdf2f8' },
      closed: { name: '已签约成交', color: '#059669', bg: '#d1fae5' },
      invalid: { name: '无效咨询', color: '#64748b', bg: '#f1f5f9' },
      paused: { name: '已暂缓', color: '#94a3b8', bg: '#f8fafc' }
    }
  },

  onLoad() {
    // onLoad is followed immediately by onShow in WeChat mini-program page lifecycles.
    // We only perform refreshLeads inside onShow to avoid concurrent duplicate requests.
  },


  onPullDownRefresh() {
    this.refreshLeads(() => {
      wx.stopPullDownRefresh();
      wx.showToast({ title: '已刷新', icon: 'none', duration: 1200 });
    });
  },

  onShow() {
    this.refreshLeads();
  },

  refreshLeads(callback) {
    this.setData({ loading: true });
    const userInfo = wx.getStorageSync('userInfo') || getApp().globalData.userInfo || {};
    const phone = userInfo.phone || '';
    const openId = wx.getStorageSync('authOpenId') || getApp().globalData.devOpenId || '';
    this.setData({ phone, openId });

    api.getLeads()
      .then(res => {
        const formatted = (res || []).map(lead => ({
          ...lead,
          displayId: formatLeadId(lead.id),
          leadTypeLabel: getLeadTypeLabel(lead.leadType),
          statusInfo: this.data.statusMap[lead.status] || this.data.statusMap.new,
          formattedTime: formatDateTime(lead.createdAt),
          follows: (lead.follows || []).map(f => ({
            ...f,
            formattedTime: formatDateTime(f.createdAt),
            nextFollowText: f.nextFollowAt ? formatDateTime(f.nextFollowAt).slice(0, 10) : ''
          }))
        }));

        this.setData({
          leadsList: formatted,
          loading: false
        });
        if (callback) callback();
      })
      .catch(err => {
        console.error(err);
        this.setData({ loading: false });
        wx.showToast({ title: '加载咨询历史失败', icon: 'none' });
        if (callback) callback();
      });
  },

  onToggleExpand(e) {
    const id = e.currentTarget.dataset.id;
    const map = { ...this.data.expandedMap };
    map[id] = !map[id];
    this.setData({ expandedMap: map });
  },

  onGoToProject(e) {
    const id = e.currentTarget.dataset.id;
    if (id) {
      wx.navigateTo({ url: `/pages/detail/detail?id=${id}` });
    }
  },

  onPreviewAttachment(e) {
    const leadId = e.currentTarget.dataset.leadId;
    const current = e.currentTarget.dataset.url;
    const lead = this.data.leadsList.find(item => item.id === leadId);
    const urls = ((lead && lead.attachments) || []).map(item => item.url).filter(Boolean);
    if (urls.length) wx.previewImage({ urls, current });
  },

  onEditLead(e) {
    const id = e.currentTarget.dataset.id;
    const type = e.currentTarget.dataset.type || 'leasing';
    let url = '';
    if (type === 'transfer') {
      url = `/pages/transfer/transfer?leadId=${id}`;
    } else if (type.startsWith('equipment')) {
      url = `/pages/equipment/equipment?leadId=${id}`;
    } else if (type === 'renovation_consult') {
      url = `/pages/renovation/renovation?leadId=${id}`;
    } else {
      url = `/pages/apply/apply?leadId=${id}`;
    }
    wx.navigateTo({ url });
  },

  onDeleteLead(e) {
    const id = e.currentTarget.dataset.id;
    const displayId = formatLeadId(id);
    wx.showModal({
      title: '确认删除',
      content: `确定要删除线索号为 ${displayId} 的记录吗？`,
      confirmColor: '#ef4444',
      success: (res) => {
        if (res.confirm) {
          wx.showLoading({ title: '正在删除...' });
          api.deleteLead(id).then(() => {
            wx.hideLoading();
            wx.showToast({ title: '删除成功', icon: 'success' });
            this.refreshLeads();
          }).catch(err => {
            wx.hideLoading();
            wx.showToast({ title: '删除失败', icon: 'none' });
            console.error(err);
          });
        }
      }
    });
  }
});
