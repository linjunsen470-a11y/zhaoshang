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
      }
    });
  }

  // 2. 自动设置当前年份
  const yearSpan = document.getElementById('current-year');
  if (yearSpan) {
    yearSpan.textContent = new Date().getFullYear();
  }
});
