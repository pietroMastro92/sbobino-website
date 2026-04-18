const { verifyAuthCookie, readCookie } = require('../lib/admin-auth');

module.exports = async (req, res) => {
  const secret = process.env.ADMIN_COOKIE_SECRET || '';
  const cookie = readCookie(req.headers.cookie || '', 'sbobino_admin');
  const ok = verifyAuthCookie(cookie, secret);
  res.statusCode = 200;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify({ authenticated: ok }));
};
