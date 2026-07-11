const config = require('../config.js');

function clipRouteValue(value, maxLength = config.MAX_ROUTE_PARAM_LENGTH) {
  const text = typeof value === 'string' ? value : '';
  return text.length > maxLength ? text.slice(0, maxLength) : text;
}

function safeDecode(value, maxLength = config.MAX_ROUTE_PARAM_LENGTH) {
  const clipped = clipRouteValue(value, maxLength);
  if (!clipped) return '';
  try {
    return clipRouteValue(decodeURIComponent(clipped), maxLength);
  } catch (_) {
    return clipped;
  }
}

function allowedValue(value, allowed, fallback = '') {
  const decoded = safeDecode(value);
  return allowed.includes(decoded) ? decoded : fallback;
}

function safeIdentifier(value) {
  const decoded = safeDecode(value, 80);
  return /^[A-Za-z0-9_-]+$/.test(decoded) ? decoded : '';
}

function encodeRouteValue(value) {
  return encodeURIComponent(clipRouteValue(String(value || '')));
}

module.exports = {
  allowedValue,
  clipRouteValue,
  encodeRouteValue,
  safeDecode,
  safeIdentifier
};
