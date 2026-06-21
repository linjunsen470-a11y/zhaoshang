const auth = require('./auth.js');

const MAX_IMAGES = 6;

function chooseImages(existingCount = 0) {
  const remaining = Math.max(0, MAX_IMAGES - existingCount);
  if (!remaining) {
    wx.showToast({ title: `最多上传 ${MAX_IMAGES} 张`, icon: 'none' });
    return Promise.resolve([]);
  }

  return new Promise(resolve => {
    wx.chooseMedia({
      count: remaining,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      sizeType: ['compressed'],
      success: res => resolve((res.tempFiles || []).map(file => file.tempFilePath)),
      fail: () => resolve([])
    });
  });
}

function compressImage(src) {
  return new Promise(resolve => {
    if (!wx.compressImage) {
      resolve(src);
      return;
    }

    wx.compressImage({
      src,
      quality: 75,
      success: res => resolve(res.tempFilePath || src),
      fail: () => resolve(src)
    });
  });
}

async function uploadImage(filePath) {
  const app = getApp();
  const config = app.globalData;

  if (config.useLocalMock) {
    return {
      id: `mock_img_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      url: filePath,
      localPath: filePath,
      alt: '本地调试图片'
    };
  }

  const token = await auth.getAuthToken();
  return new Promise((resolve, reject) => {
    wx.uploadFile({
      url: `${config.apiUrl}/uploads/lead-image`,
      filePath,
      name: 'file',
      header: {
        Authorization: `Bearer ${token}`
      },
      success: res => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            resolve(JSON.parse(res.data));
          } catch (err) {
            reject(err);
          }
          return;
        }
        reject(res);
      },
      fail: reject
    });
  });
}

async function pickCompressAndUpload(existing = []) {
  const paths = await chooseImages(existing.length);
  const uploaded = [];

  for (const path of paths) {
    const compressed = await compressImage(path);
    const file = await uploadImage(compressed);
    uploaded.push(file);
  }

  return uploaded;
}

module.exports = {
  MAX_IMAGES,
  pickCompressAndUpload
};
