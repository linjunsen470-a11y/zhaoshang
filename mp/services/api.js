const app = getApp();

// 种子数据，当服务器未启动时，作为本地缓存的默认初始化数据
const SEED_PROJECTS = [
  {
    "id": "p1",
    "title": "广州华商学院第一食堂2楼小吃档口",
    "city": "广州",
    "district": "增城",
    "addressText": "广州华商学院荔湖校区第一食堂2楼A05档口",
    "schoolName": "广州华商学院",
    "schoolAlias": "华商学院",
    "showFullSchoolName": true,
    "projectType": "食堂档口",
    "areaText": "15㎡",
    "feeText": "3万元/年 (另收2%管理费)",
    "suitableBusiness": ["粉面", "小吃", "水果"],
    "unsuitableBusiness": ["快餐", "奶茶"],
    "highlights": ["学生人流量大", "免收转让费", "自带水电煤气及排烟系统"],
    "customerInfo": "本食堂覆盖约1.2万名在校师生，就餐高峰期集中，消费能力强。",
    "cooperationMode": "纯租金模式，按年缴纳，押二付一",
    "viewingTimeText": "工作日 14:00 - 17:00 提前一天预约",
    "coverImage": "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=400&q=80",
    "images": [
      "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=800&q=80"
    ],
    "status": "online",
    "isRecommended": true,
    "sort": 100,
    "createdAt": 1781845600000,
    "updatedAt": 1781845600000
  },
  {
    "id": "p2",
    "title": "华南师范大学石牌校区商业街茶饮店铺",
    "city": "广州",
    "district": "天河",
    "addressText": "华南师范大学石牌校区西区商业街12号铺",
    "schoolName": "华南师范大学",
    "schoolAlias": "华南师大",
    "showFullSchoolName": true,
    "projectType": "校园商业街",
    "areaText": "45㎡",
    "feeText": "1.2万元/月 (含物业费)",
    "suitableBusiness": ["奶茶", "咖啡", "面包烘焙"],
    "unsuitableBusiness": ["重油烟餐饮", "粉面"],
    "highlights": ["市中心黄金校区", "临近女生宿舍区", "可办理餐饮许可证"],
    "customerInfo": "石牌校区在校生约2.5万人，周边商业配套成熟，学生消费意愿高。",
    "cooperationMode": "固定租金，三年起签，无历史转让费",
    "viewingTimeText": "周一至周日均可预约看铺",
    "coverImage": "https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&w=400&q=80",
    "images": [
      "https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1498804103079-a6351b050096?auto=format&fit=crop&w=800&q=80"
    ],
    "status": "online",
    "isRecommended": true,
    "sort": 90,
    "createdAt": 1781846600000,
    "updatedAt": 1781846600000
  },
  {
    "id": "p3",
    "title": "广东工业大学大学城校区西区超市旁铺位",
    "city": "广州",
    "district": "番禺",
    "addressText": "广东工业大学大学城校区西区生活区2号楼底层",
    "schoolName": "广东工业大学",
    "schoolAlias": "广工",
    "showFullSchoolName": false,
    "projectType": "校内铺位",
    "areaText": "30㎡",
    "feeText": "8.5万元/年",
    "suitableBusiness": ["便利店", "水果", "文具", "打印"],
    "unsuitableBusiness": ["任何明火餐饮"],
    "highlights": ["毗邻大型学生超市", "男生宿舍必经之路", "门头宽敞"],
    "customerInfo": "大学城校区学生基数大，男同胞多，数码/文具/零食需求旺盛。",
    "cooperationMode": "固定租金，押三付一，两年一签",
    "viewingTimeText": "请提前半天预约，招商经理带入校",
    "coverImage": "https://images.unsplash.com/photo-1578916171728-46686eac8d58?auto=format&fit=crop&w=400&q=80",
    "images": [
      "https://images.unsplash.com/photo-1578916171728-46686eac8d58?auto=format&fit=crop&w=800&q=80"
    ],
    "status": "online",
    "isRecommended": false,
    "sort": 80,
    "createdAt": 1781847600000,
    "updatedAt": 1781847600000
  },
  {
    "id": "p4",
    "title": "广州理工学院综合楼1楼临街快递代收点",
    "city": "广州",
    "district": "白云",
    "addressText": "广州理工学院东门综合楼102铺位",
    "schoolName": "广州理工学院",
    "schoolAlias": "广理工",
    "showFullSchoolName": true,
    "projectType": "校园服务点",
    "areaText": "60㎡",
    "feeText": "5.5万元/年",
    "suitableBusiness": ["快递", "维修", "洗衣", "打印"],
    "unsuitableBusiness": ["餐饮类"],
    "highlights": ["官方定点快递超市旁", "面积方正", "独立水电费自理"],
    "customerInfo": "学校封闭式管理，快递量极大，日均派件量达3000件以上。",
    "cooperationMode": "联营扣点或固定租金双选，合作期3年",
    "viewingTimeText": "工作日均可联系现场招商代表看铺",
    "coverImage": "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=400&q=80",
    "images": [
      "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=800&q=80"
    ],
    "status": "online",
    "isRecommended": false,
    "sort": 70,
    "createdAt": 1781848600000,
    "updatedAt": 1781848600000
  },
  {
    "id": "p5",
    "title": "广州科教城某高校新建食堂三楼精品快餐档口",
    "city": "广州",
    "district": "增城",
    "addressText": "广州科教城某新建大专院校食堂3层08号档",
    "schoolName": "科教城某高校",
    "schoolAlias": "科教城高校",
    "showFullSchoolName": false,
    "projectType": "食堂档口",
    "areaText": "25㎡",
    "feeText": "6.8万元/年 (首年八折优惠)",
    "suitableBusiness": ["快餐", "粉面", "小吃"],
    "unsuitableBusiness": ["饮料", "水果"],
    "highlights": ["全新校区首期招商", "设备设施全新齐备", "政策扶持力度大"],
    "customerInfo": "新建校区，今年9月迎来首批入校新生约8000人，未来规划达2万人。",
    "cooperationMode": "流水抽成模式 (扣点15%)，无固定租金",
    "viewingTimeText": "目前工地施工中，需统一安排看铺时间",
    "coverImage": "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=400&q=80",
    "images": [
      "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=800&q=80"
    ],
    "status": "coming",
    "isRecommended": true,
    "sort": 110,
    "createdAt": 1781849600000,
    "updatedAt": 1781849600000
  },
  {
    "id": "p6",
    "title": "中山大学南方学院商业街烘焙轻食店",
    "city": "广州",
    "district": "从化",
    "addressText": "中山大学南方学院商业街中段18号铺",
    "schoolName": "中山大学南方学院",
    "schoolAlias": "中大南方",
    "showFullSchoolName": true,
    "projectType": "校园商业街",
    "areaText": "50㎡",
    "feeText": "9.2万元/年",
    "suitableBusiness": ["咖啡", "面包烘焙", "下午茶"],
    "unsuitableBusiness": ["重餐饮"],
    "highlights": ["精装修带设备转让", "正对商业街小广场", "自带露天露台"],
    "customerInfo": "学校师生约1.8万人，商铺位于商业核心地段，有稳定的学生社团活动客流。",
    "cooperationMode": "已租赁，目前满租中",
    "viewingTimeText": "暂不安排看铺",
    "coverImage": "https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&w=400&q=80",
    "images": [
      "https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&w=800&q=80"
    ],
    "status": "full",
    "isRecommended": false,
    "sort": 50,
    "createdAt": 1781850600000,
    "updatedAt": 1781850600000
  }
];

// 初始化本地缓存
function initLocalStorage() {
  if (!wx.getStorageSync('local_projects')) {
    wx.setStorageSync('local_projects', SEED_PROJECTS);
  }
  if (!wx.getStorageSync('local_leads')) {
    wx.setStorageSync('local_leads', [
      {
        "id": "l1",
        "projectId": "p1",
        "projectTitle": "广州华商学院第一食堂2楼小吃档口",
        "name": "张老板",
        "phone": "13800138000",
        "businessType": "奶茶",
        "budgetRange": "5-10万",
        "regionPreference": "增城",
        "hasCampusExperience": true,
        "remark": "想尽快进场，看中食堂二楼的位置（本地缓存数据）。",
        "status": "new",
        "createdAt": 1781851600000,
        "updatedAt": 1781851600000
      }
    ]);
  }
  if (!wx.getStorageSync('local_follows')) {
    wx.setStorageSync('local_follows', []);
  }
}

// 统一封装请求
function request(urlPath, method = 'GET', data = {}) {
  const appInstance = getApp() || { globalData: { apiUrl: 'http://127.0.0.1:5173/api', fallbackUrl: 'http://localhost:5173/api' } };
  initLocalStorage();

  return new Promise((resolve, reject) => {
    // 优先使用 API 接口
    const primaryUrl = `${appInstance.globalData.apiUrl}${urlPath}`;
    
    wx.request({
      url: primaryUrl,
      method: method,
      data: data,
      timeout: 2000, // 2秒超时，方便快速切入本地缓存
      success: (res) => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(res.data);
        } else {
          // 如果服务器报错，也降级到本地缓存，让小程序始终可用
          console.warn(`Server responded with ${res.statusCode}, falling back to localStorage...`);
          resolve(localFallback(urlPath, method, data));
        }
      },
      fail: (err) => {
        // 网络请求失败（如服务器未开启），采用本地 Mock 降级策略
        console.warn(`Server connection failed (${err.errMsg}), falling back to localStorage...`);
        resolve(localFallback(urlPath, method, data));
      }
    });
  });
}

// 辅助方法：解析租金档次（本地过滤使用）
function getBudgetCategory(project) {
  const text = project.feeText || "";
  if (text.includes("面议") || text.includes("扣点") || text.includes("抽成")) return "面议";
  
  let yearly = 0;
  const match = text.match(/([\d\.]+)/);
  if (match) {
    const val = parseFloat(match[1]);
    if (text.includes("月")) yearly = val * 12;
    else yearly = val;
  }

  if (yearly === 0) return "面议";
  if (yearly < 5) return "5万以内";
  if (yearly <= 10) return "5-10万";
  if (yearly <= 20) return "10-20万";
  if (yearly <= 50) return "20-50万";
  return "50万以上";
}

// 本地缓存降级逻辑 (实现服务器相同的过滤和CRUD机制)
function localFallback(urlPath, method, requestData) {
  console.log(`[LocalStorage Mock] ${method} ${urlPath}`, requestData);
  
  // 1. 获取项目列表
  if (urlPath === '/projects' && method === 'GET') {
    let list = wx.getStorageSync('local_projects') || [];
    
    if (requestData.q) {
      const q = requestData.q.toLowerCase().trim();
      list = list.filter(p => 
        p.title.toLowerCase().includes(q) ||
        (p.schoolName && p.schoolName.toLowerCase().includes(q)) ||
        p.district.toLowerCase().includes(q) ||
        p.suitableBusiness.some(b => b.toLowerCase().includes(q))
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
      list = list.filter(p => p.suitableBusiness.includes(requestData.business));
    }
    if (requestData.status && requestData.status !== '全部') {
      list = list.filter(p => p.status === requestData.status);
    }
    
    list.sort((a, b) => (b.sort || 0) - (a.sort || 0) || b.createdAt - a.createdAt);
    return list;
  }

  // 2. 获取单条项目详情
  if (urlPath.startsWith('/projects/') && method === 'GET') {
    const id = urlPath.substring('/projects/'.length);
    const list = wx.getStorageSync('local_projects') || [];
    const p = list.find(item => item.id === id);
    return p || null;
  }

  // 3. 获取我的咨询线索
  if (urlPath === '/leads' && method === 'GET') {
    let leads = wx.getStorageSync('local_leads') || [];
    const follows = wx.getStorageSync('local_follows') || [];
    
    if (requestData.phone) {
      leads = leads.filter(l => l.phone === requestData.phone);
    }
    
    return leads.map(l => {
      const leadFollows = follows.filter(f => f.leadId === l.id);
      leadFollows.sort((a, b) => b.createdAt - a.createdAt);
      return { ...l, follows: leadFollows };
    }).sort((a, b) => b.createdAt - a.createdAt);
  }

  // 4. 提交咨询线索
  if (urlPath === '/leads' && method === 'POST') {
    const leads = wx.getStorageSync('local_leads') || [];
    const projects = wx.getStorageSync('local_projects') || [];
    
    const newLead = {
      ...requestData,
      id: 'l_mock_' + Math.random().toString(36).substring(2, 9),
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

// 导出封装的方法
module.exports = {
  // 获取项目列表
  getProjects: (params) => request('/projects', 'GET', params),
  
  // 获取项目详情
  getProjectDetail: (id) => request(`/projects/${id}`, 'GET'),
  
  // 获取咨询记录列表
  getLeads: (phone) => request('/leads', 'GET', { phone }),
  
  // 提交咨询表单
  submitLead: (leadData) => request('/leads', 'POST', leadData)
};
