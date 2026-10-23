import { test } from 'node:test';
import assert from 'node:assert/strict';
import { refreshDashboard, refreshEvent } from '../lib/dashboard-refresh.ts';

test('refresh feedback follows the actual request, prevents duplicates and offers recovery', async () => {
  const previous = globalThis.window;
  const target = new EventTarget();
  globalThis.window = target;
  const events = [];
  target.addEventListener(refreshEvent, (e) => events.push(e.detail));
  try {
    let complete;
    const first = refreshDashboard(() => new Promise((resolve) => { complete = resolve; }), true);
    assert.deepEqual(events.map(e => e.phase), ['loading']);
    let duplicate = false;
    await refreshDashboard(async () => { duplicate = true; });
    assert.equal(duplicate, false);
    complete(); await first;
    assert.equal(events.at(-1).phase, 'success');
    assert.equal(events.at(-1).preserved, true);
    let attempts = 0;
    await assert.rejects(refreshDashboard(async () => { if (++attempts === 1) throw Error('offline'); }));
    assert.equal(events.at(-1).phase, 'error');
    events.at(-1).retry();
    await new Promise(resolve => setTimeout(resolve, 0));
    assert.equal(attempts, 2);
    assert.equal(events.at(-1).phase, 'success');
  } finally { globalThis.window = previous; }
});
