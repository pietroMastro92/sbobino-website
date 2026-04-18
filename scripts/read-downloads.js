const fs = require('fs');
const path = require('path');

const file = path.join(process.cwd(), '.download-logs', 'downloads.ndjson');
const lines = fs.existsSync(file) ? fs.readFileSync(file, 'utf8').trim().split('\n').filter(Boolean) : [];
const now = Date.now();
const cutoff = now - 7 * 24 * 60 * 60 * 1000;

const rows = lines
  .map((line) => {
    try { return JSON.parse(line); } catch { return null; }
  })
  .filter(Boolean)
  .filter((row) => new Date(row.ts).getTime() >= cutoff)
  .sort((a, b) => new Date(b.ts) - new Date(a.ts));

console.log(JSON.stringify({ total: rows.length, rows }, null, 2));
