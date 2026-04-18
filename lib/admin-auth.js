const crypto = require('crypto');

function b64url(input) {
  return Buffer.from(input).toString('base64url');
}

function sign(payload, secret) {
  return crypto.createHmac('sha256', secret).update(payload).digest('base64url');
}

function createAuthCookie(secret, user) {
  const issuedAt = Date.now();
  const payload = JSON.stringify({ iat: issuedAt, user });
  return `${b64url(payload)}.${sign(payload, secret)}`;
}

function verifyAuthCookie(cookieValue, secret, maxAgeMs = 7 * 24 * 60 * 60 * 1000) {
  if (!cookieValue || !secret) return false;
  const [payloadB64, sig] = cookieValue.split('.');
  if (!payloadB64 || !sig) return false;
  const payload = Buffer.from(payloadB64, 'base64url').toString('utf8');
  const expected = sign(payload, secret);
  if (sig.length !== expected.length) return false;
  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return false;
  try {
    const data = JSON.parse(payload);
    if (!data.iat || Date.now() - data.iat > maxAgeMs) return false;
    if (!data.user || typeof data.user !== 'string') return false;
    return true;
  } catch (_) {
    return false;
  }
}

function readCookie(header, name) {
  if (!header) return null;
  const parts = header.split(';').map((v) => v.trim());
  for (const part of parts) {
    const idx = part.indexOf('=');
    if (idx === -1) continue;
    const key = part.slice(0, idx);
    const value = part.slice(idx + 1);
    if (key === name) return value;
  }
  return null;
}

function cookieHeader(name, value, options = {}) {
  const attrs = [
    `${name}=${value}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    options.secure === false ? '' : 'Secure',
    options.maxAge ? `Max-Age=${Math.floor(options.maxAge / 1000)}` : '',
  ].filter(Boolean);
  return attrs.join('; ');
}

module.exports = {
  createAuthCookie,
  verifyAuthCookie,
  readCookie,
  cookieHeader,
};
