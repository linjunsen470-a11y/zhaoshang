import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadMiniProgramModule } from '../helpers/load-cjs.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const uploadPath = path.join(root, 'mp/services/upload.js');

function loadUpload({ wx, auth, useLocalMock = false }) {
  return loadMiniProgramModule(uploadPath, {
    globals: {
      wx,
      getApp: () => ({ globalData: { apiUrl: 'https://api.test', useLocalMock, configError: '' } }),
    },
    stubs: { './auth.js': auth },
  });
}

test('image picker stops at six existing attachments', async () => {
  let chooseCalls = 0;
  const wx = {
    chooseMedia() { chooseCalls += 1; },
    showToast() {},
  };
  const upload = loadUpload({ wx, auth: {} });
  assert.deepEqual(Array.from(await upload.pickCompressAndUpload(Array(6).fill({ id: 'x' }))), []);
  assert.equal(chooseCalls, 0);
});

test('upload retries once with refreshed auth after 401', async () => {
  const authCalls = [];
  let uploadCalls = 0;
  const wx = {
    chooseMedia: options => options.success({ tempFiles: [{ tempFilePath: '/tmp/a.jpg', size: 100 }] }),
    compressImage: options => options.success({ tempFilePath: '/tmp/a-small.jpg' }),
    uploadFile: options => {
      uploadCalls += 1;
      if (uploadCalls === 1) options.success({ statusCode: 401, data: '{"error":"expired"}' });
      else options.success({ statusCode: 201, data: '{"id":"media-1","url":"/media/a.jpg"}' });
    },
    showToast() {},
  };
  const auth = {
    getAuthToken: async force => {
      authCalls.push(force);
      return authCalls.length > 1 ? 'fresh' : 'stale';
    },
    clearAuth() {},
  };
  const upload = loadUpload({ wx, auth });
  const files = await upload.pickCompressAndUpload([]);

  assert.equal(files.length, 1);
  assert.equal(files[0].id, 'media-1');
  assert.equal(files[0].displayUrl, '/media/a.jpg');
  assert.deepEqual(authCalls, [false, false]);
  assert.equal(uploadCalls, 2);
});

test('partial upload failure keeps successful files and reports failure', async () => {
  const toasts = [];
  let uploadCalls = 0;
  const wx = {
    chooseMedia: options => options.success({
      tempFiles: [
        { tempFilePath: '/tmp/a.jpg', size: 100 },
        { tempFilePath: '/tmp/b.jpg', size: 100 },
      ],
    }),
    compressImage: options => options.success({ tempFilePath: options.src }),
    uploadFile: options => {
      uploadCalls += 1;
      if (uploadCalls === 1) options.success({ statusCode: 201, data: '{"id":"media-1","url":"/a.jpg"}' });
      else options.fail(new Error('network'));
    },
    showToast: options => toasts.push(options.title),
  };
  const upload = loadUpload({ wx, auth: { getAuthToken: async () => 'token' } });
  const files = await upload.pickCompressAndUpload([]);

  assert.equal(files.length, 1);
  assert.equal(toasts.length, 1);
  assert.match(toasts[0], /1/);
});
