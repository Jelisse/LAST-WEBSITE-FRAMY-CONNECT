import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync,readdirSync} from 'node:fs';
import {normalizeReference} from '../lib/public-reference.ts';
function database() { const db=new DatabaseSync(':memory:');db.exec('PRAGMA foreign_keys=ON');for(const file of readdirSync('drizzle').filter(f=>f.endsWith('.sql')&&f<'0038').sort())db.exec(readFileSync('drizzle/'+file,'utf8'));db.exec("INSERT INTO auth_accounts(id,email,name,password_hash,role,active,created_at) VALUES('reference-owner','reference@example.invalid','Reference test','fake','customer',1,'2026-10-23')");return db; }
const insert="INSERT INTO paysuite_product_orders(id,owner_id,configuration_json,amount,status,created_at) VALUES(?,'reference-owner','{}',100,'pending','2026-10-23T00:00:00.000Z')";
test('public reference migration preserves populated orders and assigns unique immutable checked references atomically',()=>{
 const db=database();db.prepare(insert).run('legacy');db.exec(readFileSync('drizzle/0038_public_references.sql','utf8'));
 const before=db.prepare("SELECT * FROM paysuite_product_orders WHERE id='legacy'").get();assert.equal(before.amount,100);assert.equal(before.status,'pending');
 const refs=new Set();db.exec('BEGIN');for(let i=0;i<1000;i++)db.prepare(insert).run('order-'+i);db.exec('COMMIT');
 for(const {public_reference:ref} of db.prepare('SELECT public_reference FROM paysuite_product_orders').all()) {
  assert.equal(ref.length,18);assert.equal(normalizeReference(ref),ref);assert.equal(normalizeReference(ref.toLowerCase().replaceAll('-',' ')),ref);refs.add(ref);
  for(let i=6;i<ref.length;i++)if(/\d/.test(ref[i])) {const wrong=ref.slice(0,i)+(Number(ref[i])+1)%10+ref.slice(i+1);assert.equal(normalizeReference(wrong),null);}
 }
 assert.equal(refs.size,1001);
 db.prepare("UPDATE paysuite_product_orders SET status='paid' WHERE id='legacy'").run();assert.equal(db.prepare("SELECT public_reference FROM paysuite_product_orders WHERE id='legacy'").get().public_reference,before.public_reference);
 assert.throws(()=>db.prepare("UPDATE paysuite_product_orders SET public_reference=NULL WHERE id='legacy'").run(),/immutable/);
 assert.equal(normalizeReference('a'.repeat(32)),'a'.repeat(32));for(const v of ['FC-XX-26-1234-5678','https://example.com','', 'FC-OR-26-1234-5678'])assert.equal(normalizeReference(v),null);
 db.close();
});
test('allocation retries occupied candidates and rolls back rather than creating an unreferenced order',()=>{
 const db=database();db.exec(readFileSync('drizzle/0038_public_references.sql','utf8'));
 db.function('random',()=>1234567);db.prepare(insert).run('one');assert.throws(()=>db.prepare(insert).run('collision'),/allocation exhausted/);assert.equal(db.prepare("SELECT id FROM paysuite_product_orders WHERE id='collision'").get(),undefined);
 let n=0;db.function('random',()=>n++<1?1234567:7654321);db.prepare(insert).run('retry');assert.equal(db.prepare('SELECT count(*) AS n FROM paysuite_product_orders').get().n,2);db.close();
});
