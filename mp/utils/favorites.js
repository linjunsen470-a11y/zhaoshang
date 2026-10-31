function isFavorite(favorites, id) {
  return favorites.some(value => String(value) === String(id));
}

function toggleFavorite(id) {
  const saved = wx.getStorageSync('favorites');
  const favorites = Array.isArray(saved) ? saved : [];
  const exists = isFavorite(favorites, id);
  wx.setStorageSync('favorites', exists
    ? favorites.filter(value => String(value) !== String(id))
    : favorites.concat(id));
  wx.showToast({ title: exists ? '已取消收藏' : '收藏成功', icon: 'none' });
  return !exists;
}

module.exports = { toggleFavorite, isFavorite };
