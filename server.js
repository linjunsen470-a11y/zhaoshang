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
  'name', 'phone', 'businessScene', 'businessType', 'budgetRange', 'regionPreference', 'hasCampusExperience',
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
      const num = Number(l.id);
      return (!isNaN(num) && num > max) ? num : max;
    }, 0);
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


const commercialOptions = JSON.parse(fs.readFileSync(path.join(__dirname, 'backend/collections/shared/commercialOptions.json'), 'utf8'));
const sceneOf = p => p.businessScene || '';
const parentId = p => p.parentProject && typeof p.parentProject === 'object' ? p.parentProject.id : p.parentProject;
function isPublic(p, all) {
  if (!p || !PUBLIC_STATUSES.has(p.status) || !commercialOptions.scenes.some(scene => scene.value === sceneOf(p)) || p.projectType === '校外临校铺位') return false;
  if (!parentId(p)) return true;
  const parent = all.find(row => String(row.id) === String(parentId(p)));
  return !!parent && parent.listingKind === 'project' && PUBLIC_STATUSES.has(parent.status) && commercialOptions.scenes.some(scene => scene.value === sceneOf(parent)) && parent.projectType !== '校外临校铺位';
}
function publicProject(p, all) {
  const parent = all.find(row => String(row.id) === String(parentId(p)));
  const { remark, sourceLead, sourceLeadKey, seedKey, ...publicFields } = p;
  return { ...publicFields, listingKind: p.listingKind || 'unit', businessScene: sceneOf(p), parentProject: parent && isPublic(parent, all) ? { id: parent.id, title: parent.title, status: parent.status } : null };
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
  const group = query.sceneGroup && query.sceneGroup !== ALL ? commercialOptions.browseGroups.find(item => item.value === query.sceneGroup) : null;
  if (query.sceneGroup && query.sceneGroup !== ALL && !group) throw new Error('sceneGroup 筛选无效');
  let result = projects.filter(p => isPublic(p, projects)).map(p => publicProject(p, projects));
  if (group) result = result.filter(p => group.scenes.includes(p.businessScene));
  if (query.available === 'true') result = result.filter(project => project.status !== 'full');
  for (const key of ['district', 'projectType', 'status', 'opportunityType', 'businessScene', 'listingKind']) {
    if (query[key] && query[key] !== ALL) result = result.filter(p => p[key] === query[key]);
  }
  if (query.parentProject) result = result.filter(p => String(parentId(p)) === query.parentProject);
  if (query.recommended === 'true') result = result.filter(p => p.isRecommended);
  if (query.ids !== undefined) result = result.filter(p => query.ids.split(',').includes(String(p.id)));
  if (query.business && query.business !== ALL) result = result.filter(p => p.suitableBusiness.includes(query.business));
  if (query.q) {
    const q = query.q.toLowerCase().trim();
    result = result.filter(p => [p.title, p.schoolName, p.schoolAlias, p.venueName, p.district, p.addressText, ...p.suitableBusiness].some(v => String(v || '').toLowerCase().includes(q)));
  }
  for (const [key, ranges, min, max] of [['area', commercialOptions.areas, 'areaMin', 'areaMax'], ['rent', commercialOptions.rents, 'monthlyRentMin', 'monthlyRentMax']]) {
    if (!query[key] || query[key] === ALL) continue;
    const range = ranges.find(r => r.value === query[key]);
    if (!range) throw new Error('筛选无效');
    result = result.filter(p => typeof p[min] === 'number' && typeof p[max] === 'number' && p[max] >= range.min && (range.max === null || p[min] < range.max));
  }
  const timestamp = v => typeof v === 'number' ? v : Date.parse(v) || 0;
  result.sort((a, b) => (query.sort === 'latest' ? 0 : b.sort - a.sort) || timestamp(b.createdAt) - timestamp(a.createdAt) || String(b.id).localeCompare(String(a.id)));
  const page = Math.max(1, Math.floor(Number(query.page) || 1));
  const limit = Math.min(100, Math.max(1, Math.floor(Number(query.limit) || 20)));
  const totalDocs = result.length, totalPages = Math.ceil(totalDocs / limit);
  const docs = result.slice((page - 1) * limit, page * limit);
  return { docs, page, totalDocs, totalPages, hasNextPage: page < totalPages };
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
      try { sendJSON(filterProjects(data.projects, query)); } catch (error) { sendJSON({ error: error.message }, 400); }
      return;
    }

    if (urlPath.startsWith('/api/projects/') && req.method === 'GET') {
      const id = urlPath.substring('/api/projects/'.length);
      const project = data.projects.find(p => String(p.id) === id && isPublic(p, data.projects));
      sendJSON(project ? publicProject(project, data.projects) : { error: '项目不存在' }, project ? 200 : 404);
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
        if (!payload.phone) {
          sendJSON({ error: '手机号为必填项' }, 400);
          return;
        }
        if (!/^1[3-9]\d{9}$/.test(payload.phone)) {
          sendJSON({ error: '手机号格式不正确' }, 400);
          return;
        }
        if (payload.leadType === 'transfer' && !String(payload.transferDetails?.locationText || '').trim()) {
          sendJSON({ error: '请填写店铺所在城市或区域' }, 400);
          return;
        }
        if (['equipment_sell', 'equipment_buy', 'equipment_recycle'].includes(payload.leadType) && !String(payload.equipmentDetails?.equipmentName || '').trim()) {
          sendJSON({ error: '请填写设备名称' }, 400);
          return;
        }
        if (payload.projectId) {
          const project = data.projects.find(p => String(p.id) === String(payload.projectId));
          if (!isPublic(project, data.projects) || project.status === 'full') { sendJSON({ error: '该项目暂不接受咨询' }, 400); return; }
          payload.businessScene = sceneOf(project);
        }
        payload.customerSnapshot = { ...payload, capturedAt: new Date().toISOString() };
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
        delete updateFields.projectId;
        if (data.leads[index].projectId) delete updateFields.businessScene;
        for (const key of ['transferDetails', 'equipmentDetails', 'renovationDetails']) {
          if (updateFields[key] && typeof updateFields[key] === 'object') {
            updateFields[key] = { ...(data.leads[index][key] || {}), ...updateFields[key] };
          }
        }
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
server.listen(PORT, '127.0.0.1', () => {
  console.log('===================================================');
  console.log(' 校园商铺小程序 Mock API 已启动');
  console.log(` API: http://localhost:${PORT}/api`);
  console.log('===================================================');
});
