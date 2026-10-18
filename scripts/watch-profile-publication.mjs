// Read-only, bounded live diagnostics. Never emit headers, cookies, query
// strings, request bodies, identities, raw logs or exception messages.
import { spawn } from 'node:child_process';

const child = spawn(process.execPath, [
  'node_modules/wrangler/bin/wrangler.js', 'tail',
  '--config', 'wrangler.jsonc', '--format', 'json',
  '--method', 'POST',
], { stdio: ['ignore', 'pipe', 'pipe'] });
let pending = '', object = '';
function inspect(entry) {
  const request = entry.event?.request;
  let path;
  try { path = new URL(request?.url).pathname; } catch { return; }
  if (!['/api/workspace', '/api/profile-photo'].includes(path)) return;
  console.log(JSON.stringify({
    at: entry.eventTimestamp, route: path, method: request.method,
    status: entry.event?.response?.status, outcome: entry.outcome,
    exceptionCount: entry.exceptions?.length ?? 0,
  }));
  for (const log of entry.logs ?? []) {
    for (const message of log.message ?? []) {
      try {
        const data = typeof message === 'string' ? JSON.parse(message) : message;
        if (data?.event !== 'service-unavailable') continue;
        console.log(JSON.stringify({
          event: 'service-unavailable',
          area: /^(workspace|profile)[a-z-]*$/.test(data.area) ? data.area : 'other',
          category: ['schema-missing', 'database', 'invalid-record', 'service'].includes(data.category) ? data.category : 'other',
          reference: /^[a-f0-9-]{36}$/.test(data.reference) ? data.reference : undefined,
        }));
      } catch { /* No raw log output. */ }
    }
  }
}
child.stdout.on('data', chunk => {
  pending += chunk.toString();
  const lines = pending.split('\n');
  pending = lines.pop();
  for (const line of lines) {
    if (!object && line.trim().startsWith('{')) object = line;
    else if (object) object += '\n' + line;
    else if (/connected|successfully created tail/i.test(line)) console.log('Live log connection ready.');
    if (object) {
      try { const entry = JSON.parse(object); object = ''; inspect(entry); }
      catch { if (object.length > 2_000_000) object = ''; }
    }
  }
});
child.stderr.on('data', chunk => {
  if (/connected|successfully created tail/i.test(chunk.toString())) console.log('Live log connection ready.');
  if (/error|failed|unauthorized/i.test(chunk.toString())) console.error('Live log connection reported a failure; raw output suppressed.');
});
child.on('error', () => console.error('Unable to start live diagnostics.'));
const timer = setTimeout(() => child.kill(), 5 * 60_000);
child.on('exit', code => {
  clearTimeout(timer);
  console.log('Live capture ended.');
  process.exitCode = code ?? 0;
});
process.on('SIGINT', () => child.kill());
console.log('Starting a five-minute read-only capture of profile POST requests.');
