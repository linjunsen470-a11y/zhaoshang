import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_FILE = path.join(__dirname, 'data.json');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

const ALL = '全部';
const PUBLIC_STATUSES = new Set(['online', 'coming', 'full']);
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Max-Age': '86400',
};

function readData() {
  try {
    if (!fs.existsSync(DATA_FILE)) {
      return { projects: [], leads: [], followRecords: [] };
    }
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  } catch (e) {
    console.error('Error reading data file:', e);
    return { projects: [], leads: [], followRecords: [] };
  }
}

function writeData(data) {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
  } catch (e) {
    console.error('Error writing data file:', e);
  }
}

function generateId(prefix) {
  return prefix + Math.random().toString(36).substring(2, 9);
}

function parseQueryParams(urlStr) {
  const params = {};
  const [, queryStr] = urlStr.split('?');
  if (!queryStr) return params;

  for (const pair of queryStr.split('&')) {
    const [key, value] = pair.split('=');
    if (key) params[decodeURIComponent(key)] = decodeURIComponent(value || '');
  }
  return params;
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
    });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (e) {
        reject(e);
      }
    });
  });
}

function getProjectBudgetCategory(project) {
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

function normalizeProject(raw) {
  return {
    opportunityType: raw.opportunityType || 'leasing',
    auditStatus: raw.auditStatus || 'approved',
    status: raw.status || 'draft',
    suitableBusiness: raw.suitableBusiness || [],
    unsuitableBusiness: raw.unsuitableBusiness || [],
    highlights: raw.highlights || [],
    images: raw.images || [],
    trafficTags: raw.trafficTags || [],
    facilityTags: raw.facilityTags || [],
    isRecommended: !!raw.isRecommended,
    sort: parseInt(raw.sort, 10) || 0,
    ...raw,
  };
}

function normalizeLead(raw, projects) {
  const lead = {
    leadType: raw.leadType || 'leasing',
    sourceChannel: raw.sourceChannel || 'mini_program',
    status: raw.status || 'new',
    createdAt: raw.createdAt || Date.now(),
    updatedAt: Date.now(),
    ...raw,
  };

  if (lead.projectId && !lead.projectTitle) {
    const project = projects.find(p => p.id === lead.projectId);
    if (project) lead.projectTitle = project.title;
  }

  return lead;
}

function filterProjects(projects, query) {
  let result = [...projects];

  if (query.public === 'true') {
    result = result.filter(p => PUBLIC_STATUSES.has(p.status) && p.auditStatus !== 'rejected');
  }
  if (query.opportunityType && query.opportunityType !== ALL) {
    result = result.filter(p => (p.opportunityType || 'leasing') === query.opportunityType);
  }
  if (query.q) {
    const q = query.q.toLowerCase().trim();
    result = result.filter(p =>
      p.title.toLowerCase().includes(q) ||
      (p.schoolName && p.schoolName.toLowerCase().includes(q)) ||
      (p.district && p.district.toLowerCase().includes(q)) ||
      (p.suitableBusiness || []).some(b => b.toLowerCase().includes(q))
    );
  }
  if (query.district && query.district !== ALL) {
    result = result.filter(p => p.district === query.district);
  }
  if (query.projectType && query.projectType !== ALL) {
    result = result.filter(p => p.projectType === query.projectType);
  }
  if (query.budget && query.budget !== ALL) {
    result = result.filter(p => getProjectBudgetCategory(p) === query.budget);
  }
  if (query.business && query.business !== ALL) {
    result = result.filter(p => (p.suitableBusiness || []).includes(query.business));
  }
  if (query.status && query.status !== ALL) {
    result = result.filter(p => p.status === query.status);
  }

  result.sort((a, b) => (b.sort || 0) - (a.sort || 0) || b.createdAt - a.createdAt);
  return result;
}

function withFollows(leads, followRecords) {
  return leads
    .map(lead => ({
      ...lead,
      follows: followRecords
        .filter(f => f.leadId === lead.id)
        .sort((a, b) => b.createdAt - a.createdAt),
    }))
    .sort((a, b) => b.createdAt - a.createdAt);
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, CORS_HEADERS);
    res.end();
    return;
  }

  const sendJSON = (data, statusCode = 200) => {
    res.writeHead(statusCode, {
      'Content-Type': 'application/json; charset=utf-8',
      ...CORS_HEADERS,
    });
    res.end(JSON.stringify(data));
  };

  const urlPath = req.url.split('?')[0];
  const query = parseQueryParams(req.url);

  if (urlPath.startsWith('/api/')) {
    const data = readData();
    data.projects = (data.projects || []).map(normalizeProject);
    data.leads = data.leads || [];
    data.followRecords = data.followRecords || [];

    if ((urlPath === '/api/projects' || urlPath === '/api/opportunities') && req.method === 'GET') {
      sendJSON(filterProjects(data.projects, query));
      return;
    }

    if (urlPath.startsWith('/api/projects/') && req.method === 'GET') {
      const id = urlPath.substring('/api/projects/'.length);
      const project = data.projects.find(p => p.id === id);
      sendJSON(project || { error: '项目不存在' }, project ? 200 : 404);
      return;
    }

    if (urlPath === '/api/projects' && req.method === 'POST') {
      try {
        const payload = normalizeProject(await readBody(req));
        if (!payload.title || !payload.city || !payload.district || !payload.projectType) {
          sendJSON({ error: '缺少必填字段' }, 400);
          return;
        }
        payload.id = generateId(payload.opportunityType === 'transfer' ? 't' : 'p');
        payload.createdAt = Date.now();
        payload.updatedAt = Date.now();
        data.projects.push(payload);
        writeData(data);
        sendJSON(payload, 201);
      } catch {
        sendJSON({ error: '无效的 JSON 数据' }, 400);
      }
      return;
    }

    if (urlPath.startsWith('/api/projects/') && req.method === 'PUT') {
      const id = urlPath.substring('/api/projects/'.length);
      try {
        const index = data.projects.findIndex(p => p.id === id);
        if (index === -1) {
          sendJSON({ error: '项目不存在' }, 404);
          return;
        }
        data.projects[index] = normalizeProject({
          ...data.projects[index],
          ...(await readBody(req)),
          id,
          updatedAt: Date.now(),
        });
        writeData(data);
        sendJSON(data.projects[index]);
      } catch {
        sendJSON({ error: '无效的 JSON 数据' }, 400);
      }
      return;
    }

    if (urlPath.startsWith('/api/projects/') && req.method === 'DELETE') {
      const id = urlPath.substring('/api/projects/'.length);
      const index = data.projects.findIndex(p => p.id === id);
      if (index === -1) {
        sendJSON({ error: '项目不存在' }, 404);
        return;
      }
      data.projects.splice(index, 1);
      writeData(data);
      sendJSON({ success: true });
      return;
    }

    if (urlPath === '/api/leads' && req.method === 'GET') {
      let result = [...data.leads];
      if (query.phone) result = result.filter(l => l.phone === query.phone);
      if (query.projectId) result = result.filter(l => l.projectId === query.projectId);
      if (query.status && query.status !== ALL) result = result.filter(l => l.status === query.status);
      if (query.leadType && query.leadType !== ALL) result = result.filter(l => (l.leadType || 'leasing') === query.leadType);
      sendJSON(withFollows(result, data.followRecords));
      return;
    }

    if (urlPath === '/api/leads' && req.method === 'POST') {
      try {
        const payload = normalizeLead(await readBody(req), data.projects);
        if (!payload.name || !payload.phone) {
          sendJSON({ error: '称呼和手机号为必填项' }, 400);
          return;
        }
        if (!/^1[3-9]\d{9}$/.test(payload.phone)) {
          sendJSON({ error: '手机号格式不正确' }, 400);
          return;
        }
        payload.id = generateId('l');
        payload.createdAt = Date.now();
        payload.updatedAt = Date.now();
        data.leads.push(payload);
        writeData(data);
        sendJSON(payload, 201);
      } catch {
        sendJSON({ error: '无效的 JSON 数据' }, 400);
      }
      return;
    }

    if (urlPath.startsWith('/api/leads/') && req.method === 'PUT') {
      const id = urlPath.substring('/api/leads/'.length);
      try {
        const index = data.leads.findIndex(l => l.id === id);
        if (index === -1) {
          sendJSON({ error: '线索不存在' }, 404);
          return;
        }
        const updateFields = await readBody(req);
        data.leads[index] = {
          ...data.leads[index],
          ...updateFields,
          id,
          updatedAt: Date.now(),
        };
        writeData(data);
        sendJSON(data.leads[index]);
      } catch {
        sendJSON({ error: '无效的 JSON 数据' }, 400);
      }
      return;
    }

    if (urlPath.startsWith('/api/leads/') && urlPath.endsWith('/follow') && req.method === 'POST') {
      const leadId = urlPath.substring('/api/leads/'.length, urlPath.length - '/follow'.length);
      try {
        const record = await readBody(req);
        if (!record.content) {
          sendJSON({ error: '跟进内容不能为空' }, 400);
          return;
        }
        if (!data.leads.some(l => l.id === leadId)) {
          sendJSON({ error: '线索不存在' }, 404);
          return;
        }
        const newFollow = {
          id: generateId('f'),
          leadId,
          content: record.content,
          nextFollowAt: record.nextFollowAt ? parseInt(record.nextFollowAt, 10) : undefined,
          operatorId: record.operatorId || 'admin',
          operatorName: record.operatorName || '系统管理员',
          createdAt: Date.now(),
        };
        data.followRecords.push(newFollow);
        writeData(data);
        sendJSON(newFollow, 201);
      } catch {
        sendJSON({ error: '无效的 JSON 数据' }, 400);
      }
      return;
    }

    if (urlPath.startsWith('/api/leads/') && urlPath.endsWith('/convert') && req.method === 'POST') {
      const leadId = urlPath.substring('/api/leads/'.length, urlPath.length - '/convert'.length);
      const index = data.leads.findIndex(l => l.id === leadId);
      if (index === -1) {
        sendJSON({ error: '线索不存在' }, 404);
        return;
      }
      const lead = data.leads[index];
      if (lead.leadType !== 'transfer') {
        sendJSON({ error: '只有店铺转让类型的线索才能转为招商机会' }, 400);
        return;
      }

      const exists = data.projects.some(p => p.title.includes(`(转让线索ID: ${leadId})`));
      if (exists) {
        sendJSON({ error: '该线索已转换过招商项目' }, 400);
        return;
      }

      const details = lead.transferDetails || {};
      const newProject = normalizeProject({
        id: generateId('p'),
        opportunityType: 'transfer',
        title: `${lead.businessType || '商铺'}转让 (${details.locationText || lead.regionPreference || '未指定区域'}) (转让线索ID: ${leadId})`,
        city: '广州',
        district: details.locationText || lead.regionPreference || '',
        addressText: details.locationText || '',
        schoolName: '',
        schoolAlias: '',
        showFullSchoolName: false,
        projectType: '店铺转让',
        areaText: '',
        feeText: details.feeText || '面议',
        suitableBusiness: lead.businessType ? [lead.businessType] : [],
        unsuitableBusiness: [],
        highlights: [],
        trafficTags: [],
        facilityTags: [],
        advisorTips: lead.remark || '',
        customerInfo: '',
        cooperationMode: '承接现有合同',
        viewingTimeText: '需提前预约顾问',
        coverImage: lead.attachments?.[0] || 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=400&q=80',
        images: lead.attachments || [],
        transferInfo: {
          currentBusiness: lead.businessType || '',
          monthlyRent: details.feeText || '',
          remainingTerm: details.remainingTerm || '',
          includesEquipment: !!details.includesEquipment,
          expectedTransferFee: details.transferFee || '',
          contractTransferAllowed: '待核实',
        },
        status: 'draft',
        auditStatus: 'pending',
        isRecommended: false,
        sort: 0,
        remark: `由店铺转让线索一键生成。联系人：${lead.name}，电话：${lead.phone}`,
        createdAt: Date.now(),
        updatedAt: Date.now()
      });

      data.projects.push(newProject);
      
      data.leads[index] = {
        ...lead,
        status: 'viewed',
        remark: `${lead.remark || ''}\n【系统提示】已于 ${new Date().toLocaleString()} 一键转为招商项目草稿 (ID: ${newProject.id})。`.trim(),
        updatedAt: Date.now()
      };

      writeData(data);
      sendJSON({ success: true, projectId: newProject.id, projectTitle: newProject.title });
      return;
    }

    if (urlPath === '/api/equipments' && req.method === 'GET') {
      let list = [...data.leads];
      list = list.filter(l => 
        ['equipment_sell', 'equipment_buy', 'equipment_recycle'].includes(l.leadType) &&
        !['closed', 'invalid', 'paused'].includes(l.status)
      );
      if (query.leadType && query.leadType !== ALL) {
        list = list.filter(l => l.leadType === query.leadType);
      }
      const mapped = list.map(l => ({
        id: l.id,
        leadType: l.leadType,
        businessType: l.businessType,
        budgetRange: l.budgetRange,
        regionPreference: l.regionPreference,
        remark: l.remark,
        equipmentDetails: l.equipmentDetails,
        attachments: l.attachments || [],
        createdAt: l.createdAt
      })).sort((a, b) => b.createdAt - a.createdAt);
      sendJSON(mapped);
      return;
    }

    if (urlPath === '/api/stats' && req.method === 'GET') {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const monthStart = new Date();
      monthStart.setDate(1);
      monthStart.setHours(0, 0, 0, 0);

      const leadTypeCounts = data.leads.reduce((acc, lead) => {
        const type = lead.leadType || 'leasing';
        acc[type] = (acc[type] || 0) + 1;
        return acc;
      }, {});
      const projectLeadCounts = data.leads.reduce((acc, lead) => {
        if (lead.projectId) acc[lead.projectId] = (acc[lead.projectId] || 0) + 1;
        return acc;
      }, {});

      sendJSON({
        totalProjects: data.projects.length,
        onlineProjects: data.projects.filter(p => p.status === 'online').length,
        transferProjects: data.projects.filter(p => p.opportunityType === 'transfer').length,
        equipmentLeads: data.leads.filter(l => ['equipment_sell', 'equipment_buy'].includes(l.leadType)).length,
        todayLeads: data.leads.filter(l => l.createdAt >= todayStart.getTime()).length,
        monthLeads: data.leads.filter(l => l.createdAt >= monthStart.getTime()).length,
        pendingLeads: data.leads.filter(l => l.status === 'new').length,
        closedLeads: data.leads.filter(l => l.status === 'closed').length,
        leadTypeCounts,
        popularProjects: data.projects
          .map(p => ({
            id: p.id,
            title: p.title,
            schoolName: p.schoolName,
            leadCount: projectLeadCounts[p.id] || 0,
          }))
          .sort((a, b) => b.leadCount - a.leadCount)
          .slice(0, 5),
      });
      return;
    }

    sendJSON({ error: '接口不存在' }, 404);
    return;
  }

  let filePath = '';
  const decodedUrl = decodeURIComponent(urlPath);
  if (decodedUrl === '/' || decodedUrl === '/admin' || decodedUrl === '/admin/') {
    filePath = path.join(__dirname, 'admin', 'index.html');
  } else if (decodedUrl.startsWith('/admin/')) {
    filePath = path.join(__dirname, decodedUrl);
  } else {
    filePath = path.join(__dirname, decodedUrl);
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('404 Not Found');
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, { 'Content-Type': MIME_TYPES[ext] || 'application/octet-stream' });
    fs.createReadStream(filePath).pipe(res);
  });
});

const PORT = 5173;
server.listen(PORT, '0.0.0.0', () => {
  console.log('===================================================');
  console.log(' 校园商铺招商平台 mock 服务已启动');
  console.log(` API: http://localhost:${PORT}/api`);
  console.log(` 管理后台: http://localhost:${PORT}/admin/index.html`);
  console.log('===================================================');
});
