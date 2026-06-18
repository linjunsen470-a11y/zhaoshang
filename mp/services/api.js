const SEED_PROJECTS = [
  {
    id: 'p1',
    opportunityType: 'leasing',
    title: '广州华商学院第一食堂二楼小吃档口',
    city: '广州',
    district: '增城',
    addressText: '广州华商学院荔湖校区第一食堂二楼 A05 档口',
    schoolName: '广州华商学院',
    schoolAlias: '华商学院',
    showFullSchoolName: true,
    projectType: '食堂档口',
    areaText: '15㎡',
    feeText: '3万元/年，另收 2% 管理费',
    suitableBusiness: ['粉面', '小吃', '水果'],
    unsuitableBusiness: ['重油烟', '奶茶'],
    highlights: ['学生人流集中', '免收转让费', '自带水电与排烟条件'],
    customerInfo: '覆盖约 1.2 万名在校师生，就餐高峰集中，适合高出餐效率品类。',
    cooperationMode: '纯租金模式，按年缴纳，押二付一。',
    viewingTimeText: '工作日 14:00-17:00，需提前一天预约。',
    advisorTips: '适合有校园出餐经验的轻餐饮团队，不建议做重油烟品类。',
    trafficTags: ['食堂二楼', '午晚餐高峰', '宿舍动线'],
    facilityTags: ['给排水', '排烟', '独立电表'],
    coverImage: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=400&q=80',
    images: [
      'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=800&q=80'
    ],
    status: 'online',
    auditStatus: 'approved',
    isRecommended: true,
    sort: 100,
    createdAt: 1781845600000,
    updatedAt: 1781845600000
  },
  {
    id: 'p2',
    opportunityType: 'leasing',
    title: '华南师范大学石牌校区商业街茶饮店铺',
    city: '广州',
    district: '天河',
    addressText: '华南师范大学石牌校区西区商业街 2 号铺',
    schoolName: '华南师范大学',
    schoolAlias: '华师',
    showFullSchoolName: true,
    projectType: '校园商业街',
    areaText: '45㎡',
    feeText: '1.2万元/月，含物业费',
    suitableBusiness: ['奶茶', '咖啡', '面包烘焙'],
    unsuitableBusiness: ['重油烟', '粉面'],
    highlights: ['市中心成熟校区', '靠近女生宿舍区', '可办理餐饮许可'],
    customerInfo: '成熟校区商业街铺，适合品牌化茶饮、咖啡和轻烘焙。',
    cooperationMode: '固定租金，三年起签，无历史转让费。',
    viewingTimeText: '周一至周日均可预约看铺。',
    advisorTips: '需提前确认品牌形象、出品效率和校内准入条件。',
    trafficTags: ['商业街', '宿舍区入口', '高频复购'],
    facilityTags: ['上下水', '基础排烟', '门头展示'],
    coverImage: 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&w=400&q=80',
    images: [
      'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&w=800&q=80'
    ],
    status: 'online',
    auditStatus: 'approved',
    isRecommended: true,
    sort: 90,
    createdAt: 1781846600000,
    updatedAt: 1781846600000
  },
  {
    id: 't1',
    opportunityType: 'transfer',
    title: '从化高校商业街轻食店委托转让',
    city: '广州',
    district: '从化',
    addressText: '从化区某高校商业街中段',
    schoolName: '从化某高校',
    schoolAlias: '从化高校',
    showFullSchoolName: false,
    projectType: '店铺转让',
    areaText: '50㎡',
    feeText: '转让费 6 万元，月租 7800 元',
    suitableBusiness: ['咖啡', '轻食', '烘焙', '小吃'],
    unsuitableBusiness: ['重油烟', '烧烤'],
    highlights: ['精装带设备', '剩余合同期 18 个月', '可协助和校方确认准入'],
    customerInfo: '原店有稳定学生社群客流，适合接手轻餐饮或烘焙类。',
    cooperationMode: '店主委托转让，平台协助约看与资料核验。',
    viewingTimeText: '需提前预约，避免影响原店经营。',
    advisorTips: '转让前必须确认原合同是否允许变更经营主体。',
    trafficTags: ['商业街中段', '社团活动区', '晚间客流'],
    facilityTags: ['含设备', '精装', '上下水'],
    coverImage: 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&w=400&q=80',
    images: [
      'https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&w=800&q=80'
    ],
    status: 'online',
    auditStatus: 'approved',
    isRecommended: true,
    sort: 75,
    createdAt: 1781850600000,
    updatedAt: 1781850600000
  }
];

function initLocalStorage() {
  if (!wx.getStorageSync('local_projects')) {
    wx.setStorageSync('local_projects', SEED_PROJECTS);
  }
  if (!wx.getStorageSync('local_leads')) {
    wx.setStorageSync('local_leads', []);
  }
  if (!wx.getStorageSync('local_follows')) {
    wx.setStorageSync('local_follows', []);
  }
}

function request(urlPath, method = 'GET', data = {}) {
  const appInstance = getApp() || {
    globalData: {
      apiUrl: 'http://127.0.0.1:5173/api',
      useLocalMock: true
    }
  };
  initLocalStorage();

  if (appInstance.globalData.useLocalMock) {
    return Promise.resolve(localFallback(urlPath, method, data));
  }

  return new Promise(resolve => {
    wx.request({
      url: `${appInstance.globalData.apiUrl}${urlPath}`,
      method,
      data,
      timeout: 2000,
      success: res => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(res.data);
        } else {
          resolve(localFallback(urlPath, method, data));
        }
      },
      fail: () => {
        resolve(localFallback(urlPath, method, data));
      }
    });
  });
}

function getBudgetCategory(project) {
  const text = project.feeText || '';
  if (text.includes('面议') || text.includes('扣点') || text.includes('抽成')) return '面议';

  const match = text.match(/([\d.]+)/);
  if (!match) return '面议';
  const val = parseFloat(match[1]);
  const yearly = text.includes('月') ? val * 12 : val;

  if (yearly < 5) return '5万以内';
  if (yearly <= 10) return '5-10万';
  if (yearly <= 20) return '10-20万';
  if (yearly <= 50) return '20-50万';
  return '50万以上';
}

function localFallback(urlPath, method, requestData) {
  if (urlPath === '/projects' && method === 'GET') {
    let list = wx.getStorageSync('local_projects') || [];

    if (requestData.opportunityType && requestData.opportunityType !== '全部') {
      list = list.filter(p => (p.opportunityType || 'leasing') === requestData.opportunityType);
    }
    if (requestData.q) {
      const q = requestData.q.toLowerCase().trim();
      list = list.filter(p =>
        p.title.toLowerCase().includes(q) ||
        (p.schoolName && p.schoolName.toLowerCase().includes(q)) ||
        (p.district && p.district.toLowerCase().includes(q)) ||
        (p.suitableBusiness || []).some(b => b.toLowerCase().includes(q))
      );
    }
    if (requestData.district && requestData.district !== '全部') {
      list = list.filter(p => p.district === requestData.district);
    }
    if (requestData.projectType && requestData.projectType !== '全部') {
      list = list.filter(p => p.projectType === requestData.projectType);
    }
    if (requestData.budget && requestData.budget !== '全部') {
      list = list.filter(p => getBudgetCategory(p) === requestData.budget);
    }
    if (requestData.business && requestData.business !== '全部') {
      list = list.filter(p => (p.suitableBusiness || []).includes(requestData.business));
    }
    if (requestData.status && requestData.status !== '全部') {
      list = list.filter(p => p.status === requestData.status);
    }

    list.sort((a, b) => (b.sort || 0) - (a.sort || 0) || b.createdAt - a.createdAt);
    return list;
  }

  if (urlPath.startsWith('/projects/') && method === 'GET') {
    const id = urlPath.substring('/projects/'.length);
    return (wx.getStorageSync('local_projects') || []).find(item => item.id === id) || null;
  }

  if (urlPath === '/leads' && method === 'GET') {
    let leads = wx.getStorageSync('local_leads') || [];
    const follows = wx.getStorageSync('local_follows') || [];
    if (requestData.phone) leads = leads.filter(l => l.phone === requestData.phone);

    return leads
      .map(l => ({
        ...l,
        follows: follows.filter(f => f.leadId === l.id).sort((a, b) => b.createdAt - a.createdAt)
      }))
      .sort((a, b) => b.createdAt - a.createdAt);
  }

  if (urlPath === '/leads' && method === 'POST') {
    const leads = wx.getStorageSync('local_leads') || [];
    const projects = wx.getStorageSync('local_projects') || [];
    const newLead = {
      ...requestData,
      id: 'l_mock_' + Math.random().toString(36).substring(2, 9),
      leadType: requestData.leadType || 'leasing',
      sourceChannel: requestData.sourceChannel || 'mini_program',
      status: 'new',
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    if (newLead.projectId) {
      const p = projects.find(item => item.id === newLead.projectId);
      if (p) newLead.projectTitle = p.title;
    }

    leads.push(newLead);
    wx.setStorageSync('local_leads', leads);
    return newLead;
  }

  return null;
}

module.exports = {
  getProjects: params => request('/projects', 'GET', params),
  getProjectDetail: id => request(`/projects/${id}`, 'GET'),
  getLeads: phone => request('/leads', 'GET', { phone }),
  submitLead: leadData => request('/leads', 'POST', leadData),
  submitTransfer: leadData => request('/leads', 'POST', { ...leadData, leadType: 'transfer' }),
  submitEquipment: leadData => request('/leads', 'POST', leadData)
};
