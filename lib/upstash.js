const DEFAULT_HEADERS = {
  'Content-Type': 'application/json',
};

function getConfig() {
  const url = process.env.UPSTASH_REDIS_REST_URL || '';
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || '';
  return { url, token };
}

function hasRedisConfig() {
  const { url, token } = getConfig();
  return Boolean(url && token);
}

function encodeSegment(value) {
  return encodeURIComponent(String(value));
}

function buildCommandUrl(command, args = []) {
  const { url } = getConfig();
  if (!url) throw new Error('UPSTASH_REDIS_REST_URL is not configured');
  const base = url.replace(/\/+$/, '');
  const segments = [command, ...args].map(encodeSegment).join('/');
  return `${base}/${segments}`;
}

async function redisCommand(command, ...args) {
  const { token } = getConfig();
  if (!token) throw new Error('UPSTASH_REDIS_REST_TOKEN is not configured');

  const response = await fetch(buildCommandUrl(command, args), {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
      ...DEFAULT_HEADERS,
    },
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok || data.error) {
    const message = data?.error || `Upstash command failed: ${command}`;
    throw new Error(message);
  }
  return data.result;
}

function hashArrayToObject(value) {
  if (!Array.isArray(value)) return {};
  const obj = {};
  for (let i = 0; i < value.length; i += 2) {
    const key = value[i];
    const val = value[i + 1];
    if (typeof key === 'string') obj[key] = val;
  }
  return obj;
}

function dateKeyUTC(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

module.exports = {
  hasRedisConfig,
  redisCommand,
  hashArrayToObject,
  dateKeyUTC,
};
