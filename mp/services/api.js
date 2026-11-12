const commercial = require('../utils/commercial.js');
const auth = require('./auth.js');
const config = require('../config.js');
const { normalizeAttachments } = require('../utils/attachment.js');
const { projectText } = require('../utils/publicText.js');

const now = Date.now();

const SEED_PROJECTS = [
  {
    id: 'p1',
    listingKind: 'unit',
    businessScene: 'campus',
    opportunityType: 'leasing',
    title: '甲校第一食堂二楼小吃档口',
    city: '广州',
    district: '增城',
    addressText: '甲校荔湖校区第一食堂二楼 A05 档口',
    schoolName: '甲校',
    schoolAlias: '甲校',
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
    coverImage: '/images/demo/campus.jpg',
    images: ['/images/demo/campus.jpg'],
    status: 'online',
    isRecommended: true,
    sort: 100,
    createdAt: now - 86400000 * 6,
    updatedAt: now - 86400000
  },
  {
    id: 'p2',
    listingKind: 'unit',
    businessScene: 'campus',
    opportunityType: 'transfer',
    title: '乙校石牌校区商业街茶饮店转让',
    city: '广州',
    district: '天河',
    addressText: '乙校石牌校区西区商业街 12 号铺',
    schoolName: '乙校',
    schoolAlias: '乙校',
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
    coverImage: '/images/demo/campus.jpg',
    images: ['/images/demo/campus.jpg'],
    status: 'online',
    isRecommended: true,
    sort: 90,
    createdAt: now - 86400000 * 5,
    updatedAt: now - 86400000 * 2
  }
];

const commercialSeeds = [
  { id: 'demo-park', listingKind: 'project', businessScene: 'industrial_park', venueName: '黄埔某工业园区', title: '园区员工食堂招商', district: '黄埔', areaMin: 20, areaMax: 80, customerInfo: '面向园区在岗员工；班次、供餐人数与周末营业安排待核实。' },
  { id: 'demo-park-unit', parentProject: 'demo-park', businessScene: 'industrial_park', venueName: '黄埔某工业园区', title: '园区食堂快餐档口', district: '黄埔', areaMin: 25, areaMax: 25, monthlyRentMin: 4500, monthlyRentMax: 4500, feeText: '基础租金 4500元/月；押金、管理费及结算方式待确认', suitableBusiness: ['快餐', '粉面'] },
  { id: 'demo-office', businessScene: 'office', venueName: '天河某写字楼', title: '办公楼内咖啡轻餐铺', areaMin: 35, areaMax: 35, monthlyRentMin: 6500, monthlyRentMax: 6500, feeText: '基础租金 6500元/月；其他费用待确认', suitableBusiness: ['咖啡', '烘焙甜品'], customerInfo: '服务楼内办公人群；工作日早餐、午餐时段为主，实际人数待核实。' },
].map((item, index) => ({ ...SEED_PROJECTS[0], listingKind: 'unit', businessScene: item.businessScene, schoolName: '', schoolAlias: '', projectType: '其他', city: '广州', district: '天河', customerInfo: '实际客群与营业时段待核实。', introduction: '饭堂与配套商铺招商，具体经营条件以现场确认为准。', operatingRequirements: '餐饮资质、营业时段与进场条件需进一步确认。', premisesConditions: '排烟、燃气与电力条件待核实。', cooperationMode: '费用和合同条款以顾问确认的资料为准。', viewingTimeText: '可先登记看铺意向，时间由顾问确认。', highlights: [], feeText: '费用面议，待进一步核实', areaText: '以实测为准', isRecommended: index === 1, sort: 50 - index, coverImage: '/images/demo/campus.jpg', images: ['/images/demo/campus.jpg'], ...item }));

function initLocalStorage() {
  if (!wx.getStorageSync('local_projects')) wx.setStorageSync('local_projects', [...SEED_PROJECTS, ...commercialSeeds]);
  if (!wx.getStorageSync('local_leads')) wx.setStorageSync('local_leads', []);
}

function createApiError(statusCode, payload) {
  const message = (payload && payload.error) || `API Error: ${statusCode}`;
  const error = new Error(message);
  error.statusCode = statusCode;
  error.payload = payload;
  return error;
}

function wxRequest(options) {
  return new Promise((resolve, reject) => {
    wx.request({
      ...options,
      timeout: 15000,
      success: resolve,
      fail: reject
    });
  });
}

function localListPage(rows, data) {
  if (!data.page) return rows;
  const { page, limit } = data;
  return { docs: rows.slice((page - 1) * limit, page * limit), page, totalDocs: rows.length, hasNextPage: page * limit < rows.length };
}

function normalizeResponse(urlPath, payload, method = 'GET') {
  if (urlPath === '/projects') return { ...payload, docs: payload.docs.map(commercial.decorate) };
  if (urlPath.startsWith('/projects/')) return payload ? commercial.decorate(payload) : payload;
  if ((urlPath === '/leads' || urlPath === '/equipments') && method === 'GET') {
    const docs = (Array.isArray(payload) ? payload : payload.docs).map(item => ({
      ...item,
      projectTitle: projectText(item.projectTitle),
      attachments: normalizeAttachments(item.attachments)
    }));
    return Array.isArray(payload) ? docs : { ...payload, docs };
  }
  if (urlPath === '/leads' && payload) {
    return { ...payload, projectTitle: projectText(payload.projectTitle), attachments: normalizeAttachments(payload.attachments) };
  }
  if (urlPath.startsWith('/leads/') && payload) {
    return { ...payload, projectTitle: projectText(payload.projectTitle), attachments: normalizeAttachments(payload.attachments) };
  }
  return payload;
}

async function request(options) {
  const {
    url: urlPath,
    method = 'GET',
    data = {},
    auth: requiresAuth = false,
    retried = false,
    forceRemote = false,
    expectedOpenId = ''
  } = options;
  const appInstance = getApp() || {
    globalData: {
      apiUrl: config.API_URL,
      useLocalMock: config.USE_LOCAL_MOCK,
      configError: config.CONFIG_ERROR
    }
  };
  if (appInstance.globalData.useLocalMock && !forceRemote) {
    if (expectedOpenId && getCurrentOpenId() !== expectedOpenId) {
      throw createApiError(409, { error: '微信账号已变化，请重新同步收藏' });
    }
    initLocalStorage();
    return normalizeResponse(urlPath, localFallback(urlPath, method, data), method);
  }
  if (appInstance.globalData.configError || !appInstance.globalData.apiUrl) {
    throw new Error(appInstance.globalData.configError || '服务地址未配置');
  }

  const header = {};
  let token;
  if (requiresAuth) {
    token = await auth.getAuthToken(false, forceRemote);
    if (expectedOpenId && wx.getStorageSync('authOpenId') !== expectedOpenId) {
      throw createApiError(409, { error: '微信账号已变化，请重新同步收藏' });
    }
    header.Authorization = `Bearer ${token}`;
  }

  let res;
  try {
    res = await wxRequest({
      url: `${appInstance.globalData.apiUrl}${urlPath}`,
      method,
      data,
      header
    });
  } catch (err) {
    throw err || new Error('Network error');
  }

  if (expectedOpenId && wx.getStorageSync('authOpenId') !== expectedOpenId) {
    throw createApiError(409, { error: '微信账号已变化，请重新同步收藏' });
  }

  if (res.statusCode >= 200 && res.statusCode < 300) {
    return normalizeResponse(urlPath, res.data, method);
  }

  if (res.statusCode === 401 && requiresAuth && !retried) {
    auth.clearAuth(token);
    return request({ ...options, retried: true });
  }

  throw createApiError(res.statusCode, res.data);
}

function getCurrentOpenId() {
  const app = getApp();
  return wx.getStorageSync('authOpenId') || (app && app.globalData && app.globalData.devOpenId) || 'dev-openid-local';
}

async function getFavorites(params, expectedOwner = '') {
  const app = getApp();
  const localMock = Boolean(app && app.globalData && app.globalData.useLocalMock);
  if (!localMock) await auth.getAuthToken();
  const owner = localMock ? getCurrentOpenId() : wx.getStorageSync('authOpenId');
  if (!owner || (expectedOwner && owner !== expectedOwner)) {
    throw createApiError(409, { error: '微信账号已变化，请重新同步收藏' });
  }
  const result = await request({ url: '/favorites', data: params, auth: true, expectedOpenId: owner });
  return { ...result, owner };
}

function hydrateLocalAttachments(value) {
  const media = wx.getStorageSync('local_media') || [];
  return (Array.isArray(value) ? value : []).map(item => {
    const id = item && typeof item === 'object' ? item.id : item;
    return (item && typeof item === 'object') ? item : (media.find(file => file.id === id) || { id });
  });
}

function localFallback(urlPath, method, requestData = {}) {
  if (urlPath === '/profile') {
    const key = 'mock_profile_' + getCurrentOpenId();
    const profile = wx.getStorageSync(key) || { nickname: '', phone: '', phoneVerified: false, avatar: '' };
    if (method === 'PUT') {
      if (requestData.phoneCode) throw new Error('请在微信联网环境授权手机号');
      Object.assign(profile, requestData);
      if (requestData.avatar) profile.avatar = 'data:image/jpeg;base64,' + requestData.avatar;
      if (requestData.phone !== undefined) profile.phoneVerified = false;
      wx.setStorageSync(key, profile);
    }
    return profile;
  }
  if (urlPath === '/favorites' && method === 'GET') {
    const owner = getCurrentOpenId();
    const all = (wx.getStorageSync('local_favorite_records') || []).filter(row => row.owner === owner);
    const page = Math.max(1, Number(requestData.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(requestData.limit) || 100));
    return { docs: all.slice((page - 1) * limit, page * limit).map(row => ({ projectId: row.projectId, createdAt: row.createdAt })), page, hasNextPage: page * limit < all.length };
  }

  if (urlPath.startsWith('/favorites/') && (method === 'PUT' || method === 'DELETE')) {
    const owner = getCurrentOpenId();
    const projectId = decodeURIComponent(urlPath.substring('/favorites/'.length));
    const rows = wx.getStorageSync('local_favorite_records') || [];
    const existing = rows.some(row => row.owner === owner && row.projectId === projectId);
    if (method === 'PUT' && !existing) {
      const projects = wx.getStorageSync('local_projects') || [];
      const project = projects.find(item => String(item.id) === projectId);
      if (!project || !commercial.publicRecord(project, projects)) throw createApiError(404, { error: '房源已不可用，无法同步收藏' });
      rows.unshift({ owner, projectId, createdAt: new Date().toISOString() });
    }
    wx.setStorageSync('local_favorite_records', method === 'DELETE' ? rows.filter(row => row.owner !== owner || row.projectId !== projectId) : rows);
    return { success: true };
  }

  if (urlPath === '/projects' && method === 'GET') {
    return commercial.queryLocal(wx.getStorageSync('local_projects') || [], requestData);
  }

  if (urlPath.startsWith('/projects/') && method === 'GET') {
    const id = urlPath.substring('/projects/'.length);
    return commercial.queryLocal(wx.getStorageSync('local_projects') || [], { ids: id }).docs[0] || null;
  }

  if (urlPath === '/leads' && method === 'GET') {
    const openid = getCurrentOpenId();
    const projects = wx.getStorageSync('local_projects') || [];
    const rows = (wx.getStorageSync('local_leads') || [])
      .filter(lead => !lead.submitterOpenId || lead.submitterOpenId === openid)
      .map(lead => {
        const project = projects.find(item => String(item.id) === String(lead.projectId));
        return {
          ...lead,
          projectTitle: commercial.scrubKnownText(lead.projectTitle, project),
          attachments: hydrateLocalAttachments(lead.attachments)
        };
      })
      .sort((a, b) => b.createdAt - a.createdAt);
    return localListPage(rows, requestData);
  }

  if (urlPath === '/leads' && method === 'POST') {
    if (requestData.businessScene && !commercial.options.scenes.some(scene => scene.value === requestData.businessScene)) throw createApiError(400, { error: '请选择学校、工业园区或写字楼场景' });
    const leads = wx.getStorageSync('local_leads') || [];
    const projects = wx.getStorageSync('local_projects') || [];
    const duplicate = requestData.submissionId && leads.find(lead => lead.submissionId === requestData.submissionId && lead.submitterOpenId === getCurrentOpenId());
    if (duplicate) return duplicate;
    const maxId = leads.reduce((max, l) => {
      const num = Number(l.id);
      return (!isNaN(num) && num > max) ? num : max;
    }, 0);
    const nextId = String(maxId + 1);

    const newLead = {
      ...requestData,
      submitterOpenId: getCurrentOpenId(),
      id: nextId,
      leadType: requestData.leadType || 'leasing',
      sourceChannel: requestData.sourceChannel || 'mini_program',
      status: 'new',
      attachments: requestData.attachments || [],
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    if (newLead.projectId) {
      const p = projects.find(item => item.id === newLead.projectId);
      if (!p || !commercial.publicRecord(p, projects) || p.status === 'full') throw createApiError(400, { error: '该项目暂不接受咨询' });
      newLead.projectTitle = p.title;
      newLead.businessScene = commercial.sceneOf(p);
    }

    newLead.customerSnapshot = JSON.parse(JSON.stringify(newLead));
    leads.push(newLead);
    wx.setStorageSync('local_leads', leads);
    return newLead;
  }

  if (urlPath === '/equipments' && method === 'GET') {
    let list = wx.getStorageSync('local_leads') || [];
    list = list.filter(l => 
      ['equipment_sell', 'equipment_buy', 'equipment_recycle'].includes(l.leadType) &&
      l.equipmentPublication && l.equipmentPublication.status === 'online'
    );
    if (requestData.leadType && requestData.leadType !== '全部') {
      list = list.filter(l => l.leadType === requestData.leadType);
    }
    const maskRegion = value => {
      const text = String(value || '').trim();
      if (!text) return '';
      return text.length > 10 ? `${text.slice(0, 10)}…` : text;
    };
    const truncate = (value, max = 80) => {
      const text = String(value || '').trim();
      if (!text) return '';
      return text.length > max ? `${text.slice(0, max)}…` : text;
    };
    const rows = list.map(l => ({
      id: l.id,
      leadType: l.leadType,
      businessType: l.businessType,
      budgetRange: l.budgetRange,
      regionPreference: maskRegion(l.regionPreference),
      remark: truncate(l.equipmentPublication && l.equipmentPublication.publicRemark),
      equipmentDetails: l.equipmentDetails,
      attachments: hydrateLocalAttachments(l.attachments),
      createdAt: l.createdAt
    })).sort((a, b) => b.createdAt - a.createdAt);
    return localListPage(rows, requestData);
  }

  if (urlPath.startsWith('/leads/') && method === 'GET') {
    const id = urlPath.substring('/leads/'.length);
    const openid = getCurrentOpenId();
    const lead = (wx.getStorageSync('local_leads') || []).find(item => item.id === id);
    if (!lead) return null;
    if (lead.submitterOpenId && lead.submitterOpenId !== openid) {
      throw createApiError(403, { error: '无权查看此线索' });
    }
    return {
      ...lead,
      attachments: hydrateLocalAttachments(lead.attachments)
    };
  }

  if (urlPath.startsWith('/leads/') && method === 'PUT') {
    const id = urlPath.substring('/leads/'.length);
    const leads = wx.getStorageSync('local_leads') || [];
    const index = leads.findIndex(l => l.id === id);
    if (index === -1) return null;

    const openid = getCurrentOpenId();
    if (leads[index].submitterOpenId && leads[index].submitterOpenId !== openid) {
      throw createApiError(403, { error: '无权修改此线索' });
    }
    if (requestData.businessScene && requestData.businessScene !== leads[index].businessScene && !commercial.options.scenes.some(scene => scene.value === requestData.businessScene)) {
      throw createApiError(400, { error: '意向场景无效' });
    }

    const allowed = ['name', 'phone', 'businessType', 'budgetRange', 'regionPreference', 'hasCampusExperience', 'transferDetails', 'equipmentDetails', 'renovationDetails', 'attachments', 'remark', 'businessScene'];
    const patch = {};
    allowed.forEach(key => {
      if (requestData[key] !== undefined) {
        if (['transferDetails', 'equipmentDetails', 'renovationDetails'].includes(key) && requestData[key] && typeof requestData[key] === 'object') {
          patch[key] = { ...(leads[index][key] || {}), ...requestData[key] };
        } else patch[key] = requestData[key];
      }
    });

    if (leads[index].projectId) delete patch.businessScene;
    leads[index] = {
      ...leads[index],
      ...patch,
      id,
      updatedAt: Date.now()
    };
    wx.setStorageSync('local_leads', leads);
    return leads[index];
  }

  if (urlPath.startsWith('/leads/') && method === 'DELETE') {
    const id = urlPath.substring('/leads/'.length);
    const leads = wx.getStorageSync('local_leads') || [];
    const index = leads.findIndex(l => l.id === id);
    if (index === -1) return null;

    const openid = getCurrentOpenId();
    if (leads[index].submitterOpenId && leads[index].submitterOpenId !== openid) {
      throw createApiError(403, { error: '无权删除此线索' });
    }

    leads.splice(index, 1);
    wx.setStorageSync('local_leads', leads);
    return { success: true };
  }

  return null;
}

module.exports = {
  async getProfile() {
    await auth.getAuthToken();
    const owner = getCurrentOpenId();
    const profile = await request({ url: '/profile', auth: true, expectedOpenId: owner });
    return { owner, profile };
  },
  saveProfile: (data, owner) => request({ url: '/profile', method: 'PUT', data, auth: true, expectedOpenId: owner }),
  getFavorites,
  setFavorite: (id, active, owner) => request({ url: `/favorites/${encodeURIComponent(id)}`, method: active ? 'PUT' : 'DELETE', auth: true, expectedOpenId: owner }),
  getWechatPhone: code => request({ url: '/auth/wechat-phone', method: 'POST', data: { code }, auth: true, forceRemote: true }),
  getProjects: params => request({ url: '/projects', data: { limit: 100, ...params } }).then(data => data.docs),
  getProjectPage: params => request({ url: '/projects', data: { ...params, view: 'card' } }),
  getProjectDetail: id => request({ url: `/projects/${id}` }),
  getLeadPage: (page = 1, limit = 20) => request({ url: '/leads', data: { page, limit }, auth: true }),
  getEquipmentPage: params => request({ url: '/equipments', data: params }),
  getLeads: () => request({ url: '/leads', auth: true }),
  getLead: id => request({ url: `/leads/${id}`, auth: true }),
  submitLead: leadData => request({ url: '/leads', method: 'POST', data: leadData, auth: true }),
  submitTransfer: leadData => request({ url: '/leads', method: 'POST', data: { ...leadData, leadType: 'transfer' }, auth: true }),
  submitEquipment: leadData => request({ url: '/leads', method: 'POST', data: leadData, auth: true }),
  updateLead: (id, leadData) => request({ url: `/leads/${id}`, method: 'PUT', data: leadData, auth: true }),
  deleteLead: id => request({ url: `/leads/${id}`, method: 'DELETE', auth: true })
};
