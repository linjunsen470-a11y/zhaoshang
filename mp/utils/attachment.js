function normalizeAttachment(item) {
  if (!item || typeof item !== 'object') {
    return { id: String(item || ''), displayUrl: '' };
  }
  const displayUrl = item.displayUrl || item.url || item.localPath || '';
  return { ...item, displayUrl };
}

function normalizeAttachments(items) {
  return Array.isArray(items) ? items.map(normalizeAttachment) : [];
}

function attachmentIds(items) {
  return normalizeAttachments(items).map(item => item.id).filter(Boolean);
}

function previewUrls(items) {
  return normalizeAttachments(items).map(item => item.displayUrl).filter(Boolean);
}

module.exports = {
  attachmentIds,
  normalizeAttachment,
  normalizeAttachments,
  previewUrls
};
