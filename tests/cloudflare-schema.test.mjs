import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readCloudflareSchema } from '../scripts/cloudflare-schema.mjs';
test('remote schema inspection uses standalone PRAGMAs and excludes protected tables', () => {
  const db = new DatabaseSync(':memory:');
  try {
    db.exec("CREATE TABLE _cf_KV(key TEXT); CREATE TABLE orders(id TEXT, amount INTEGER); CREATE INDEX orders_amount ON orders(amount);");
    const keys = readCloudflareSchema(sql => {
      assert.doesNotMatch(sql, /JOIN\s+pragma/i);
      assert.doesNotMatch(sql, /table_info\('_cf_/i);
      return sql.split(';').map(statement => db.prepare(statement).all());
    });
    assert.deepEqual(new Set(keys), new Set(['table:orders','index:orders_amount','column:orders.id','column:orders.amount']));
  } finally { db.close(); }
});
test('remote schema inspection stops on incomplete column metadata', () => {
  let call = 0;
  assert.throws(() => readCloudflareSchema(() => ++call === 1 ? [[{type:'table',name:'orders'}]] : []), /Incomplete/);
});
