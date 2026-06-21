const auth = require('./auth.js');

const now = Date.now();

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
    areaText: '15m²',
    feeText: '3万元/年，另收 2% 管理费',
    suitableBusiness: ['粉面', '小吃', '水果'],
    unsuitableBusiness: ['重油烟', '奶茶'],
    highlights: ['学生人流集中', '免收转让费', '自带水电与排烟条件'],
    customerInfo: '覆盖约 1.2 万名在校师生，就餐高峰集中，适合高出餐效率品类。',
    cooperationMode: '纯租金模式，按年缴纳，押二付一。',
    viewingTimeText: '工作日 14:00-17:00，需提前一天预约。',
    coverImage: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=400&q=80',
    images: [
      'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=900&q=80',
      'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=900&q=80',
      'https://images.unsplash.com/photo-1552566626-52f8b828add9?auto=format&fit=crop&w=900&q=80'
    ],
    status: 'online',
    auditStatus: 'approved',
    isRecommended: true,
    sort: 100,
    createdAt: now - 86400000 * 6,
    updatedAt: now - 86400000
  },
  {
    id: 'p2',
    opportunityType: 'transfer',
    title: '华南师范大学石牌校区商业街茶饮店转让',
    city: '广州',
    district: '天河',
    addressText: '华南师范大学石牌校区西区商业街 12 号铺',
    schoolName: '华南师范大学',
    schoolAlias: '华师',
    showFullSchoolName: true,
    projectType: '校园商业街',
    areaText: '45m²',
    feeText: '1.2万元/月，含物业费',
    suitableBusiness: ['奶茶', '咖啡', '面包烘焙'],
    unsuitableBusiness: ['重油烟', '粉面'],
    highlights: ['市中心成熟校区', '靠近女生宿舍区', '可办理餐饮许可'],
    customerInfo: '成熟校区商业街铺位，适合品牌化茶饮、咖啡和轻烘焙。',
    cooperationMode: '承接现有合同，设备可协商打包。',
    viewingTimeText: '周一至周日均可预约看铺。',
    transferInfo: {
      currentBusiness: '茶饮',
      monthlyRent: '1.2万元/月',
      remainingTerm: '18个月',
      expectedTransferFee: '12万元，可谈'
    },
    coverImage: 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&w=400&q=80',
    images: [
      'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&w=900&q=80',
      'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=900&q=80',
      'https://images.unsplash.com/photo-1498804103079-a6351b050096?auto=format&fit=crop&w=900&q=80'
    ],
    status: 'online',
    auditStatus: 'approved',
    isRecommended: true,
    sort: 90,
    createdAt: now - 86400000 * 5,
    updatedAt: now - 86400000 * 2
  }
];

function initLocalStorage() {
  if (!wx.getStorageSync('local_projects')) wx.setStorageSync('local_projects', SEED_PROJECTS);
  if (!wx.getStorageSync('local_leads')) wx.setStorageSync('local_leads', []);
  if (!wx.getStorageSync('local_follows')) wx.setStorageSync('local_follows', []);
}

async function request(urlPath, method = 'GET', data = {}) {
  const appInstance = getApp() || {
    globalData: {
      apiUrl: 'http://127.0.0.1:3000/api',
      useLocalMock: true
    }
  };
  initLocalStorage();

  if (appInstance.globalData.useLocalMock) {
    return localFallback(urlPath, method, data);
  }

  const header = {};
  if (urlPath.startsWith('/leads') || urlPath.startsWith('/uploads')) {
    const token = await auth.getAuthToken();
    header.Authorization = `Bearer ${token}`;
  }

  return new Promise(resolve => {
    wx.request({
      url: `${appInstance.globalData.apiUrl}${urlPath}`,
      method,
      data,
      header,
      timeout: 8000,
      success: res => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(res.data);
          return;
        }
        resolve(localFallback(urlPath, method, data));
      },
      fail: () => resolve(localFallback(urlPath, method, data))
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

function getCurrentOpenId() {
  const app = getApp();
  return wx.getStorageSync('authOpenId') || (app && app.globalData && app.globalData.devOpenId) || 'dev-openid-local';
}

function localFallback(urlPath, method, requestData = {}) {
  if (urlPath === '/projects' && method === 'GET') {
    let list = wx.getStorageSync('local_projects') || [];
    if (requestData.opportunityType && requestData.opportunityType !== '全部') list = list.filter(p => (p.opportunityType || 'leasing') === requestData.opportunityType);
    if (requestData.q) {
      const q = requestData.q.toLowerCase().trim();
      list = list.filter(p =>
        p.title.toLowerCase().includes(q) ||
        (p.schoolName && p.schoolName.toLowerCase().includes(q)) ||
        (p.district && p.district.toLowerCase().includes(q)) ||
        (p.suitableBusiness || []).some(b => b.toLowerCase().includes(q))
      );
    }
    if (requestData.district && requestData.district !== '全部') list = list.filter(p => p.district === requestData.district);
    if (requestData.projectType && requestData.projectType !== '全部') list = list.filter(p => p.projectType === requestData.projectType);
    if (requestData.budget && requestData.budget !== '全部') list = list.filter(p => getBudgetCategory(p) === requestData.budget);
    if (requestData.business && requestData.business !== '全部') list = list.filter(p => (p.suitableBusiness || []).includes(requestData.business));
    if (requestData.status && requestData.status !== '全部') list = list.filter(p => p.status === requestData.status);
    return list.sort((a, b) => (b.sort || 0) - (a.sort || 0) || b.createdAt - a.createdAt);
  }

  if (urlPath.startsWith('/projects/') && method === 'GET') {
    const id = urlPath.substring('/projects/'.length);
    return (wx.getStorageSync('local_projects') || []).find(item => item.id === id) || null;
  }

  if (urlPath === '/leads' && method === 'GET') {
    const openid = getCurrentOpenId();
    const follows = wx.getStorageSync('local_follows') || [];
    return (wx.getStorageSync('local_leads') || [])
      .filter(lead => !lead.submitterOpenId || lead.submitterOpenId === openid)
      .map(lead => ({ ...lead, follows: follows.filter(f => f.leadId === lead.id).sort((a, b) => b.createdAt - a.createdAt) }))
      .sort((a, b) => b.createdAt - a.createdAt);
  }

  if (urlPath === '/leads' && method === 'POST') {
    const leads = wx.getStorageSync('local_leads') || [];
    const projects = wx.getStorageSync('local_projects') || [];
    const newLead = {
      ...requestData,
      submitterOpenId: getCurrentOpenId(),
      id: `l_mock_${Math.random().toString(36).substring(2, 9)}`,
      leadType: requestData.leadType || 'leasing',
      sourceChannel: requestData.sourceChannel || 'mini_program',
      status: 'new',
      attachments: requestData.attachments || [],
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
  getLeads: () => request('/leads', 'GET'),
  submitLead: leadData => request('/leads', 'POST', leadData),
  submitTransfer: leadData => request('/leads', 'POST', { ...leadData, leadType: 'transfer' }),
  submitEquipment: leadData => request('/leads', 'POST', leadData)
};
