const API_BASE = '/api';
const ADMIN_ACCESS_KEY = 'local-admin';

const LEAD_TYPE_MAP = {
  leasing: '找铺咨询',
  transfer: '店铺转让',
  equipment_sell: '出售设备',
  equipment_buy: '求购设备',
  equipment_recycle: '回收咨询',
  brand_cooperation: '品牌合作'
};

const STATUS_MAP = {
  new: { name: '新线索', class: 'badge-online' },
  contacted: { name: '已联系', class: 'badge-draft' },
  interested: { name: '意向明确', class: 'badge-draft' },
  viewing_scheduled: { name: '已约看', class: 'badge-coming' },
  viewed: { name: '已看铺/已核实', class: 'badge-coming' },
  negotiating: { name: '谈判中', class: 'badge-coming' },
  closed: { name: '已成交', class: 'badge-online' },
  invalid: { name: '无效', class: 'badge-offline' },
  paused: { name: '暂缓', class: 'badge-offline' }
};

const state = {
  currentView: 'dashboard-view',
  projects: [],
  leads: [],
  selectedLeadId: null,
  activeLeadStatusFilter: '全部',
  activeLeadTypeFilter: '全部',
  leadSearchKeyword: '',
  projectSearchKeyword: '',
  projectFilterOpportunity: '全部',
  projectFilterStatus: '全部'
};

document.addEventListener('DOMContentLoaded', () => {
  initRouter();
  initTime();
  initDashboard();
  initProjectsView();
  initLeadsView();
  loadDashboardData();
});

function initRouter() {
  const menuItems = document.querySelectorAll('.sidebar-menu .menu-item');
  const sections = document.querySelectorAll('.view-section');
  const viewTitle = document.getElementById('view-title');

  menuItems.forEach(item => {
    item.addEventListener('click', e => {
      e.preventDefault();
      menuItems.forEach(mi => mi.classList.remove('active'));
      item.classList.add('active');

      const targetView = item.getAttribute('data-view');
      sections.forEach(sec => sec.classList.remove('active'));
      document.getElementById(targetView).classList.add('active');
      viewTitle.textContent = item.querySelector('.menu-label').textContent;
      state.currentView = targetView;

      if (targetView === 'dashboard-view') loadDashboardData();
      if (targetView === 'projects-view') loadProjectsList();
      if (targetView === 'leads-view') loadLeadsList();
    });
  });

  document.getElementById('logout-btn').addEventListener('click', () => location.reload());
}

function initTime() {
  const timeEl = document.getElementById('server-time');
  const update = () => {
    const now = new Date();
    timeEl.textContent = `系统时间：${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
  };
  update();
  setInterval(update, 1000);
}

function initDashboard() {
  document.querySelectorAll('.stat-card').forEach(card => {
    card.addEventListener('click', () => {
      const filterType = card.getAttribute('data-filter');
      if (filterType === 'transfer') {
        state.projectFilterOpportunity = 'transfer';
        document.getElementById('project-filter-opportunity').value = 'transfer';
        document.querySelector('.sidebar-menu [data-view="projects-view"]').click();
        return;
      }
      if (filterType === 'equipment') {
        state.activeLeadTypeFilter = 'equipment_sell';
        document.getElementById('lead-type-filter').value = 'equipment_sell';
        document.querySelector('.sidebar-menu [data-view="leads-view"]').click();
        return;
      }
      if (filterType === 'online') {
        state.projectFilterStatus = 'online';
        document.getElementById('project-filter-status').value = 'online';
        document.querySelector('.sidebar-menu [data-view="projects-view"]').click();
        return;
      }

      if (filterType === 'pending') state.activeLeadStatusFilter = 'new';
      if (filterType === 'closed') state.activeLeadStatusFilter = 'closed';
      document.querySelectorAll('.leads-status-tabs .status-tab').forEach(tab => {
        tab.classList.toggle('active', tab.getAttribute('data-status') === state.activeLeadStatusFilter);
      });
      document.querySelector('.sidebar-menu [data-view="leads-view"]').click();
    });
  });
}

async function loadDashboardData() {
  const stats = await fetchJSON(`${API_BASE}/stats`);
  document.getElementById('stat-total-projects').textContent = stats.totalProjects;
  document.getElementById('stat-online-projects').textContent = stats.onlineProjects;
  document.getElementById('stat-transfer-projects').textContent = stats.transferProjects;
  document.getElementById('stat-equipment-leads').textContent = stats.equipmentLeads;
  document.getElementById('stat-pending-leads').textContent = stats.pendingLeads;
  document.getElementById('stat-closed-leads').textContent = stats.closedLeads;

  const popularTbody = document.getElementById('popular-projects-tbody');
  popularTbody.innerHTML = '';
  if (stats.popularProjects?.length) {
    stats.popularProjects.forEach((proj, idx) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><span class="badge ${idx === 0 ? 'badge-full' : 'badge-draft'}">${idx + 1}</span></td>
        <td class="font-bold">${escapeHTML(proj.title)}</td>
        <td>${escapeHTML(proj.schoolName || '-')}</td>
        <td class="text-right text-blue font-bold">${proj.leadCount}</td>
      `;
      popularTbody.appendChild(tr);
    });
  } else {
    popularTbody.innerHTML = '<tr><td colspan="4" class="text-center text-muted">暂无数据</td></tr>';
  }

  renderLeadTypeBars(stats.leadTypeCounts || {});
}

function renderLeadTypeBars(counts) {
  const container = document.getElementById('funnel-container');
  container.innerHTML = '';
  const entries = Object.entries(LEAD_TYPE_MAP);
  const maxCount = Math.max(...Object.values(counts), 1);

  entries.forEach(([key, name]) => {
    const count = counts[key] || 0;
    const row = document.createElement('div');
    row.className = 'funnel-row';
    row.innerHTML = `
      <div class="funnel-label">${name}</div>
      <div class="funnel-bar-wrapper">
        <div class="funnel-bar bar-new" style="width: ${(count / maxCount) * 100}%"></div>
      </div>
      <div class="funnel-count">${count}</div>
    `;
    container.appendChild(row);
  });
}

function initProjectsView() {
  document.getElementById('btn-refresh-projects').addEventListener('click', () => loadProjectsList());
  document.getElementById('project-search').addEventListener('input', e => {
    state.projectSearchKeyword = e.target.value.trim();
    loadProjectsList();
  });
  document.getElementById('project-filter-opportunity').addEventListener('change', e => {
    state.projectFilterOpportunity = e.target.value;
    loadProjectsList();
  });
  document.getElementById('project-filter-status').addEventListener('change', e => {
    state.projectFilterStatus = e.target.value;
    loadProjectsList();
  });
}

async function loadProjectsList() {
  const params = new URLSearchParams();
  if (state.projectSearchKeyword) params.set('q', state.projectSearchKeyword);
  if (state.projectFilterOpportunity !== '全部') params.set('opportunityType', state.projectFilterOpportunity);
  if (state.projectFilterStatus !== '全部') params.set('status', state.projectFilterStatus);

  const projects = await fetchJSON(`${API_BASE}/projects?${params.toString()}`);
  state.projects = projects;

  const tbody = document.getElementById('projects-tbody');
  tbody.innerHTML = '';
  if (!projects.length) {
    tbody.innerHTML = '<tr><td colspan="8" class="text-center text-muted">暂无符合筛选的机会</td></tr>';
    return;
  }

  projects.forEach(p => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><img src="${p.coverImage || ''}" class="td-cover-img" alt=""></td>
      <td class="font-bold">${escapeHTML(p.title)}</td>
      <td><span class="badge badge-draft">${p.opportunityType === 'transfer' ? '店铺转让' : '招商铺位'}</span></td>
      <td>${escapeHTML(p.schoolName || p.district || '-')}</td>
      <td>${escapeHTML(p.projectType || '-')}</td>
      <td class="font-bold text-red">${escapeHTML(p.feeText || '-')}</td>
      <td>${renderStatusBadge(p.status, p.opportunityType)}</td>
      <td class="font-bold text-orange">${p.isRecommended ? '是' : '否'}</td>
    `;
    tbody.appendChild(tr);
  });
}

function initLeadsView() {
  document.getElementById('lead-search').addEventListener('input', e => {
    state.leadSearchKeyword = e.target.value.trim();
    loadLeadsList();
  });
  document.getElementById('lead-type-filter').addEventListener('change', e => {
    state.activeLeadTypeFilter = e.target.value;
    loadLeadsList();
  });
  document.querySelectorAll('.leads-status-tabs .status-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.leads-status-tabs .status-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      state.activeLeadStatusFilter = tab.getAttribute('data-status');
      loadLeadsList();
    });
  });
  document.getElementById('btn-submit-follow').addEventListener('click', () => saveFollowRecord());
  document.getElementById('btn-convert-project').addEventListener('click', async () => {
    const id = state.selectedLeadId;
    if (!id) return;
    if (!confirm('确定将该店铺转让线索一键生成招商项目（草稿）吗？')) return;

    try {
      const res = await fetchJSON(`${API_BASE}/leads/${id}/convert`, {
        method: 'POST'
      });
      alert(`转换成功！已生成项目草稿：${res.projectTitle}\n可进入【机会管理】查看。`);
      await loadLeadsList();
      selectLead(id);
      await loadDashboardData();
    } catch (err) {
      alert(`转换失败：${err.message}`);
    }
  });
}

async function loadLeadsList() {
  const params = new URLSearchParams();
  if (state.activeLeadStatusFilter !== '全部') params.set('status', state.activeLeadStatusFilter);
  if (state.activeLeadTypeFilter !== '全部') params.set('leadType', state.activeLeadTypeFilter);
  let leads = await fetchJSON(`${API_BASE}/leads?${params.toString()}`);

  if (state.leadSearchKeyword) {
    const k = state.leadSearchKeyword.toLowerCase();
    leads = leads.filter(l => (l.name || '').toLowerCase().includes(k) || (l.phone || '').includes(k));
  }

  state.leads = leads;
  const listScroll = document.getElementById('leads-list-scroll');
  listScroll.innerHTML = '';
  if (!leads.length) {
    listScroll.innerHTML = '<div class="text-center text-muted" style="padding:40px 0;">无线索</div>';
    clearLeadDetail();
    return;
  }

  leads.forEach(lead => {
    const st = STATUS_MAP[lead.status] || { name: lead.status, class: 'badge-draft' };
    const item = document.createElement('div');
    item.className = `lead-item-card ${state.selectedLeadId === lead.id ? 'active' : ''}`;
    item.dataset.id = lead.id;
    item.innerHTML = `
      <div class="card-row-top">
        <span class="card-cust-name">${escapeHTML(lead.name)} · ${escapeHTML(LEAD_TYPE_MAP[lead.leadType] || lead.leadType || '找铺咨询')}</span>
        <span class="badge ${st.class}">${st.name}</span>
      </div>
      <div class="card-row-mid ellipsis">${escapeHTML(lead.projectTitle || lead.businessType || '自主提交需求')}</div>
      <div class="card-row-bottom">
        <span>${escapeHTML(lead.phone || '-')}</span>
        <span>${new Date(lead.createdAt).toLocaleDateString()}</span>
      </div>
    `;
    item.addEventListener('click', () => selectLead(lead.id));
    listScroll.appendChild(item);
  });
}

function clearLeadDetail() {
  state.selectedLeadId = null;
  document.getElementById('lead-detail-placeholder').style.display = 'flex';
  document.getElementById('lead-detail-panel').style.display = 'none';
}

function selectLead(id) {
  state.selectedLeadId = id;
  document.querySelectorAll('.lead-item-card').forEach(card => {
    card.classList.toggle('active', card.dataset.id === id);
  });

  const lead = state.leads.find(item => item.id === id);
  if (!lead) return;

  document.getElementById('lead-detail-placeholder').style.display = 'none';
  document.getElementById('lead-detail-panel').style.display = 'block';
  document.getElementById('lead-det-name').textContent = lead.name || '-';
  document.getElementById('lead-det-phone').textContent = lead.phone || '-';
  document.getElementById('lead-det-type').textContent = LEAD_TYPE_MAP[lead.leadType] || lead.leadType || '找铺咨询';
  document.getElementById('lead-det-business').textContent = lead.businessType || '-';
  document.getElementById('lead-det-budget').textContent = lead.budgetRange || '-';
  document.getElementById('lead-det-region').textContent = lead.regionPreference || '-';
  document.getElementById('lead-det-project').textContent = lead.projectTitle || '-';
  document.getElementById('lead-det-remark').textContent = lead.remark || '-';
  document.getElementById('lead-det-date').textContent = `提交时间：${new Date(lead.createdAt).toLocaleString()}`;
  document.getElementById('follow-status').value = lead.status || 'new';
  document.getElementById('follow-content').value = '';
  document.getElementById('follow-next-date').value = '';

  const st = STATUS_MAP[lead.status] || { name: lead.status, class: 'badge-draft' };
  const badge = document.getElementById('lead-det-status-badge');
  badge.textContent = st.name;
  badge.className = `badge ${st.class}`;

  const convertBtn = document.getElementById('btn-convert-project');
  if (lead.leadType === 'transfer' && lead.status !== 'viewed' && lead.status !== 'closed') {
    convertBtn.style.display = 'inline-flex';
  } else {
    convertBtn.style.display = 'none';
  }

  renderTimeline(lead.follows || []);
}

function renderTimeline(follows) {
  const timeline = document.getElementById('lead-det-timeline');
  timeline.innerHTML = '';
  if (!follows.length) {
    timeline.innerHTML = '<p class="text-muted" style="font-size:13px; text-align:center; padding: 20px 0;">暂无跟进记录</p>';
    return;
  }

  follows.forEach(f => {
    const item = document.createElement('div');
    item.className = 'timeline-item';
    item.innerHTML = `
      <div class="timeline-marker"></div>
      <div class="timeline-box">
        <div class="timeline-meta">
          <span class="timeline-operator">跟进人：${escapeHTML(f.operatorName || '系统客服')}</span>
          <span class="timeline-date">${new Date(f.createdAt).toLocaleString()}</span>
        </div>
        <p class="timeline-msg">${escapeHTML(f.content)}</p>
        ${f.nextFollowAt ? `<div class="timeline-next">下次跟进：${new Date(f.nextFollowAt).toLocaleDateString()}</div>` : ''}
      </div>
    `;
    timeline.appendChild(item);
  });
}

async function saveFollowRecord() {
  const id = state.selectedLeadId;
  if (!id) return;

  const content = document.getElementById('follow-content').value.trim();
  const status = document.getElementById('follow-status').value;
  const nextFollowDateVal = document.getElementById('follow-next-date').value;
  if (!content) {
    alert('请填写本次跟进内容');
    return;
  }

  await fetchJSON(`${API_BASE}/leads/${id}/follow`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      content,
      nextFollowAt: nextFollowDateVal ? new Date(nextFollowDateVal).getTime() : undefined,
      operatorName: '招商顾问'
    })
  });
  await fetchJSON(`${API_BASE}/leads/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status })
  });
  await loadLeadsList();
  selectLead(id);
  loadDashboardData();
}

function renderStatusBadge(status) {
  const map = {
    draft: '<span class="badge badge-draft">草稿</span>',
    online: '<span class="badge badge-online">开放中</span>',
    coming: '<span class="badge badge-coming">即将开放</span>',
    full: '<span class="badge badge-full">已满/已转</span>',
    offline: '<span class="badge badge-offline">已下架</span>'
  };
  return map[status] || escapeHTML(status || '-');
}

async function fetchJSON(url, options = {}) {
  const headers = {
    'X-Admin-Access': ADMIN_ACCESS_KEY,
    ...(options.headers || {}),
  };
  const res = await fetch(url, { ...options, headers });
  if (!res.ok) {
    let message = '请求失败';
    try {
      const err = await res.json();
      message = err.error || message;
    } catch {}
    throw new Error(message);
  }
  return res.json();
}

function escapeHTML(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}
