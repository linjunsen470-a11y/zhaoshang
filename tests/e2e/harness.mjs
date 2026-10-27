import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import automator from 'miniprogram-automator';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const require = createRequire(import.meta.url);
const automatorPackage = require('miniprogram-automator/package.json');
export const artifactDir = path.resolve(process.env.MP_E2E_ARTIFACT_DIR || path.join(root, 'test-results/mp-e2e'));
export const apiUrl = (process.env.MP_E2E_API_URL || 'http://127.0.0.1:3000/api').replace(/\/$/, '');

export function withTimeout(promise, message, timeout = 5_000) {
  let timer;
  return Promise.race([
    promise,
    new Promise((_, reject) => { timer = setTimeout(() => reject(new Error(message)), timeout); }),
  ]).finally(() => clearTimeout(timer));
}

// The automator SDK's systemInfo() still invokes deprecated getSystemInfoSync.
export function readSystemInfo(miniProgram) {
  return miniProgram.evaluate(() => {
    const read = name => typeof wx[name] === 'function' ? wx[name]() : {};
    return {
      ...read('getAppBaseInfo'), ...read('getDeviceInfo'), ...read('getWindowInfo'),
      ...read('getSystemSetting'), appAuthorizeSetting: read('getAppAuthorizeSetting'),
    };
  });
}

export async function waitUntil(predicate, message, timeout = 12_000, interval = 150) {
  const started = Date.now();
  let lastError;
  while (Date.now() - started < timeout) {
    try {
      if (await withTimeout(Promise.resolve().then(predicate), `${message} (RPC stalled)`, Math.min(5_000, timeout))) return;
    } catch (error) {
      lastError = error;
    }
    await new Promise(resolve => setTimeout(resolve, interval));
  }
  throw new Error(`${message}${lastError ? `: ${lastError.message}` : ''}`);
}

export async function waitForPage(miniProgram, expectedPath, timeout = 12_000) {
  let page;
  await waitUntil(async () => {
    page = await miniProgram.currentPage();
    return page?.path === expectedPath;
  }, `timed out waiting for ${expectedPath}`, timeout);
  return page;
}

export async function waitForData(page, pathName, predicate = Boolean, timeout = 12_000) {
  await waitUntil(async () => predicate(await page.data(pathName)), `timed out waiting for data.${pathName}`, timeout);
}

export async function changeRoute(miniProgram, method, url) {
  await withTimeout(miniProgram.reLaunch(url), `${method} fallback reLaunch timed out for ${url}`, 12_000);
}

function resolveCliPath() {
  const candidates = [
    process.env.MP_E2E_CLI_PATH,
    'C:\\Program Files (x86)\\Tencent\\微信web开发者工具\\cli.bat',
    'D:\\Program Files (x86)\\Tencent\\wechat-dev\\cli.bat',
  ].filter(Boolean);
  return candidates.find(candidate => fs.existsSync(candidate));
}

async function checkBackend() {
  const response = await fetch(`${apiUrl}/projects?public=true`, { signal: AbortSignal.timeout(30_000) });
  if (!response.ok) throw new Error(`backend preflight failed: ${response.status} ${response.statusText}`);
}

export async function startE2E(options = {}) {
  await checkBackend();
  fs.mkdirSync(artifactDir, { recursive: true });
  const mode = process.env.MP_E2E_MODE || (process.env.MP_E2E_WS_ENDPOINT ? 'connect' : 'launch');
  const projectPath = path.resolve(process.env.MP_E2E_PROJECT_PATH || path.join(root, 'mp'));
  let miniProgram;

  if (mode === 'connect') {
    miniProgram = await automator.connect({
      wsEndpoint: process.env.MP_E2E_WS_ENDPOINT || 'ws://127.0.0.1:9420',
    });
  } else {
    const cliPath = resolveCliPath();
    if (!cliPath) throw new Error('WeChat DevTools CLI not found; set MP_E2E_CLI_PATH');
    const port = Number(process.env.MP_E2E_PORT || 9420);
    const launchTimeout = Number(process.env.MP_E2E_LAUNCH_TIMEOUT || 90_000);
    const cliNode = path.join(path.dirname(cliPath), 'node.exe');
    const cliScript = path.join(path.dirname(cliPath), 'cli.js');
    if (process.platform === 'win32' && /\.bat$/i.test(cliPath) && fs.existsSync(cliNode) && fs.existsSync(cliScript)) {
      // Recent Node releases cannot spawn .bat files directly. Use the same
      // bundled runtime and script as cli.bat, with no shell interpolation.
      await promisify(execFile)(cliNode, [cliScript, 'auto', '--project', projectPath, '--auto-port', String(port), '--trust-project'], { windowsHide: true, timeout: launchTimeout });
      await waitUntil(async () => {
        miniProgram = await automator.connect({ wsEndpoint: `ws://127.0.0.1:${port}` });
        return true;
      }, 'DevTools automation connection failed', launchTimeout, 1000);
    } else {
      miniProgram = await automator.launch({
        cliPath,
        projectPath,
        port,
        timeout: launchTimeout,
        trustProject: true,
      });
    }
  }

  const runtimeErrors = [];
  const consoleErrors = [];
  miniProgram.on('exception', error => runtimeErrors.push(error));
  miniProgram.on('console', message => {
    if (message.type === 'error') consoleErrors.push(message.message);
  });
  await miniProgram.evaluate(config => {
    const app = getApp();
    app.globalData.apiUrl = config.apiUrl;
    app.globalData.useLocalMock = false;
    app.globalData.configError = '';
    if (config.resetStorage) {
      ['authToken', 'authOpenId', 'authTokenExpiresAt', 'privacyConsentAccepted', 'userInfo', 'favorites']
        .forEach(key => wx.removeStorageSync(key));
    }
  }, { apiUrl, resetStorage: options.resetStorage !== false });
  const initialPath = options.initialPath || '/pages/index/index';
  await miniProgram.reLaunch(initialPath);
  const initialPage = await waitForPage(miniProgram, initialPath.replace(/^\//, '').split('?')[0]);
  if (initialPage.path === 'pages/index/index') {
    await waitForData(initialPage, 'loading', value => value === false, 20_000);
  }

  const context = {
    miniProgram,
    mode,
    runtimeErrors,
    consoleErrors,
    startedAt: Date.now(),
    metadataPath: path.join(artifactDir, 'runtime.json'),
  };
  fs.writeFileSync(context.metadataPath, JSON.stringify({
    node: process.version,
    miniprogramAutomator: automatorPackage.version,
    mode,
    apiUrl,
    startedAt: new Date(context.startedAt).toISOString(),
  }, null, 2));
  return context;
}

export async function stopE2E(context) {
  if (!context?.miniProgram) return;
  try {
    fs.writeFileSync(context.metadataPath, JSON.stringify({
      node: process.version,
      miniprogramAutomator: automatorPackage.version,
      mode: context.mode,
      apiUrl,
      startedAt: new Date(context.startedAt).toISOString(),
      durationMs: Date.now() - context.startedAt,
      stage: context.stage || '',
      runtimeErrors: context.runtimeErrors.map(String),
      consoleErrors: context.consoleErrors,
    }, null, 2));
  } finally {
    if (context.mode === 'launch') await context.miniProgram.close();
    else context.miniProgram.disconnect();
  }
}

export function recordStage(context, stage) {
  if (!context?.metadataPath) return;
  context.stage = stage;
  fs.writeFileSync(context.metadataPath, JSON.stringify({
    node: process.version,
    miniprogramAutomator: automatorPackage.version,
    mode: context.mode,
    apiUrl,
    startedAt: new Date(context.startedAt).toISOString(),
    stage,
    elapsedMs: Date.now() - context.startedAt,
  }, null, 2));
}

export async function failureScreenshot(miniProgram, name) {
  const safeName = name.replace(/[^a-z0-9_-]+/gi, '-').toLowerCase();
  const destination = path.join(artifactDir, `${safeName}-${Date.now()}.png`);
  await withTimeout(miniProgram.screenshot({ path: destination }), 'screenshot RPC timed out', 8_000);
  return destination;
}

export async function findLeadCard(page, leadId) {
  const leads = await page.data('leadsList');
  const index = Array.isArray(leads) ? leads.findIndex(lead => String(lead.id) === String(leadId)) : -1;
  if (index < 0) return null;
  const cards = await page.$$('.e2e-lead-card');
  return cards[index] || null;
}

export async function cleanupLead(miniProgram, leadId) {
  if (!leadId) return;
  await withTimeout(miniProgram.evaluate(({ baseUrl, id }) => new Promise(resolve => {
    const token = wx.getStorageSync('authToken');
    wx.request({
      url: `${baseUrl}/leads/${id}`,
      method: 'DELETE',
      header: token ? { Authorization: `Bearer ${token}` } : {},
      complete: resolve,
    });
  }), { baseUrl: apiUrl, id: leadId }), 'cleanup lead RPC timed out', 8_000);
}
