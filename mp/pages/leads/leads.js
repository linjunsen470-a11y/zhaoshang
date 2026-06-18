const api = require('../../services/api.js');

Page({
  data: {
    phone: '',
    leadsList: [],
    expandedMap: {}, // 用于折叠/展开跟进历史
    loading: true,
    
    // 状态字典映射
    statusMap: {
      'new': { name: '已提交', color: '#3b82f6', bg: '#eff6ff' },
      'contacted': { name: '已联系', color: '#10b981', bg: '#ecfdf5' },
      'interested': { name: '意向明确', color: '#8b5cf6', bg: '#f5f3ff' },
      'viewing_scheduled': { name: '已约看铺', color: '#f59e0b', bg: '#fef3c7' },
      'viewed': { name: '已看铺', color: '#f97316', bg: '#fff7ed' },
      'negotiating': { name: '合同谈判中', color: '#ec4899', bg: '#fdf2f8' },
      'closed': { name: '已签约成交', color: '#059669', bg: '#d1fae5' },
      'invalid': { name: '无效咨询', color: '#64748b', bg: '#f1f5f9' },
      'paused': { name: '已暂缓', color: '#94a3b8', bg: '#f8fafc' }
    }
  },

  onLoad: function () {
    this.refreshLeads();
  },

  onPullDownRefresh: function () {
    this.refreshLeads(() => {
      wx.stopPullDownRefresh();
      wx.showToast({ title: '已刷新', icon: 'none', duration: 1200 });
    });
  },

  onShow: function() {
    this.refreshLeads();
  },

  // 刷新列表
  refreshLeads: function (callback) {
    this.setData({ loading: true });
    
    // 获取绑定的手机号
    const userInfo = wx.getStorageSync('userInfo') || getApp().globalData.userInfo;
    const phone = userInfo ? userInfo.phone : '';
    
    this.setData({ phone: phone });

    if (!phone) {
      this.setData({ leadsList: [], loading: false });
      if (callback) callback();
      return;
    }

    api.getLeads(phone)
      .then(res => {
        // 格式化时间戳
        const formatted = res.map(lead => {
          const date = new Date(lead.createdAt);
          lead.formattedTime = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
          
          if (lead.follows) {
            lead.follows = lead.follows.map(f => {
              const fd = new Date(f.createdAt);
              f.formattedTime = `${fd.getFullYear()}-${String(fd.getMonth() + 1).padStart(2, '0')}-${String(fd.getDate()).padStart(2, '0')} ${String(fd.getHours()).padStart(2, '0')}:${String(fd.getMinutes()).padStart(2, '0')}`;
              return f;
            });
          }
          
          return lead;
        });

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

  // 切换折叠/展开跟进记录
  onToggleExpand: function (e) {
    const id = e.currentTarget.dataset.id;
    const map = { ...this.data.expandedMap };
    map[id] = !map[id];
    this.setData({
      expandedMap: map
    });
  },

  // 导航去详情
  onGoToProject: function (e) {
    const id = e.currentTarget.dataset.id;
    if (id) {
      wx.navigateTo({
        url: `/pages/detail/detail?id=${id}`
      });
    }
  },

  // 从咨询记录拨打统一顾问电话
  onCallAdvisorFromLead: function () {
    getApp().callAdvisor('18888888888');
  },

  // 再次咨询（跳转 apply，可带 projectId 回填）
  onReConsult: function (e) {
    const pid = e.currentTarget.dataset.projectId;
    const url = pid ? `/pages/apply/apply?projectId=${pid}` : '/pages/apply/apply';
    wx.navigateTo({ url });
  },

  // 复制本条线索手机号（header 或列表项）
  onCopyLeadPhone: function (e) {
    let phone = (e.currentTarget && e.currentTarget.dataset && e.currentTarget.dataset.phone) || this.data.phone || '';
    if (!phone) return;
    wx.setClipboardData({
      data: phone,
      success: () => wx.showToast({ title: '电话已复制', icon: 'success' })
    });
  }
});
