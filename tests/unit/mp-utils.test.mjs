import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createStorage, loadMiniProgramModule } from '../helpers/load-cjs.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const fromRoot = relative => path.join(root, relative);

test('form helpers enforce limits, phone format and privacy consent', () => {
  const storage = createStorage();
  const form = loadMiniProgramModule(fromRoot('mp/utils/form.js'), {
    globals: { wx: storage },
    stubs: {
      '../config.js': {
        MAX_NAME_LENGTH: 20,
        MAX_PHONE_LENGTH: 11,
        MAX_REGION_LENGTH: 50,
        MAX_REMARK_LENGTH: 500,
        PHONE_PATTERN: /^1[3-9]\d{9}$/,
      },
    },
  });

  assert.equal(form.clip('  abc  ', 2), 'ab');
  assert.equal(form.validateName(''), '请先选择微信昵称');
  assert.equal(form.validatePhone('13812345678'), true);
  assert.equal(form.validatePhone('12812345678'), false);
  assert.match(form.validatePrivacyConsent(false), /隐私政策/);
  form.rememberPrivacyConsent();
  assert.equal(form.validatePrivacyConsent(false), '');
});

test('navigation helpers reject unsafe identifiers and malformed encoding', () => {
  const navigation = loadMiniProgramModule(fromRoot('mp/utils/navigation.js'), {
    stubs: { '../config.js': { MAX_ROUTE_PARAM_LENGTH: 120 } },
  });

  assert.equal(navigation.safeDecode('%E0%A4%A'), '%E0%A4%A');
  assert.equal(navigation.safeIdentifier('lead_123-A'), 'lead_123-A');
  assert.equal(navigation.safeIdentifier('../admin'), '');
  assert.equal(navigation.allowedValue('online', ['online', 'full'], 'full'), 'online');
  assert.equal(navigation.allowedValue('draft', ['online', 'full'], 'full'), 'full');
});

test('project and attachment helpers expose only public, normalized data', () => {
  const project = loadMiniProgramModule(fromRoot('mp/utils/project.js'));
  const attachment = loadMiniProgramModule(fromRoot('mp/utils/attachment.js'));

  assert.equal(project.isPublicProject({ status: 'online', businessScene: 'office' }), true);
  assert.equal(project.isPublicProject({ status: 'online', businessScene: 'mall' }), false);
  assert.equal(project.isPublicProject({ status: 'draft' }), false);
  assert.deepEqual(
    JSON.parse(JSON.stringify(attachment.normalizeAttachment({ id: 4, url: '/a.jpg' }))),
    { id: 4, url: '/a.jpg', displayUrl: '/a.jpg' },
  );
  assert.deepEqual(Array.from(attachment.attachmentIds([{ id: 4 }, null, { id: 'x' }])), [4, 'x']);
  assert.deepEqual(Array.from(attachment.previewUrls([{ localPath: '/local.jpg' }])), ['/local.jpg']);
});
