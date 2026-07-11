import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_FILE = path.join(__dirname, 'data.json');

const ALL = '全部';
const PUBLIC_STATUSES = new Set(['online', 'coming', 'full']);
const LEAD_USER_FIELDS = [
  'name', 'phone', 'businessType', 'budgetRange', 'regionPreference', 'hasCampusExperience',
  'transferDetails', 'equipmentDetails', 'renovationDetails', 'attachments', 'remark', 'leadType', 'sourceChannel', 'projectId',
];

function getCORSHeaders(req) {
  const origin = req ? req.headers.origin : '';
  const isAllowed = origin && (
    origin.startsWith('http://localhost:') ||
    origin.startsWith('http://127.0.0.1:') ||
    origin.startsWith('http://192.168.') ||
    origin.startsWith('http://10.')
  );
  return {
    'Access-Control-Allow-Origin': isAllowed ? origin : 'http://localhost:5173',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Dev-OpenId',
    'Access-Control-Max-Age': '86400',
  };
}

function pickLeadUserFields(input = {}) {
  const patch = {};
  LEAD_USER_FIELDS.forEach(key => {
    if (input[key] !== undefined) patch[key] = input[key];
  });
  return patch;
}

function maskPublicRegion(value) {
  const text = String(value || '').trim();
  if (!text) return '';
  return text.length > 10 ? `${text.slice(0, 10)}…` : text;
}

function truncatePublicText(value, max = 80) {
  const text = String(value || '').trim();
  if (!text) return '';
  return text.length > max ? `${text.slice(0, max)}…` : text;
}

function readData() {
  try {
    if (!fs.existsSync(DATA_FILE)) {
      return { projects: [], leads: [] };
    }
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  } catch (e) {
    console.error('Error reading data file:', e);
    return { projects: [], leads: [] };
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
  if (prefix === 'l') {
    const data = readData();
    const leads = data.leads || [];
    const maxId = leads.reduce((max, l) => {
      const cleaned = String(l.id).replace(/^l_?/, '');
      const num = parseInt(cleaned, 10);
      return (!isNaN(num) && num > max) ? num : max;
    }, 26000000);
    return String(maxId + 1);
  }
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
    const MAX_SIZE = 1024 * 1024; // 1MB limit
    req.on('data', chunk => {
      body += chunk;
      if (body.length > MAX_SIZE) {
        req.destroy();
        reject(new Error('Payload too large'));
      }
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
    result = result.filter(p => PUBLIC_STATUSES.has(p.status));
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

const server = http.createServer(async (req, res) => {
  const corsHeaders = getCORSHeaders(req);
  if (req.method === 'OPTIONS') {
    res.writeHead(204, corsHeaders);
    res.end();
    return;
  }

  const sendJSON = (data, statusCode = 200) => {
    res.writeHead(statusCode, {
      'Content-Type': 'application/json; charset=utf-8',
      ...corsHeaders,
    });
    res.end(JSON.stringify(data));
  };


  const urlPath = req.url.split('?')[0];
  const query = parseQueryParams(req.url);

  if (urlPath.startsWith('/api/')) {
    const data = readData();
    data.projects = (data.projects || []).map(normalizeProject);
    data.leads = data.leads || [];

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

    if (urlPath === '/api/leads' && req.method === 'GET') {
      let result = [...data.leads];
      if (query.phone) result = result.filter(l => l.phone === query.phone);
      if (query.projectId) result = result.filter(l => l.projectId === query.projectId);
      if (query.status && query.status !== ALL) result = result.filter(l => l.status === query.status);
      if (query.leadType && query.leadType !== ALL) result = result.filter(l => (l.leadType || 'leasing') === query.leadType);
      sendJSON(result.sort((a, b) => b.createdAt - a.createdAt));
      return;
    }

    const leadItemMatch = urlPath.match(/^\/api\/leads\/([^/]+)$/);
    if (leadItemMatch && req.method === 'GET') {
      const id = leadItemMatch[1];
      const lead = data.leads.find(l => l.id === id);
      if (!lead) {
        sendJSON({ error: '线索不存在' }, 404);
        return;
      }
      sendJSON(lead);
      return;
    }

    if (urlPath === '/api/leads' && req.method === 'POST') {
      try {
        const rawBody = await readBody(req);
        const userFields = pickLeadUserFields(rawBody);
        const payload = normalizeLead(userFields, data.projects);
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

    if (leadItemMatch && req.method === 'PUT') {
      const id = leadItemMatch[1];
      try {
        const index = data.leads.findIndex(l => l.id === id);
        if (index === -1) {
          sendJSON({ error: '线索不存在' }, 404);
          return;
        }
        const updateFields = pickLeadUserFields(await readBody(req));
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

    if (leadItemMatch && req.method === 'DELETE') {
      const id = leadItemMatch[1];
      const index = data.leads.findIndex(l => l.id === id);
      if (index === -1) {
        sendJSON({ error: '线索不存在' }, 404);
        return;
      }
      data.leads.splice(index, 1);
      writeData(data);
      sendJSON({ success: true });
      return;
    }

    if (urlPath === '/api/equipments' && req.method === 'GET') {
      let list = [...data.leads];
      list = list.filter(l => 
        ['equipment_sell', 'equipment_buy', 'equipment_recycle'].includes(l.leadType) &&
        (l.equipmentPublication?.status === 'online' || (l.equipmentPublication?.publishStatus === 'approved' && l.equipmentPublication?.isPublic))
      );
      if (query.leadType && query.leadType !== ALL) {
        list = list.filter(l => l.leadType === query.leadType);
      }
      const mapped = list.map(l => ({
        id: l.id,
        leadType: l.leadType,
        businessType: l.businessType,
        budgetRange: l.budgetRange,
        regionPreference: maskPublicRegion(l.regionPreference),
        remark: truncatePublicText(l.equipmentPublication?.publicRemark),
        equipmentDetails: l.equipmentDetails,
        attachments: l.attachments || [],
        createdAt: l.createdAt
      })).sort((a, b) => b.createdAt - a.createdAt);
      sendJSON(mapped);
      return;
    }

    sendJSON({ error: '接口不存在' }, 404);
    return;
  }

  res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8', ...corsHeaders });
  res.end(JSON.stringify({ error: 'Mock 服务仅提供 /api 接口' }));
});

const PORT = 5173;
server.listen(PORT, '0.0.0.0', () => {
  console.log('===================================================');
  console.log(' 校园商铺小程序 Mock API 已启动');
  console.log(` API: http://localhost:${PORT}/api`);
  console.log('===================================================');
});
