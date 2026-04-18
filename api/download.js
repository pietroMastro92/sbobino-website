const { redisCommand, hashArrayToObject, dateKeyUTC } = require('../lib/upstash');

const ASSET_URLS = {
  dmg: 'https://github.com/pietroMastro92/Sbobino/releases/latest/download/Sbobino_0.1.16_aarch64.dmg',
  app: 'https://github.com/pietroMastro92/Sbobino/releases/latest/download/Sbobino.app.tar.gz',
  default: 'https://github.com/pietroMastro92/Sbobino/releases/latest/download/Sbobino_0.1.16_aarch64.dmg',
};

async function recordDownload(asset, req) {
  const day = dateKeyUTC();
  const userAgent = req.headers['user-agent'] || 'unknown';
  const referrer = req.headers.referer || req.headers.referrer || '';
  const ip = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '';

  const pipe = [
    ['INCR', `sbobino:downloads:total`],
    ['INCR', `sbobino:downloads:asset:${asset}`],
    ['INCR', `sbobino:downloads:day:${day}`],
    ['HINCRBY', `sbobino:downloads:byday`, `${day}:${asset}`, 1],
    ['LPUSH', 'sbobino:downloads:events', JSON.stringify({ ts: new Date().toISOString(), asset, referrer, ip, ua: userAgent })],
    ['LTRIM', 'sbobino:downloads:events', 0, 499],
  ];

  for (const cmd of pipe) {
    // eslint-disable-next-line no-await-in-loop
    await redisCommand(...cmd);
  }
}

module.exports = async (req, res) => {
  const asset = (req.query.asset || 'default').toString();
  const location = ASSET_URLS[asset] || ASSET_URLS.default;

  try {
    await recordDownload(asset, req);
  } catch (err) {
    // Keep redirect working even if stats backend is temporarily unavailable.
    console.error('[download tracking]', err?.message || err);
  }

  res.statusCode = 302;
  res.setHeader('Location', location);
  res.end();
};
