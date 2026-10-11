import fs from 'node:fs';
import path from 'node:path';
const messages = JSON.parse(fs.readFileSync('lib/translations.json', 'utf8'));
function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (/\.tsx?$/.test(e.name)) out.push(p);
  }
  return out;
}
const files = [...walk('app/api'), ...walk('lib')];
const missing = new Map();
const re = /(?:error|message|notice|detail)\s*:\s*'((?:[^'\\]|\\.)*)'/g;
for (const f of files) {
  const src = fs.readFileSync(f, 'utf8');
  let m;
  while ((m = re.exec(src))) {
    const s = m[1];
    if (!/[A-Za-zÀ-ú]{3}/.test(s)) continue;
    const key = s.trim();
    if (!Object.hasOwn(messages, key)) {
      if (!missing.has(key)) missing.set(key, []);
      missing.get(key).push(f + ':' + src.slice(0, m.index).split('\n').length);
    }
  }
}
console.log('missing keys:', missing.size);
for (const [k, locs] of missing)
  console.log(JSON.stringify(k).slice(0, 100), '->', locs.slice(0, 3).join(', '));
