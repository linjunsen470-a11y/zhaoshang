const api = require('../../services/api.js');
const { getLeadTypeLabel } = require('../../utils/form.js');
const { normalizeAttachments, previewUrls } = require('../../utils/attachment.js');
const { allowedValue, encodeRouteValue } = require('../../utils/navigation.js');

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
    leadsList: [],
    loading: true,
    loadError: false,
    statusMap: {
      new: { name: '已提交', step: 1 },
      contacted: { name: '已联系', step: 2 },
      closed: { name: '已结束', step: 3 }
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
    this.setData({ loading: true, loadError: false });
    const userInfo = wx.getStorageSync('userInfo') || getApp().globalData.userInfo || {};
    const phone = userInfo.phone || '';
    this.setData({ phone });

    api.getLeads()
      .then(res => {
        const formatted = (res || []).map(lead => ({
          ...lead,
          expanded: false,
          attachments: normalizeAttachments(lead.attachments),
          displayId: formatLeadId(lead.id),
          leadTypeLabel: getLeadTypeLabel(lead.leadType),
          statusInfo: this.data.statusMap[lead.status] || this.data.statusMap.new,
          formattedTime: formatDateTime(lead.createdAt)
        }));

        this.setData({
          leadsList: formatted,
          loading: false
        });
        if (callback) callback();
      })
      .catch(err => {
        console.error(err);
        this.setData({ loading: false, loadError: true });
        wx.showToast({ title: '加载咨询历史失败', icon: 'none' });
        if (callback) callback();
      });
  },

  onToggleDetails(e) {
    const id = e.currentTarget.dataset.id;
    this.setData({ leadsList: this.data.leadsList.map(lead => String(lead.id) === String(id) ? { ...lead, expanded: !lead.expanded } : lead) });
  },
  onGoToProject(e) {
    const id = e.currentTarget.dataset.id;
    if (id) {
      wx.navigateTo({ url: `/pages/detail/detail?id=${id}` });
    }
  },

  onRetryLoad() { this.refreshLeads(); },

  onAttachmentError(e) {
    const { leadIndex, imageIndex } = e.currentTarget.dataset;
    this.setData({ [`leadsList[${leadIndex}].attachments[${imageIndex}].imageError`]: true });
  },

  onPreviewAttachment(e) {
    const leadId = e.currentTarget.dataset.leadId;
    const current = e.currentTarget.dataset.url;
    const lead = this.data.leadsList.find(item => item.id === leadId);
    const urls = previewUrls((lead && lead.attachments) || []);
    if (urls.length) wx.previewImage({ urls, current: urls.includes(current) ? current : urls[0] });
  },

  onEditLead(e) {
    const id = e.currentTarget.dataset.id;
    const type = allowedValue(e.currentTarget.dataset.type, ['leasing', 'transfer', 'equipment_sell', 'equipment_buy', 'equipment_recycle', 'renovation_consult'], 'leasing');
    let url = '';
    if (type === 'transfer') {
      url = `/pages/transfer/transfer?leadId=${encodeRouteValue(id)}`;
    } else if (type.startsWith('equipment')) {
      url = `/pages/equipment/equipment?leadId=${encodeRouteValue(id)}`;
    } else if (type === 'renovation_consult') {
      url = `/pages/renovation/renovation?leadId=${encodeRouteValue(id)}`;
    } else {
      url = `/pages/apply/apply?leadId=${encodeRouteValue(id)}`;
    }
    wx.navigateTo({ url });
  },

  onDeleteLead(e) {
    const id = e.currentTarget.dataset.id;
    const displayId = formatLeadId(id);
    wx.showModal({
      title: '确认删除',
      content: `确定要删除线索号为 ${displayId} 的记录吗？`,
      confirmColor: '#9F2D2D',
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
