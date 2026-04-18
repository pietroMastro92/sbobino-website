const { verifyAuthCookie, readCookie } = require('../lib/admin-auth');
const { redisCommand, hashArrayToObject } = require('../lib/upstash');

function unauthorized(res) {
  res.statusCode = 401;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify({ error: 'Unauthorized' }));
}

module.exports = async (req, res) => {
  const secret = process.env.ADMIN_COOKIE_SECRET || '';
  const cookie = readCookie(req.headers.cookie || '', 'sbobino_admin');
  if (!verifyAuthCookie(cookie, secret)) return unauthorized(res);

  try {
    const [total, dmg, app, bydayRaw, eventsRaw] = await Promise.all([
      redisCommand('GET', 'sbobino:downloads:total'),
      redisCommand('GET', 'sbobino:downloads:asset:dmg'),
      redisCommand('GET', 'sbobino:downloads:asset:app'),
      redisCommand('HGETALL', 'sbobino:downloads:byday'),
      redisCommand('LRANGE', 'sbobino:downloads:events', 0, 19),
    ]);

    const byday = hashArrayToObject(bydayRaw || []);
    const events = Array.isArray(eventsRaw)
      ? eventsRaw.map((row) => {
          try { return JSON.parse(row); } catch { return null; }
        }).filter(Boolean)
      : [];

    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({
      total: Number(total || 0),
      dmg: Number(dmg || 0),
      app: Number(app || 0),
      byday,
      events,
    }));
  } catch (err) {
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: err?.message || 'Internal error' }));
  }
};
