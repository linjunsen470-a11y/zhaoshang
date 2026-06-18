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

// 读取数据库
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

// 写入数据库
function writeData(data) {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
  } catch (e) {
    console.error('Error writing data file:', e);
  }
}

// 辅助方法：解析预算档次
function getProjectBudgetCategory(project) {
  const text = project.feeText || "";
  if (text.includes("面议")) return "面议";
  if (text.includes("扣点") || text.includes("抽成")) return "面议";
  
  let yearly = 0;
  // 匹配数字（支持小数）
  const match = text.match(/([\d\.]+)/);
  if (match) {
    const val = parseFloat(match[1]);
    if (text.includes("月")) {
      yearly = val * 12;
    } else {
      yearly = val;
    }
  }

  if (yearly === 0) return "面议";
  if (yearly < 5) return "5万以内";
  if (yearly <= 10) return "5-10万";
  if (yearly <= 20) return "10-20万";
  if (yearly <= 50) return "20-50万";
  return "50万以上";
}

// 辅助方法：生成ID
function generateId(prefix) {
  return prefix + Math.random().toString(36).substring(2, 9);
}

// 解析 Query 参数
function parseQueryParams(urlStr) {
  const params = {};
  const urlParts = urlStr.split('?');
  if (urlParts.length > 1) {
    const queryStr = urlParts[1];
    const pairs = queryStr.split('&');
    for (const pair of pairs) {
      const [key, value] = pair.split('=');
      if (key) {
        params[decodeURIComponent(key)] = decodeURIComponent(value || '');
      }
    }
  }
  return params;
}

// CORS 跨域响应头
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Max-Age': '86400',
};

const server = http.createServer((req, res) => {
  // 处理 OPTIONS 预检请求
  if (req.method === 'OPTIONS') {
    res.writeHead(204, CORS_HEADERS);
    res.end();
    return;
  }

  // 统一响应 JSON 辅助函数
  const sendJSON = (data, statusCode = 200) => {
    res.writeHead(statusCode, {
      'Content-Type': 'application/json; charset=utf-8',
      ...CORS_HEADERS,
    });
    res.end(JSON.stringify(data));
  };

  // 解析 URL
  const urlPath = req.url.split('?')[0];
  const query = parseQueryParams(req.url);

  console.log(`[${req.method}] ${req.url}`);

  // ==================== API ROUTES ====================
  if (urlPath.startsWith('/api/')) {
    const data = readData();

    // 1. GET /api/projects - 获取/筛选项目列表
    if (urlPath === '/api/projects' && req.method === 'GET') {
      let result = [...data.projects];

      // 按关键词搜索 (学校、区域、业态、标题)
      if (query.q) {
        const q = query.q.toLowerCase().trim();
        result = result.filter(p => 
          p.title.toLowerCase().includes(q) ||
          (p.schoolName && p.schoolName.toLowerCase().includes(q)) ||
          p.district.toLowerCase().includes(q) ||
          p.suitableBusiness.some(b => b.toLowerCase().includes(q))
        );
      }

      // 按区域筛选
      if (query.district && query.district !== '全部') {
        result = result.filter(p => p.district === query.district);
      }

      // 按项目类型筛选
      if (query.projectType && query.projectType !== '全部') {
        result = result.filter(p => p.projectType === query.projectType);
      }

      // 按预算筛选
      if (query.budget && query.budget !== '全部') {
        result = result.filter(p => {
          const cat = getProjectBudgetCategory(p);
          return cat === query.budget;
        });
      }

      // 按业态筛选
      if (query.business && query.business !== '全部') {
        result = result.filter(p => p.suitableBusiness.includes(query.business));
      }

      // 按状态筛选
      if (query.status && query.status !== '全部') {
        result = result.filter(p => p.status === query.status);
      }

      // 排序：根据 sort 降序，再按时间降序
      result.sort((a, b) => (b.sort || 0) - (a.sort || 0) || b.createdAt - a.createdAt);

      sendJSON(result);
      return;
    }

    // 2. GET /api/projects/:id - 获取单条项目详情
    if (urlPath.startsWith('/api/projects/') && req.method === 'GET') {
      const id = urlPath.substring('/api/projects/'.length);
      const project = data.projects.find(p => p.id === id);
      if (project) {
        sendJSON(project);
      } else {
        sendJSON({ error: '项目未找到' }, 404);
      }
      return;
    }

    // 3. POST /api/projects - 新增招商项目
    if (urlPath === '/api/projects' && req.method === 'POST') {
      let body = '';
      req.on('data', chunk => body += chunk);
      req.on('end', () => {
        try {
          const newProject = JSON.parse(body);
          newProject.id = generateId('p');
          newProject.createdAt = Date.now();
          newProject.updatedAt = Date.now();
          newProject.sort = parseInt(newProject.sort) || 0;
          newProject.isRecommended = !!newProject.isRecommended;
          
          if (!newProject.title || !newProject.city || !newProject.district || !newProject.projectType) {
            sendJSON({ error: '缺少必填字段' }, 400);
            return;
          }
          
          data.projects.push(newProject);
          writeData(data);
          sendJSON(newProject, 201);
        } catch (e) {
          sendJSON({ error: '无效的JSON数据' }, 400);
        }
      });
      return;
    }

    // 4. PUT /api/projects/:id - 编辑招商项目
    if (urlPath.startsWith('/api/projects/') && req.method === 'PUT') {
      const id = urlPath.substring('/api/projects/'.length);
      let body = '';
      req.on('data', chunk => body += chunk);
      req.on('end', () => {
        try {
          const index = data.projects.findIndex(p => p.id === id);
          if (index === -1) {
            sendJSON({ error: '项目未找到' }, 404);
            return;
          }

          const updateFields = JSON.parse(body);
          const project = data.projects[index];
          
          const updated = {
            ...project,
            ...updateFields,
            id: project.id, // 保护 ID 不被修改
            updatedAt: Date.now()
          };
          
          data.projects[index] = updated;
          writeData(data);
          sendJSON(updated);
        } catch (e) {
          sendJSON({ error: '无效的JSON数据' }, 400);
        }
      });
      return;
    }

    // 5. DELETE /api/projects/:id - 删除招商项目
    if (urlPath.startsWith('/api/projects/') && req.method === 'DELETE') {
      const id = urlPath.substring('/api/projects/'.length);
      const index = data.projects.findIndex(p => p.id === id);
      if (index === -1) {
        sendJSON({ error: '项目未找到' }, 404);
        return;
      }
      data.projects.splice(index, 1);
      writeData(data);
      sendJSON({ success: true });
      return;
    }

    // 6. GET /api/leads - 获取咨询线索列表
    if (urlPath === '/api/leads' && req.method === 'GET') {
      let result = [...data.leads];

      // 用户端拉取自己的咨询：根据手机号过滤
      if (query.phone) {
        result = result.filter(l => l.phone === query.phone);
      }

      // 管理端根据项目过滤
      if (query.projectId) {
        result = result.filter(l => l.projectId === query.projectId);
      }

      // 管理端根据状态过滤
      if (query.status && query.status !== '全部') {
        result = result.filter(l => l.status === query.status);
      }

      // 给线索挂载跟进记录
      result = result.map(lead => {
        const follows = data.followRecords.filter(f => f.leadId === lead.id);
        follows.sort((a, b) => b.createdAt - a.createdAt); // 最新跟进在最前面
        return {
          ...lead,
          follows
        };
      });

      // 降序排序（最新提交在最前面）
      result.sort((a, b) => b.createdAt - a.createdAt);

      sendJSON(result);
      return;
    }

    // 7. POST /api/leads - 提交咨询表单
    if (urlPath === '/api/leads' && req.method === 'POST') {
      let body = '';
      req.on('data', chunk => body += chunk);
      req.on('end', () => {
        try {
          const lead = JSON.parse(body);
          if (!lead.name || !lead.phone || !lead.businessType || !lead.budgetRange) {
            sendJSON({ error: '称呼、手机号、经营品类和投资预算为必填项' }, 400);
            return;
          }
          if (!/^1[3-9]\d{9}$/.test(lead.phone)) {
            sendJSON({ error: '手机号格式不正确' }, 400);
            return;
          }

          lead.id = generateId('l');
          lead.status = 'new'; // 默认为 新咨询
          lead.createdAt = Date.now();
          lead.updatedAt = Date.now();

          // 自动根据项目ID抓取项目标题
          if (lead.projectId) {
            const project = data.projects.find(p => p.id === lead.projectId);
            if (project) {
              lead.projectTitle = project.title;
            }
          }

          data.leads.push(lead);
          writeData(data);
          sendJSON(lead, 201);
        } catch (e) {
          console.error("JSON parse error for /api/leads body:", JSON.stringify(body), "Error:", e.message);
          sendJSON({ error: '无效的JSON数据' }, 400);
        }
      });
      return;
    }

    // 8. PUT /api/leads/:id - 修改线索跟进状态
    if (urlPath.startsWith('/api/leads/') && req.method === 'PUT') {
      const id = urlPath.substring('/api/leads/'.length);
      let body = '';
      req.on('data', chunk => body += chunk);
      req.on('end', () => {
        try {
          const index = data.leads.findIndex(l => l.id === id);
          if (index === -1) {
            sendJSON({ error: '线索未找到' }, 404);
            return;
          }

          const updateFields = JSON.parse(body);
          const lead = data.leads[index];
          
          const updated = {
            ...lead,
            status: updateFields.status || lead.status,
            updatedAt: Date.now()
          };

          data.leads[index] = updated;
          writeData(data);
          sendJSON(updated);
        } catch (e) {
          sendJSON({ error: '无效的JSON数据' }, 400);
        }
      });
      return;
    }

    // 9. POST /api/leads/:id/follow - 添加线索跟进记录
    if (urlPath.startsWith('/api/leads/') && urlPath.endsWith('/follow') && req.method === 'POST') {
      // 提取 leadId: urlPath 是 "/api/leads/l12345/follow"
      const leadId = urlPath.substring('/api/leads/'.length, urlPath.length - '/follow'.length);
      let body = '';
      req.on('data', chunk => body += chunk);
      req.on('end', () => {
        try {
          const record = JSON.parse(body);
          if (!record.content) {
            sendJSON({ error: '跟进内容不能为空' }, 400);
            return;
          }

          const leadExists = data.leads.some(l => l.id === leadId);
          if (!leadExists) {
            sendJSON({ error: '线索不存在' }, 404);
            return;
          }

          const newFollow = {
            id: generateId('f'),
            leadId,
            content: record.content,
            nextFollowAt: record.nextFollowAt ? parseInt(record.nextFollowAt) : undefined,
            operatorId: record.operatorId || 'admin',
            operatorName: record.operatorName || '系统管理员',
            createdAt: Date.now()
          };

          data.followRecords.push(newFollow);
          writeData(data);
          sendJSON(newFollow, 201);
        } catch (e) {
          sendJSON({ error: '无效的JSON数据' }, 400);
        }
      });
      return;
    }

    // 10. GET /api/stats - 数据看板统计
    if (urlPath === '/api/stats' && req.method === 'GET') {
      const totalProjects = data.projects.length;
      const onlineProjects = data.projects.filter(p => p.status === 'online').length;
      
      const todayStart = new Date();
      todayStart.setHours(0,0,0,0);
      const todayStartMs = todayStart.getTime();

      const monthStart = new Date();
      monthStart.setDate(1);
      monthStart.setHours(0,0,0,0);
      const monthStartMs = monthStart.getTime();

      const todayLeads = data.leads.filter(l => l.createdAt >= todayStartMs).length;
      const monthLeads = data.leads.filter(l => l.createdAt >= monthStartMs).length;

      // 统计状态
      const pendingLeads = data.leads.filter(l => l.status === 'new').length;
      const scheduledLeads = data.leads.filter(l => l.status === 'viewing_scheduled' || l.status === 'viewed').length;
      const closedLeads = data.leads.filter(l => l.status === 'closed').length;

      // 热门项目排行 (根据提交线索的数量)
      const projectLeadsCount = {};
      data.leads.forEach(l => {
        if (l.projectId) {
          projectLeadsCount[l.projectId] = (projectLeadsCount[l.projectId] || 0) + 1;
        }
      });

      const popularProjects = data.projects.map(p => {
        return {
          id: p.id,
          title: p.title,
          schoolName: p.schoolName,
          leadCount: projectLeadsCount[p.id] || 0
        };
      });
      popularProjects.sort((a, b) => b.leadCount - a.leadCount);

      sendJSON({
        totalProjects,
        onlineProjects,
        todayLeads,
        monthLeads,
        pendingLeads,
        scheduledLeads,
        closedLeads,
        popularProjects: popularProjects.slice(0, 5) // 返回前5个热门
      });
      return;
    }
  }

  // ==================== STATIC FILE SERVING ====================
  // 处理 admin 目录下的静态资源
  let filePath = '';
  const decodedUrl = decodeURIComponent(urlPath);
  
  if (decodedUrl === '/' || decodedUrl === '/admin' || decodedUrl === '/admin/') {
    filePath = path.join(__dirname, 'admin', 'index.html');
  } else if (decodedUrl.startsWith('/admin/')) {
    filePath = path.join(__dirname, decodedUrl);
  } else {
    // 默认回退：如果是 /favicon.ico 等，或者在根路径请求
    filePath = path.join(__dirname, decodedUrl);
  }

  // 检查文件是否存在
  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      // API 未匹配且文件不存在，返回 404
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('404 Not Found');
      return;
    }

    // 根据文件扩展名设置 Content-Type
    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    res.writeHead(200, { 'Content-Type': contentType });
    fs.createReadStream(filePath).pipe(res);
  });
});

const PORT = 5173;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`===================================================`);
  console.log(` 学校商铺招商系统本地服务已启动!`);
  console.log(` API 接口基地址: http://localhost:${PORT}/api`);
  console.log(` Web 管理端地址: http://localhost:${PORT}/admin/index.html`);
  console.log(`===================================================`);
});
