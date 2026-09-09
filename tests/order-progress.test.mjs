import assert from 'node:assert/strict';
import { test } from 'node:test';
import { orderProgress, submissionTime } from '../lib/order-progress.ts';
const createdAt = '2026-09-01T08:00:00Z',
  start = Date.parse(createdAt);
test('unfinished orders become delayed only after the reference window', () => {
  assert.equal(
    orderProgress({ createdAt, status: 'QUEUED' }, start + 48 * 3600000).label,
    'Normal',
  );
  assert.equal(
    orderProgress({ createdAt, status: 'QUEUED' }, start + 48 * 3600000 + 1)
      .label,
    'Em atraso',
  );
  assert.equal(
    orderProgress({ createdAt, status: 'QUEUED' }, start + 48 * 3600000, 72)
      .label,
    'Normal',
  );
});
test('closed orders do not accumulate delays', () => {
  assert.equal(
    orderProgress({ createdAt, status: 'DELIVERED' }, start + 999 * 3600000)
      .label,
    'Concluído',
  );
  assert.equal(
    orderProgress({ createdAt, status: 'CANCELLED' }, start + 999 * 3600000)
      .label,
    'Cancelado',
  );
});
test('submission uses Maputo time and bad dates are not normal progress', () => {
  assert.ok(submissionTime(createdAt).includes('10:00'));
  assert.equal(
    orderProgress({ createdAt: 'invalid', status: 'QUEUED' }, start).label,
    'Data indisponível',
  );
});
