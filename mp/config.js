module.exports = {
  // Plan A: mini-program talks to local Payload/Next API (not built-in wx storage mock).
  API_URL: 'http://127.0.0.1:3000/api',
  ADVISOR_PHONE: '18888888888',
  MAX_NAME_LENGTH: 20,
  MAX_PHONE_LENGTH: 11,
  MAX_REGION_LENGTH: 50,
  MAX_REMARK_LENGTH: 500,
  MAX_TEXT_LENGTH: 100,
  PHONE_PATTERN: /^1[3-9]\d{9}$/
};