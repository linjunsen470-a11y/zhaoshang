const KEY = 'recent_projects';

function recentIds() {
  const saved = wx.getStorageSync(KEY);
  return Array.isArray(saved) ? [...new Set(saved.filter(id => typeof id === 'string' || typeof id === 'number').map(String))].slice(0, 20) : [];
}

function rememberProject(id) {
  wx.setStorageSync(KEY, [String(id), ...recentIds().filter(value => value !== String(id))].slice(0, 20));
}

module.exports = { recentIds, rememberProject };
