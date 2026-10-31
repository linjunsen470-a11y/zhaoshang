const ENVIRONMENTS = require('./environments.js');

function detectEnvVersion() {
  try {
    const accountInfo = wx.getAccountInfoSync();
    const envVersion = accountInfo && accountInfo.miniProgram && accountInfo.miniProgram.envVersion;
    return ENVIRONMENTS[envVersion] ? envVersion : 'develop';
  } catch (err) {
    console.warn('无法识别小程序运行环境，按开发版处理', err);
    return 'develop';
  }
}

function isLocalAddress(url) {
  return /^(?:https?:\/\/)?(?:127\.0\.0\.1|localhost)(?::|\/|$)/i.test(String(url || ''));
}

function validateEnvironment(envVersion, environment) {
  const apiUrl = String(environment.apiUrl || '').trim().replace(/\/$/, '');
  if (envVersion === 'develop') {
    return { apiUrl, error: '' };
  }
  if (!apiUrl) {
    return { apiUrl: '', error: `${envVersion === 'trial' ? '体验版' : '正式版'}服务地址未配置` };
  }
  if (!apiUrl.startsWith('https://') || isLocalAddress(apiUrl)) {
    return { apiUrl: '', error: `${envVersion === 'trial' ? '体验版' : '正式版'}服务地址必须使用非本机 HTTPS 域名` };
  }
  return { apiUrl, error: '' };
}

function buildRuntime(envVersion) {
  const environment = ENVIRONMENTS[envVersion] || ENVIRONMENTS.develop;
  const validation = validateEnvironment(envVersion, environment);
  return {
    ENV_VERSION: envVersion,
    API_URL: validation.apiUrl,
    USE_LOCAL_MOCK: Boolean(environment.useLocalMock),
    ALLOW_DEV_OPEN_ID: Boolean(environment.allowDevOpenId),
    DEV_OPEN_ID: environment.allowDevOpenId ? 'dev-openid-local' : '',
    CONFIG_ERROR: validation.error,
    IS_API_CONFIGURED: !validation.error
  };
}

const runtime = buildRuntime('develop');

function refreshRuntimeConfig() {
  const next = buildRuntime(detectEnvVersion());
  Object.assign(module.exports, next);
  return next;
}

module.exports = {
  ...runtime,
  validateEnvironment,
  refreshRuntimeConfig,
  APP_NAME: '锦奕找铺',
  COMPANY_NAME: '广州锦奕咨询服务有限公司',
  ADVISOR_PHONE: '17322251752',
  // Fill with the actual mini-program ICP number after approval (for example, 粤ICP备…号-1X).
  MINIPROGRAM_ICP_NUMBER: '',
  MAX_NAME_LENGTH: 20,
  MAX_PHONE_LENGTH: 11,
  MAX_REGION_LENGTH: 50,
  MAX_REMARK_LENGTH: 500,
  MAX_TEXT_LENGTH: 100,
  MAX_SEARCH_QUERY_LENGTH: 80,
  MAX_ROUTE_PARAM_LENGTH: 120,
  PHONE_PATTERN: /^1[3-9]\d{9}$/
};
