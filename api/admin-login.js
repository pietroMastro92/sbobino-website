const crypto = require('crypto');
const { createAuthCookie, cookieHeader } = require('../lib/admin-auth');

function json(res, status, payload) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(payload));
}

function parseBody(req) {
  return new Promise((resolve) => {
    let body = '';
    req.on('data', (chunk) => { body += chunk; });
    req.on('end', () => {
      try { resolve(JSON.parse(body || '{}')); } catch { resolve({}); }
    });
  });
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed' });

  const expectedUser = process.env.ADMIN_USERNAME || '';
  const secret = process.env.ADMIN_PASSWORD_HASH || '';
  const cookieSecret = process.env.ADMIN_COOKIE_SECRET || '';
  if (!expectedUser || !secret || !cookieSecret) return json(res, 500, { error: 'Admin auth not configured' });

  const { username, password } = await parseBody(req);
  if (typeof username !== 'string' || typeof password !== 'string' || !username || !password) {
    return json(res, 400, { error: 'Missing username or password' });
  }

  const normalizedUsername = username.trim();
  if (normalizedUsername !== expectedUser) return json(res, 401, { error: 'Invalid credentials' });

  const hash = crypto.createHash('sha256').update(password).digest('hex');
  if (hash !== secret) return json(res, 401, { error: 'Invalid credentials' });

  const value = createAuthCookie(cookieSecret, normalizedUsername);
  res.setHeader('Set-Cookie', cookieHeader('sbobino_admin', value, { maxAge: 7 * 24 * 60 * 60 * 1000, secure: process.env.NODE_ENV === 'production' }));
  return json(res, 200, { ok: true, user: normalizedUsername });
};
