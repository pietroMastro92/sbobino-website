const { cookieHeader } = require('../lib/admin-auth');

module.exports = async (req, res) => {
  res.setHeader('Set-Cookie', cookieHeader('sbobino_admin', 'deleted', { maxAge: 0, secure: process.env.NODE_ENV === 'production' }) + '; Expires=Thu, 01 Jan 1970 00:00:00 GMT');
  res.statusCode = 200;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify({ ok: true }));
};
