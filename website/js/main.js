// Leave empty until the competent authority has issued the website ICP number.
const SITE_ICP_NUMBER = '';

/**
 * 广州锦奕咨询服务有限公司 - 官网基础交互脚本
 * 纯原生 JavaScript，无任何第三方库
 */

document.addEventListener('DOMContentLoaded', () => {
  // 1. 移动端菜单切换
  const toggleBtn = document.querySelector('.nav-toggle');
  const navMenu = document.querySelector('.nav-menu');

  if (toggleBtn && navMenu) {
    toggleBtn.addEventListener('click', () => {
      navMenu.classList.toggle('open');
      const expanded = navMenu.classList.contains('open');
      toggleBtn.setAttribute('aria-expanded', expanded);
    });

    // 点击页面其他区域关闭菜单
    document.addEventListener('click', (e) => {
      if (!toggleBtn.contains(e.target) && !navMenu.contains(e.target)) {
        navMenu.classList.remove('open');
        toggleBtn.setAttribute('aria-expanded', 'false');
      }
    });
  }

  // 2. 自动设置当前年份
  const yearSpan = document.getElementById('current-year');
  if (yearSpan) {
    yearSpan.textContent = new Date().getFullYear();
  }

  // The website number and the mini-program number are separate service records.
  const icp = document.getElementById('site-icp');
  if (icp && SITE_ICP_NUMBER) {
    const link = document.createElement('a');
    link.href = 'https://beian.miit.gov.cn/';
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.textContent = SITE_ICP_NUMBER;
    icp.appendChild(link);
  }
});
