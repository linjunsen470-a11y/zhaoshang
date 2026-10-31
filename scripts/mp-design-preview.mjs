import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { createStorage, loadMiniProgramModule } from '../tests/helpers/load-cjs.mjs';

// Static layout review from the real WXML/WXSS. Native controls and interactions
// must also be checked in WeChat; this is explicitly a browser layout preview.
const root = path.resolve('mp');
const output = path.resolve('test-results/visual-refresh/preview');
fs.mkdirSync(output, { recursive: true });
const pages = ['index', 'list', 'detail', 'apply', 'transfer', 'equipment', 'renovation', 'my', 'leads', 'equipment-list', 'success', 'privacy'];
const storage = createStorage();
const app = { globalData: { useLocalMock: true, userInfo: {}, devOpenId: 'visual-review', apiUrl: 'http://127.0.0.1:5174/api' } };
const wx = { ...storage, getAccountInfoSync: () => ({ miniProgram: { envVersion: 'develop' } }), showToast() {}, showLoading() {}, hideLoading() {}, showModal() {}, pageScrollTo() {}, setNavigationBarTitle() {}, navigateTo() {}, navigateBack() {}, stopPullDownRefresh() {} };
const globals = { wx, getApp: () => app, Behavior: value => value };
const api = loadMiniProgramModule(path.join(root, 'services/api.js'), { globals });
const projects = await api.getProjects({ public: true });
storage.setStorageSync('userInfo', { nickname: '陈先生', phone: '13800000000' });
storage.setStorageSync('local_leads', [
  { id: 'visual-1', submitterOpenId: 'visual-review', name: '陈先生', phone: '13800000000', leadType: 'leasing', projectTitle: '【演示】社区商业项目招商', projectId: 'demo-community', businessType: '咖啡', budgetRange: '10-20万', regionPreference: '天河', status: 'contacted', remark: '希望选择临街、采光良好的空间，计划下月开业。', createdAt: Date.now() - 86400000 },
  { id: 'visual-2', submitterOpenId: 'visual-review', name: '陈先生', phone: '13800000000', leadType: 'equipment_sell', businessType: '双门冷藏柜', budgetRange: '2800 元，可议', status: 'new', equipmentDetails: { equipmentName: '双门冷藏柜', specText: '双门 · 220V', equipmentCondition: '正常使用，九成新', expectedPrice: '2800 元，可议' }, regionPreference: '广州天河', equipmentPublication: { status: 'online', publicRemark: '可预约看设备，支持同城自提。' }, createdAt: Date.now() }
]);
for (const name of pages) {
  let definition;
  loadMiniProgramModule(path.join(root, 'pages/' + name + '/' + name + '.js'), { globals: { ...globals, Page: value => { definition = value; } }, stubs: { '../../services/api.js': api } });
  const behaviors = definition.behaviors || [];
  const instance = { ...Object.assign({}, ...behaviors.map(b => b.methods)), ...definition, data: structuredClone(Object.assign({}, ...behaviors.map(b => b.data), definition.data)), setData(patch, callback) { Object.assign(this.data, patch); if (callback) callback(); } };
  if (instance.onLoad) instance.onLoad(name === 'detail' ? { id: 'demo-community' } : {});
  if (instance.onShow) instance.onShow();
  await new Promise(resolve => setTimeout(resolve, 20));
  if (name === 'list') instance.data.moreGroups = loadMiniProgramModule(path.join(root, 'utils/projectFilters.js')).moreGroups(instance.data.filters);
  fs.writeFileSync(path.join(output, name + '.json'), JSON.stringify(instance.data));
}
fs.copyFileSync('scripts/mp-preview.html', path.join(output, 'index.html'));
console.log('Built source-based design previews: ' + output);
if (process.argv.includes('--serve')) http.createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');
  if (url.searchParams.has('phase')) {
    res.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('此预览只支持当前源码');
    return;
  }
  if (url.pathname === '/api/projects') { res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify({ docs: projects, page: 1, totalDocs: projects.length, totalPages: 1, hasNextPage: false })); return; }
  let base = output;
  let pathname = url.pathname;
  if (pathname.startsWith('/images/')) base = root;
  if (pathname.startsWith('/source/')) {
    pathname = pathname.slice(7);
    base = root;
  }
  const file = path.resolve(base, '.' + (pathname === '/' ? '/index.html' : decodeURIComponent(pathname)));
  if (!file.startsWith(base + path.sep)) { res.writeHead(403); res.end(); return; }
  try {
    const mime = { '.jpg': 'image/jpeg', '.png': 'image/png', '.json': 'application/json', '.html': 'text/html; charset=utf-8' };
    res.setHeader('Content-Type', mime[path.extname(file)] || 'text/plain; charset=utf-8');
    res.end(fs.readFileSync(file));
  } catch { res.writeHead(404); res.end('Not found'); }
}).listen(5174, '127.0.0.1', () => console.log('Preview: http://127.0.0.1:5174'));
