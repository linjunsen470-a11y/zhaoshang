const auth = require('./auth.js');
const { normalizeAttachment } = require('../utils/attachment.js');

const MAX_IMAGES = 6;
const MAX_FILE_SIZE = 10 * 1024 * 1024;

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
      success: res => {
        const files = (res.tempFiles || []).filter(file => Number(file.size || 0) <= MAX_FILE_SIZE);
        if (files.length < (res.tempFiles || []).length) {
          wx.showToast({ title: '已跳过超过 10MB 的图片', icon: 'none' });
        }
        resolve(files.map(file => file.tempFilePath));
      },
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

async function uploadImage(filePath, isRetry = false) {
  const app = getApp();
  const config = app.globalData;

  if (config.useLocalMock) {
    const attachment = normalizeAttachment({
      id: `mock_img_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      url: filePath,
      localPath: filePath,
      alt: '本地调试图片'
    });
    const localMedia = wx.getStorageSync('local_media') || [];
    wx.setStorageSync('local_media', localMedia.concat(attachment));
    return attachment;
  }
  if (config.configError || !config.apiUrl) {
    throw new Error(config.configError || '服务地址未配置');
  }

  const token = await auth.getAuthToken(isRetry);
  return new Promise((resolve, reject) => {
    wx.uploadFile({
      url: `${config.apiUrl}/uploads/lead-image`,
      filePath,
      name: 'file',
      header: {
        Authorization: `Bearer ${token}`
      },
      success: async res => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            const payload = typeof res.data === 'string' ? JSON.parse(res.data) : res.data;
            resolve(normalizeAttachment(payload));
          } catch (err) {
            reject(err);
          }
          return;
        }
        if (res.statusCode === 401 && !isRetry) {
          auth.clearAuth();
          try {
            const retryResult = await uploadImage(filePath, true);
            resolve(retryResult);
          } catch (err) {
            reject(err);
          }
          return;
        }
        let payload = res.data;
        try {
          payload = typeof res.data === 'string' ? JSON.parse(res.data) : res.data;
        } catch (_) {}
        const error = new Error((payload && payload.error) || (res.statusCode === 413 ? '图片过大' : '图片上传失败'));
        error.statusCode = res.statusCode;
        reject(error);
      },
      fail: reject
    });
  });
}

async function pickCompressAndUpload(existing = []) {
  const paths = await chooseImages(existing.length);
  const uploaded = [];
  const failures = [];

  for (const path of paths) {
    try {
      const compressed = await compressImage(path);
      const file = await uploadImage(compressed);
      uploaded.push(file);
    } catch (err) {
      failures.push(err);
    }
  }

  if (failures.length && !uploaded.length) throw failures[0];
  if (failures.length) {
    wx.showToast({ title: `${failures.length} 张图片上传失败，可重新选择`, icon: 'none' });
  }

  return uploaded;
}

module.exports = {
  MAX_IMAGES,
  pickCompressAndUpload
};
