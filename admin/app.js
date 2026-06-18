// admin/app.js

const API_BASE = '/api';

// 全局状态
const state = {
  currentView: 'dashboard-view',
  projects: [],
  leads: [],
  selectedLeadId: null,
  activeLeadStatusFilter: '全部',
  leadSearchKeyword: '',
  projectSearchKeyword: '',
  projectFilterType: '全部',
  projectFilterStatus: '全部'
};

// 预定义选项
const BUSINESS_OPTIONS = ['快餐', '粉面', '小吃', '奶茶', '咖啡', '便利店', '水果', '文具', '打印', '快递', '维修', '洗衣', '其他'];

// 初始化加载
document.addEventListener('DOMContentLoaded', () => {
  initRouter();
  initTime();
  initDashboard();
  initProjectsView();
  initLeadsView();
  
  // 默认装载看板数据
  loadDashboardData();
});

// ==================== 1. 路由与头部逻辑 ====================
function initRouter() {
  const menuItems = document.querySelectorAll('.sidebar-menu .menu-item');
  const sections = document.querySelectorAll('.view-section');
  const viewTitle = document.getElementById('view-title');

  menuItems.forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      
      // 切换活动样式
      menuItems.forEach(mi => mi.classList.remove('active'));
      item.classList.add('active');

      // 切换视图显示
      const targetView = item.getAttribute('data-view');
      sections.forEach(sec => sec.classList.remove('active'));
      document.getElementById(targetView).classList.add('active');
      
      // 更改顶部标题
      viewTitle.textContent = item.querySelector('.menu-label').textContent;
      state.currentView = targetView;

      // 切换时触发数据刷新
      if (targetView === 'dashboard-view') {
        loadDashboardData();
      } else if (targetView === 'projects-view') {
        loadProjectsList();
      } else if (targetView === 'leads-view') {
        loadLeadsList();
      }
    });
  });

  // 锁定后台提示
  document.getElementById('logout-btn').addEventListener('click', () => {
    alert('系统已锁定。如需重新管理，请刷新页面。');
    location.reload();
  });
}

function initTime() {
  const timeEl = document.getElementById('server-time');
  const update = () => {
    const now = new Date();
    timeEl.textContent = `系统时间：${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')} ${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}:${String(now.getSeconds()).padStart(2,'0')}`;
  };
  update();
  setInterval(update, 1000);
}

// ==================== 2. 看板视图逻辑 ====================
function initDashboard() {
  // 点击看板卡片可以快捷切换视图并启用过滤
  const cards = document.querySelectorAll('.stat-card');
  cards.forEach(card => {
    card.addEventListener('click', () => {
      const filterType = card.getAttribute('data-filter');
      
      if (filterType === 'all' || filterType === 'online') {
        // 跳转到项目管理并设置状态
        const filterVal = filterType === 'online' ? 'online' : '全部';
        document.getElementById('project-filter-status').value = filterVal;
        state.projectFilterStatus = filterVal;
        
        // 触发菜单点击跳转
        document.querySelector('.sidebar-menu [data-view="projects-view"]').click();
      } else {
        // 跳转到线索跟进
        let statusVal = '全部';
        if (filterType === 'pending') statusVal = 'new';
        if (filterType === 'closed') statusVal = 'closed';
        
        state.activeLeadStatusFilter = statusVal;
        
        // 激活线索页面中的Tab样式
        const tabs = document.querySelectorAll('.leads-status-tabs .status-tab');
        tabs.forEach(t => {
          if (t.getAttribute('data-status') === statusVal) {
            t.classList.add('active');
          } else {
            t.classList.remove('active');
          }
        });

        document.querySelector('.sidebar-menu [data-view="leads-view"]').click();
      }
    });
  });
}

async function loadDashboardData() {
  try {
    const res = await fetch(`${API_BASE}/stats`);
    if (!res.ok) throw new Error('Failed to load stats');
    const stats = await res.json();

    // 填充数据卡片
    document.getElementById('stat-total-projects').textContent = stats.totalProjects;
    document.getElementById('stat-online-projects').textContent = stats.onlineProjects;
    document.getElementById('stat-today-leads').textContent = stats.todayLeads;
    document.getElementById('stat-month-leads').textContent = stats.monthLeads;
    document.getElementById('stat-pending-leads').textContent = stats.pendingLeads;
    document.getElementById('stat-closed-leads').textContent = stats.closedLeads;

    // 渲染热门项目
    const popularTbody = document.getElementById('popular-projects-tbody');
    popularTbody.innerHTML = '';
    
    if (stats.popularProjects && stats.popularProjects.length > 0) {
      stats.popularProjects.forEach((proj, idx) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td><span class="badge ${idx === 0 ? 'badge-full' : (idx === 1 ? 'badge-coming' : 'badge-draft')}">${idx + 1}</span></td>
          <td class="font-bold">${proj.title}</td>
          <td>${proj.schoolName || '-'}</td>
          <td class="text-right text-blue font-bold">${proj.leadCount} 次咨询</td>
        `;
        popularTbody.appendChild(tr);
      });
    } else {
      popularTbody.innerHTML = `<tr><td colspan="4" class="text-center text-muted">暂无数据</td></tr>`;
    }

    // 渲染漏斗图 (以最大值为 100% 宽度折算)
    const funnelContainer = document.getElementById('funnel-container');
    funnelContainer.innerHTML = '';

    const leadRes = await fetch(`${API_BASE}/leads`);
    const leads = await leadRes.json();
    
    // 统计状态值
    const counts = {
      new: 0,
      contact: 0,
      view: 0,
      nego: 0,
      close: 0
    };

    leads.forEach(l => {
      if (l.status === 'new') counts.new++;
      else if (l.status === 'contacted' || l.status === 'interested') counts.contact++;
      else if (l.status === 'viewing_scheduled' || l.status === 'viewed') counts.view++;
      else if (l.status === 'negotiating') counts.nego++;
      else if (l.status === 'closed') counts.close++;
    });

    const maxCount = Math.max(...Object.values(counts), 1); // 防止除以0
    
    const funnelSteps = [
      { key: '新提交 (待联系)', count: counts.new, class: 'bar-new' },
      { key: '已接洽 (沟通中)', count: counts.contact, class: 'bar-contact' },
      { key: '看铺现场约看', count: counts.view, class: 'bar-viewing' },
      { key: '核心合同谈判', count: counts.nego, class: 'bar-negotiating' },
      { key: '签约成交闭环', count: counts.close, class: 'bar-closed' }
    ];

    funnelSteps.forEach(step => {
      const pct = (step.count / maxCount) * 100;
      const row = document.createElement('div');
      row.className = 'funnel-row';
      row.innerHTML = `
        <div class="funnel-label">${step.key}</div>
        <div class="funnel-bar-wrapper">
          <div class="funnel-bar ${step.class}" style="width: ${pct}%"></div>
        </div>
        <div class="funnel-count">${step.count}人</div>
      `;
      funnelContainer.appendChild(row);
    });

  } catch (err) {
    console.error('Error fetching dashboard stats:', err);
  }
}

// ==================== 3. 招商项目管理视图 ====================
function initProjectsView() {
  const btnAdd = document.getElementById('btn-add-project');
  const btnCloseModal = document.getElementById('btn-close-project-modal');
  const btnCancel = document.getElementById('btn-cancel-project');
  const btnSave = document.getElementById('btn-save-project');
  const modal = document.getElementById('project-modal');
  
  const searchInput = document.getElementById('project-search');
  const filterType = document.getElementById('project-filter-type');
  const filterStatus = document.getElementById('project-filter-status');

  // 发布新项目弹窗
  btnAdd.addEventListener('click', () => {
    openProjectModal();
  });

  btnCloseModal.addEventListener('click', () => closeModal());
  btnCancel.addEventListener('click', () => closeModal());

  // 保存数据
  btnSave.addEventListener('click', () => saveProjectData());

  // 绑定过滤器监听
  searchInput.addEventListener('input', (e) => {
    state.projectSearchKeyword = e.target.value;
    loadProjectsList();
  });

  filterType.addEventListener('change', (e) => {
    state.projectFilterType = e.target.value;
    loadProjectsList();
  });

  filterStatus.addEventListener('change', (e) => {
    state.projectFilterStatus = e.target.value;
    loadProjectsList();
  });

  // 渲染多选框格
  renderCheckboxes('form-suitable-businesses-grid', 'suit-biz');
  renderCheckboxes('form-unsuitable-businesses-grid', 'unsuit-biz');
}

function renderCheckboxes(containerId, nameAttr) {
  const container = document.getElementById(containerId);
  container.innerHTML = '';
  BUSINESS_OPTIONS.forEach(biz => {
    const label = document.createElement('label');
    label.className = 'checkbox-label';
    label.innerHTML = `
      <input type="checkbox" name="${nameAttr}" value="${biz}" />
      <span>${biz}</span>
    `;
    container.appendChild(label);
  });
}

async function loadProjectsList() {
  try {
    let url = `${API_BASE}/projects?`;
    if (state.projectSearchKeyword) url += `q=${encodeURIComponent(state.projectSearchKeyword)}&`;
    if (state.projectFilterType !== '全部') url += `projectType=${encodeURIComponent(state.projectFilterType)}&`;
    if (state.projectFilterStatus !== '全部') url += `status=${encodeURIComponent(state.projectFilterStatus)}&`;
    
    const res = await fetch(url);
    const projects = await res.json();
    state.projects = projects;

    const tbody = document.getElementById('projects-tbody');
    tbody.innerHTML = '';

    if (projects.length > 0) {
      projects.forEach(p => {
        const tr = document.createElement('tr');
        
        // 状态映射
        const statusMap = {
          draft: '<span class="badge badge-draft">草稿</span>',
          online: '<span class="badge badge-online">招商中</span>',
          coming: '<span class="badge badge-coming">即将开放</span>',
          full: '<span class="badge badge-full">已满租</span>',
          offline: '<span class="badge badge-offline">已下架</span>'
        };

        const recBtnLabel = p.isRecommended ? '⭐ 取消推荐' : '☆ 设为推荐';
        const statusToggleLabel = p.status === 'online' ? '下架' : '上架';

        tr.innerHTML = `
          <td><img src="${p.coverImage || 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=100&q=80'}" class="td-cover-img" /></td>
          <td class="font-bold">${p.title}</td>
          <td>${p.schoolName || '-'}</td>
          <td>${p.district}</td>
          <td><span class="badge badge-draft" style="color:var(--primary); background-color:#eff6ff;">${p.projectType}</span></td>
          <td class="font-bold text-red">${p.feeText}</td>
          <td>${statusMap[p.status] || p.status}</td>
          <td class="font-bold text-orange">${p.isRecommended ? '是' : '否'}</td>
          <td>
            <div class="action-btn-group">
              <button class="action-icon-btn btn-edit-theme" onclick="editProject('${p.id}')">编辑</button>
              <button class="action-icon-btn btn-rec-theme" onclick="toggleRecommend('${p.id}', ${p.isRecommended})">${recBtnLabel}</button>
              <button class="action-icon-btn btn-edit-theme" style="background-color:#f1f5f9; color:#475569" onclick="toggleStatus('${p.id}', '${p.status}')">${statusToggleLabel}</button>
              <button class="action-icon-btn btn-delete-theme" onclick="deleteProject('${p.id}')">删除</button>
            </div>
          </td>
        `;
        tbody.appendChild(tr);
      });
    } else {
      tbody.innerHTML = `<tr><td colspan="9" class="text-center text-muted">暂无符合过滤的项目数据</td></tr>`;
    }
  } catch (err) {
    console.error('Error loading projects list:', err);
  }
}

// 供行内 onclick 使用的全局映射函数
window.editProject = function(id) {
  const p = state.projects.find(item => item.id === id);
  if (p) openProjectModal(p);
};

window.toggleRecommend = async function(id, current) {
  try {
    const res = await fetch(`${API_BASE}/projects/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isRecommended: !current })
    });
    if (res.ok) {
      loadProjectsList();
    }
  } catch (err) {
    console.error(err);
  }
};

window.toggleStatus = async function(id, currentStatus) {
  const newStatus = currentStatus === 'online' ? 'offline' : 'online';
  try {
    const res = await fetch(`${API_BASE}/projects/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus })
    });
    if (res.ok) {
      loadProjectsList();
    }
  } catch (err) {
    console.error(err);
  }
};

window.deleteProject = async function(id) {
  if (!confirm('确定要永久删除该招商项目吗？删除后关联线索依然保留。')) return;
  try {
    const res = await fetch(`${API_BASE}/projects/${id}`, {
      method: 'DELETE'
    });
    if (res.ok) {
      loadProjectsList();
    }
  } catch (err) {
    console.error(err);
  }
};

// 弹窗操作
function openProjectModal(project = null) {
  const modal = document.getElementById('project-modal');
  const titleEl = document.getElementById('modal-project-title');
  const form = document.getElementById('project-form');
  
  form.reset();
  document.getElementById('form-project-id').value = '';
  
  // 清空多选框
  document.querySelectorAll('input[name="suit-biz"]').forEach(c => c.checked = false);
  document.querySelectorAll('input[name="unsuit-biz"]').forEach(c => c.checked = false);

  if (project) {
    titleEl.textContent = '修改项目资料';
    document.getElementById('form-project-id').value = project.id;
    document.getElementById('form-title').value = project.title;
    document.getElementById('form-type').value = project.projectType;
    document.getElementById('form-city').value = project.city || '广州';
    document.getElementById('form-district').value = project.district;
    document.getElementById('form-address').value = project.addressText || '';
    document.getElementById('form-school').value = project.schoolName || '';
    document.getElementById('form-school-alias').value = project.schoolAlias || '';
    document.getElementById('form-show-full-school').checked = project.showFullSchoolName !== false;
    
    document.getElementById('form-area').value = project.areaText;
    document.getElementById('form-fee').value = project.feeText;
    document.getElementById('form-sort').value = project.sort || 0;
    
    document.getElementById('form-cover-image').value = project.coverImage || '';
    document.getElementById('form-images').value = project.images ? project.images.join(',') : '';
    document.getElementById('form-status').value = project.status;
    document.getElementById('form-is-recommended').checked = !!project.isRecommended;
    
    document.getElementById('form-highlights').value = project.highlights ? project.highlights.join(',') : '';
    document.getElementById('form-customer-info').value = project.customerInfo || '';
    document.getElementById('form-cooperation').value = project.cooperationMode || '';
    document.getElementById('form-viewing-time').value = project.viewingTimeText || '';
    document.getElementById('form-remark').value = project.remark || '';

    // 回填复选框
    if (project.suitableBusiness) {
      project.suitableBusiness.forEach(b => {
        const cb = document.querySelector(`input[name="suit-biz"][value="${b}"]`);
        if (cb) cb.checked = true;
      });
    }
    if (project.unsuitableBusiness) {
      project.unsuitableBusiness.forEach(b => {
        const cb = document.querySelector(`input[name="unsuit-biz"][value="${b}"]`);
        if (cb) cb.checked = true;
      });
    }
  } else {
    titleEl.textContent = '发布新招商项目';
    document.getElementById('form-status').value = 'online'; // 默认发布就上线
    document.getElementById('form-show-full-school').checked = true;
  }

  modal.style.display = 'flex';
}

function closeModal() {
  document.getElementById('project-modal').style.display = 'none';
}

// 提交表单保存
async function saveProjectData() {
  const id = document.getElementById('form-project-id').value;
  const title = document.getElementById('form-title').value.trim();
  const projectType = document.getElementById('form-type').value;
  const city = document.getElementById('form-city').value.trim();
  const district = document.getElementById('form-district').value.trim();
  const addressText = document.getElementById('form-address').value.trim();
  const schoolName = document.getElementById('form-school').value.trim();
  const schoolAlias = document.getElementById('form-school-alias').value.trim();
  const showFullSchoolName = document.getElementById('form-show-full-school').checked;
  const areaText = document.getElementById('form-area').value.trim();
  const feeText = document.getElementById('form-fee').value.trim();
  const sort = parseInt(document.getElementById('form-sort').value) || 0;
  
  const coverImage = document.getElementById('form-cover-image').value.trim();
  const imagesRaw = document.getElementById('form-images').value.trim();
  const images = imagesRaw ? imagesRaw.split(',').map(u => u.trim()) : [];
  
  const status = document.getElementById('form-status').value;
  const isRecommended = document.getElementById('form-is-recommended').checked;

  const highlightsRaw = document.getElementById('form-highlights').value.trim();
  const highlights = highlightsRaw ? highlightsRaw.split(',').map(h => h.trim()) : [];

  const customerInfo = document.getElementById('form-customer-info').value.trim();
  const cooperationMode = document.getElementById('form-cooperation').value.trim();
  const viewingTimeText = document.getElementById('form-viewing-time').value.trim();
  const remark = document.getElementById('form-remark').value.trim();

  // 必填验证
  if (!title || !city || !district || !schoolName || !areaText || !feeText) {
    alert('请填写所有带 * 号的必填字段！');
    return;
  }

  // 收集品类多选值
  const suitableBusiness = [];
  document.querySelectorAll('input[name="suit-biz"]:checked').forEach(c => suitableBusiness.push(c.value));
  
  if (suitableBusiness.length === 0) {
    alert('请至少勾选一种适合品类！');
    return;
  }

  const unsuitableBusiness = [];
  document.querySelectorAll('input[name="unsuit-biz"]:checked').forEach(c => unsuitableBusiness.push(c.value));

  const payload = {
    title, projectType, city, district, addressText, schoolName, schoolAlias, showFullSchoolName,
    areaText, feeText, sort, coverImage, images, status, isRecommended, highlights,
    customerInfo, cooperationMode, viewingTimeText, remark, suitableBusiness, unsuitableBusiness
  };

  try {
    let method = 'POST';
    let url = `${API_BASE}/projects`;

    if (id) {
      method = 'PUT';
      url = `${API_BASE}/projects/${id}`;
    }

    const res = await fetch(url, {
      method: method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (res.ok) {
      closeModal();
      loadProjectsList();
    } else {
      const err = await res.json();
      alert('保存失败：' + (err.error || '未知错误'));
    }
  } catch (err) {
    console.error('Error saving project:', err);
    alert('保存失败，请检查网络连接');
  }
}

// ==================== 4. 咨询线索跟进视图 ====================
function initLeadsView() {
  const searchInput = document.getElementById('lead-search');
  const tabs = document.querySelectorAll('.leads-status-tabs .status-tab');
  const btnSubmit = document.getElementById('btn-submit-follow');

  searchInput.addEventListener('input', (e) => {
    state.leadSearchKeyword = e.target.value.trim();
    loadLeadsList();
  });

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      state.activeLeadStatusFilter = tab.getAttribute('data-status');
      loadLeadsList();
    });
  });

  // 保存跟进记录
  btnSubmit.addEventListener('click', () => {
    saveFollowRecord();
  });

  // 点击意向商铺链接快速跳转详情
  document.getElementById('lead-det-project').addEventListener('click', (e) => {
    const pid = e.target.getAttribute('data-project-id');
    if (pid) {
      // 切换视图到项目并高亮
      document.querySelector('.sidebar-menu [data-view="projects-view"]').click();
      document.getElementById('project-search').value = pid;
      state.projectSearchKeyword = pid;
      loadProjectsList();
    }
  });
}

async function loadLeadsList() {
  try {
    let url = `${API_BASE}/leads?`;
    if (state.activeLeadStatusFilter !== '全部') {
      url += `status=${state.activeLeadStatusFilter}&`;
    }
    const res = await fetch(url);
    let leads = await res.json();

    // 本地关键词筛选 (称呼，手机号)
    if (state.leadSearchKeyword) {
      const k = state.leadSearchKeyword.toLowerCase();
      leads = leads.filter(l => l.name.toLowerCase().includes(k) || l.phone.includes(k));
    }

    state.leads = leads;

    const listScroll = document.getElementById('leads-list-scroll');
    listScroll.innerHTML = '';

    if (leads.length > 0) {
      leads.forEach(l => {
        const item = document.createElement('div');
        item.className = `lead-item-card ${state.selectedLeadId === l.id ? 'active' : ''}`;
        item.setAttribute('data-id', l.id);
        
        // 状态样式与名字映射
        const statMap = {
          'new': { name: '新咨询', class: 'badge-online' },
          'contacted': { name: '已联系', class: 'badge-draft' },
          'interested': { name: '有意向', class: 'badge-draft' },
          'viewing_scheduled': { name: '已约看铺', class: 'badge-coming' },
          'viewed': { name: '已看铺', class: 'badge-coming' },
          'negotiating': { name: '谈判中', class: 'badge-coming' },
          'closed': { name: '已成交', class: 'badge-online' },
          'invalid': { name: '无效', class: 'badge-offline' },
          'paused': { name: '暂缓', class: 'badge-offline' }
        };
        const st = statMap[l.status] || { name: l.status, class: 'badge-draft' };

        const formattedDate = new Date(l.createdAt).toLocaleDateString();

        item.innerHTML = `
          <div class="card-row-top">
            <span class="card-cust-name">${l.name} (${l.businessType})</span>
            <span class="badge ${st.class}">${st.name}</span>
          </div>
          <div class="card-row-mid ellipsis">${l.projectTitle || '【客户自提配铺意向】'}</div>
          <div class="card-row-bottom">
            <span>📞 ${l.phone}</span>
            <span>${formattedDate}</span>
          </div>
        `;

        item.addEventListener('click', () => selectLead(l.id));
        listScroll.appendChild(item);
      });
      
      // 保持之前的选择
      if (state.selectedLeadId) {
        const exists = leads.some(l => l.id === state.selectedLeadId);
        if (!exists) {
          clearLeadDetail();
        }
      }
    } else {
      listScroll.innerHTML = `<div class="text-center text-muted" style="padding:40px 0;">无匹配线索</div>`;
      clearLeadDetail();
    }
  } catch (err) {
    console.error(err);
  }
}

function clearLeadDetail() {
  state.selectedLeadId = null;
  document.getElementById('lead-detail-placeholder').style.display = 'flex';
  document.getElementById('lead-detail-panel').style.display = 'none';
}

function selectLead(id) {
  state.selectedLeadId = id;
  
  // 更新列表高亮
  const cards = document.querySelectorAll('.lead-item-card');
  cards.forEach(c => {
    if (c.getAttribute('data-id') === id) c.classList.add('active');
    else c.classList.remove('active');
  });

  const lead = state.leads.find(l => l.id === id);
  if (!lead) return;

  // 渲染右侧内容
  document.getElementById('lead-detail-placeholder').style.display = 'none';
  document.getElementById('lead-detail-panel').style.display = 'block';

  // 基本字段回填
  document.getElementById('lead-det-name').textContent = lead.name;
  document.getElementById('lead-det-phone').textContent = lead.phone;
  document.getElementById('lead-det-business').textContent = lead.businessType;
  document.getElementById('lead-det-budget').textContent = lead.budgetRange;
  document.getElementById('lead-det-region').textContent = lead.regionPreference || '未填写';
  document.getElementById('lead-det-experience').textContent = lead.hasCampusExperience ? '💡 有校园经营经验' : '无校园经营经验';
  
  const projLink = document.getElementById('lead-det-project');
  if (lead.projectId) {
    projLink.textContent = lead.projectTitle || '查看意向商铺';
    projLink.setAttribute('data-project-id', lead.projectId);
    projLink.style.display = 'inline-block';
  } else {
    projLink.textContent = '无（自主提交匹配需求）';
    projLink.removeAttribute('data-project-id');
  }

  document.getElementById('lead-det-remark').textContent = lead.remark || '无备注需求';
  
  const d = new Date(lead.createdAt);
  document.getElementById('lead-det-date').textContent = `提交时间：${d.getFullYear()}-${d.getMonth()+1}-${d.getDate()} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;

  // 状态下拉框回填
  document.getElementById('follow-status').value = lead.status;
  
  // 清理输入框
  document.getElementById('follow-content').value = '';
  document.getElementById('follow-next-date').value = '';

  // 状态标签更新
  const statMap = {
    'new': '新咨询',
    'contacted': '已联系',
    'interested': '有意向',
    'viewing_scheduled': '已约看铺',
    'viewed': '已看铺',
    'negotiating': '谈判中',
    'closed': '已成交',
    'invalid': '无效',
    'paused': '暂缓'
  };
  
  const badge = document.getElementById('lead-det-status-badge');
  badge.textContent = statMap[lead.status] || lead.status;
  
  badge.className = 'badge';
  if (lead.status === 'new' || lead.status === 'closed') badge.classList.add('badge-online');
  else if (lead.status === 'invalid' || lead.status === 'paused') badge.classList.add('badge-offline');
  else badge.classList.add('badge-coming');

  // 渲染历史跟进 Timeline
  const timeline = document.getElementById('lead-det-timeline');
  timeline.innerHTML = '';

  if (lead.follows && lead.follows.length > 0) {
    lead.follows.forEach(f => {
      const item = document.createElement('div');
      item.className = 'timeline-item';
      
      const fd = new Date(f.createdAt);
      const fdStr = `${fd.getFullYear()}-${fd.getMonth()+1}-${fd.getDate()} ${String(fd.getHours()).padStart(2,'0')}:${String(fd.getMinutes()).padStart(2,'0')}`;
      
      const nextFollowHtml = f.nextFollowAt ? `<div class="timeline-next">⏰ 预约下次沟通时间：${new Date(f.nextFollowAt).toLocaleDateString()}</div>` : '';

      item.innerHTML = `
        <div class="timeline-marker"></div>
        <div class="timeline-box">
          <div class="timeline-meta">
            <span class="timeline-operator">👤 跟进人：${f.operatorName || '系统客服'}</span>
            <span class="timeline-date">${fdStr}</span>
          </div>
          <p class="timeline-msg">${f.content}</p>
          ${nextFollowHtml}
        </div>
      `;
      timeline.appendChild(item);
    });
  } else {
    timeline.innerHTML = `<p class="text-muted" style="font-size:13px; text-align:center; padding: 20px 0;">该客户暂无历史跟进记录</p>`;
  }
}

async function saveFollowRecord() {
  const id = state.selectedLeadId;
  if (!id) return;

  const content = document.getElementById('follow-content').value.trim();
  const status = document.getElementById('follow-status').value;
  const nextFollowDateVal = document.getElementById('follow-next-date').value;

  if (!content) {
    alert('请填写本次跟进内容纪实！');
    return;
  }

  let nextFollowAt = undefined;
  if (nextFollowDateVal) {
    nextFollowAt = new Date(nextFollowDateVal).getTime();
  }

  try {
    // 1. 发送跟进记录
    const followRes = await fetch(`${API_BASE}/leads/${id}/follow`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content,
        nextFollowAt,
        operatorName: '招商主管小王'
      })
    });

    if (!followRes.ok) throw new Error('保存跟进信息失败');

    // 2. 更新线索状态
    const statusRes = await fetch(`${API_BASE}/leads/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });

    if (!statusRes.ok) throw new Error('更新客户状态失败');

    // 刷新页面状态
    await loadLeadsList();
    selectLead(id); // 重新选中并刷新右侧面板
    
    // 如果有修改，顺便也后台更新一下看板缓存
    loadDashboardData();

  } catch (err) {
    console.error(err);
    alert('保存出错：' + err.message);
  }
}
