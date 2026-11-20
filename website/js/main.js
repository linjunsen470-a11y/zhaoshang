const copyButton = document.querySelector('.copy-name');
if (copyButton && navigator.clipboard?.writeText) {
  copyButton.hidden = false;
  copyButton.addEventListener('click', async () => {
    const status = document.querySelector('.copy-state');
    try {
      await navigator.clipboard.writeText('岭南旺铺');
      status.textContent = '已复制，可粘贴到微信搜索';
    } catch {
      status.textContent = '请长按或选中「岭南旺铺」复制';
    }
  });
}
