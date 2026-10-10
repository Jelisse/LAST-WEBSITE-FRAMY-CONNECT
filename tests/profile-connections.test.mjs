import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { connectionActionSQL } from '../lib/profile-connections.ts';
test('lifetime connections survive event expiry and deduplicate repeated actions', () => {
  const db = new DatabaseSync(':memory:');
  try {
    db.exec(readFileSync('drizzle/0014_profile_engagement.sql', 'utf8'));
    db.exec("INSERT INTO profile_engagement VALUES('1','a','visitor',1,'action','contact','Contact'),('2','a','visitor',2,'action','link:0','Link'),('3','a','passive',3,'view','','')");
    db.exec(readFileSync('drizzle/0026_lifetime_connections.sql', 'utf8'));
    db.exec('DELETE FROM profile_engagement');
    db.prepare('INSERT OR IGNORE INTO profile_connections VALUES(?,?)').run('a','visitor');
    assert.equal(db.prepare('SELECT COUNT(*) n FROM profile_connections WHERE owner_id=?').get('a').n, 1);
    assert.equal(db.prepare('SELECT COUNT(*) n FROM profile_connections WHERE owner_id=?').get('b').n, 0);
  } finally { db.close(); }
});
test('connections count distinct qualifying visitors, exclude passive views, enquiries, other owners and old activity', () => {
  const db = new DatabaseSync(':memory:');
  try {
    db.exec(
      'CREATE TABLE profile_engagement(owner_id TEXT, session_hash TEXT, at INTEGER, kind TEXT, target TEXT)',
    );
    const insert = db.prepare(
      'INSERT INTO profile_engagement VALUES(?,?,?,?,?)',
    );
    for (const row of [
      ['a', 'visitor-1', 100, 'action', 'contact'],
      ['a', 'visitor-1', 101, 'action', 'whatsapp'],
      ['a', 'visitor-1', 102, 'action', 'link:0'],
      ['a', 'visitor-2', 100, 'action', 'service:0'],
      ['a', 'visitor-3', 100, 'view', ''],
      ['a', 'visitor-4', 100, 'action', 'enquiry'],
      ['a', 'visitor-5', 1, 'action', 'website'],
      ['b', 'visitor-6', 100, 'action', 'contact'],
    ])
      insert.run(...row);
    const count = db
      .prepare(
        `SELECT COUNT(DISTINCT session_hash) AS connections FROM profile_engagement WHERE owner_id=? AND at>=? AND ${connectionActionSQL}`,
      )
      .get('a', 50);
    assert.equal(count.connections, 2);
  } finally {
    db.close();
  }
});
