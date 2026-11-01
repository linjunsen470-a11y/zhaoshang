// Leave empty until the competent authority has issued the website ICP number.
const SITE_ICP_NUMBER = '';

document.addEventListener('DOMContentLoaded', () => {
  const year = document.getElementById('current-year');
  if (year) year.textContent = new Date().getFullYear();

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
