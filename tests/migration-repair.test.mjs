import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync, readdirSync } from 'node:fs';
import {
  migrationPlan,
  schemaInventorySQL,
} from '../scripts/cloudflare-migration-plan.mjs';
const files = readdirSync('drizzle')
  .filter((f) => f.endsWith('.sql'))
  .sort();
function snapshot(count) {
  const db = new DatabaseSync(':memory:');
  for (const file of files.slice(0, count))
    db.exec(readFileSync(`drizzle/${file}`, 'utf8'));
  const keys = db
    .prepare(schemaInventorySQL)
    .all()
    .map((r) => r.key);
  db.close();
  return keys;
}

test('permanent Individual migration preserves paid contracts, profile drafts and archived trial terms', () => {
  const db = new DatabaseSync(':memory:');
  try {
    for (const file of files.filter(f => f !== '0030_permanent_individual.sql')) db.exec(readFileSync(`drizzle/${file}`, 'utf8'));
    const terms = JSON.stringify({ id: 'professional-v2', meticais: 975, links: 30, bio: 900 });
    for (const id of ['trial-fixture','paid-fixture','new-fixture']) db.prepare("INSERT INTO auth_accounts(id,email,name,password_hash,role,created_at) VALUES(?,?,?,'unused','customer','2026-10-01')").run(id,id+'@example.invalid',id);
    db.prepare("INSERT INTO sandbox_memberships(owner_id,plan_id,updated_at,terms_json,trial_started_at,trial_expires_at) VALUES('trial-fixture','free-30','2026-10-01',?,'2026-09-01','2026-10-01')").run(terms);
    db.prepare("INSERT INTO sandbox_memberships(owner_id,plan_id,updated_at,terms_json,paid_started_at,paid_expires_at) VALUES('paid-fixture','professional-v2','2026-10-01',?,'2026-10-01','2027-10-01')").run(terms);
    db.prepare("INSERT INTO profiles(owner_id,username,draft_json,updated_at) VALUES('trial-fixture','fixture-user',?,'2026-10-01')").run(JSON.stringify({name:'Fixture',bio:'Saved private biography',links:Array.from({length:20},(_,i)=>({label:String(i),url:'https://example.invalid/'+i}))}));
    const draftBefore = db.prepare("SELECT draft_json FROM profiles WHERE owner_id='trial-fixture'").get().draft_json;
    const paidBefore = db.prepare("SELECT * FROM sandbox_memberships WHERE owner_id='paid-fixture'").get();
    db.exec(readFileSync('drizzle/0030_permanent_individual.sql','utf8'));
    assert.deepEqual(db.prepare("SELECT * FROM sandbox_memberships WHERE owner_id='paid-fixture'").get(),paidBefore);
    const former = db.prepare("SELECT * FROM sandbox_memberships WHERE owner_id='trial-fixture'").get();
    assert.equal(former.plan_id,'personal');
    assert.equal(db.prepare("SELECT draft_json FROM profiles WHERE owner_id='trial-fixture'").get().draft_json,draftBefore);
    assert.equal(JSON.parse(former.terms_json).meticais,0);
    assert.equal(db.prepare("SELECT terms_json FROM retired_trial_memberships WHERE owner_id='trial-fixture'").get().terms_json,terms);
    const fresh = db.prepare("SELECT * FROM sandbox_memberships WHERE owner_id='new-fixture'").get();
    assert.equal(fresh.plan_id,'personal');
    assert.equal(fresh.trial_expires_at,null);
    assert.equal(db.prepare('SELECT enabled FROM profile_billing_settings WHERE id=1').get().enabled,1);
    assert.deepEqual(db.prepare('PRAGMA foreign_key_check').all(),[]);
  } finally { db.close(); }
});
test('database repair identifies missing post-auth migrations without replaying historical price edits', () => {
  assert.deepEqual(migrationPlan(snapshot(7), false).apply, [
    '0007_product_personalisation.sql',
    '0009_launch_security.sql',
    '0010_catalog_applications.sql',
    '0011_maputo_keychain_stock.sql',
    '0012_purchase_performance.sql',
    '0013_website_analytics.sql',
    '0014_profile_engagement.sql',
    '0015_profile_growth.sql',
    '0016_customer_recovery.sql',
    '0017_paysuite.sql',
      '0018_subscription_management.sql',
      '0019_post_payment_profile.sql',
      '0020_payment_receipts_and_prices.sql',
      '0021_publish_base_products.sql',
      '0022_optional_fulfilment.sql',
      '0023_agent_pickup_name.sql',
      '0024_agent_pickup_brand.sql',
    '0025_design_images.sql',
    '0026_lifetime_connections.sql',
    '0028_profile_click_totals.sql',
    '0029_ambassadors.sql',
    '0030_permanent_individual.sql',
    '0031_corporate_organisations.sql',
    '0032_corporate_onboarding.sql',
    '0033_profile_publication_alerts.sql',
    '0034_guest_product_checkout.sql',
    '0035_company_cards_followup.sql',
    '0036_company_experience.sql',
      '0037_company_tools.sql',
      '0038_public_references.sql',
  ]);
});
test('database repair is a no-op when schema and inventory migration are applied', () => {
  assert.deepEqual(migrationPlan(snapshot(files.length), true).apply, []);
});
test('database repair stops on partially applied migration instead of overwriting data', () => {
  assert.throws(
    () => migrationPlan([...snapshot(7), 'table:product_options'], false),
    /Partial migration 0007/,
  );
});
test('database repair applies the guarded inventory correction when only its marker is missing', () => {
  assert.deepEqual(migrationPlan(snapshot(files.length), false).apply, [
    '0011_maputo_keychain_stock.sql',
  ]);
});


test('base product publication exposes approved prices without inventing stock availability', () => {
  const db = new DatabaseSync(':memory:');
  db.exec("CREATE TABLE product_catalog(id TEXT PRIMARY KEY,data_json TEXT,version INTEGER,updated_at TEXT)");
  db.prepare('INSERT INTO product_catalog VALUES(?,?,1,?)').run('pvc',JSON.stringify({published:false,available:false,amount:95000,kitAmount:135000,configurationPriceConfirmed:true}),'2026-10-01');
  db.exec(readFileSync('drizzle/0021_publish_base_products.sql','utf8'));
  const row=db.prepare("SELECT * FROM product_catalog WHERE id='pvc'").get();const product=JSON.parse(row.data_json);
  assert.equal(product.published,true);assert.equal(product.available,false);assert.equal(product.amount,95000);assert.equal(product.kitAmount,135000);assert.equal(row.version,2);
  db.close();
});

test('paysuite method-optional rebuild is planned only while its marker is missing', () => {
  const full = snapshot(files.length);
  assert.deepEqual(migrationPlan(full, true, 'drizzle', true).apply, []);
  assert.deepEqual(migrationPlan(full, true, 'drizzle', false).apply, [
    '0027_paysuite_method_optional.sql',
  ]);
});

test('paysuite method-optional rebuild preserves rows, relaxes the check and stays idempotent', () => {
  const db = new DatabaseSync(':memory:');
  db.exec('PRAGMA foreign_keys=ON');
  for (const file of files.filter((f) => f < '0027'))
    db.exec(readFileSync(`drizzle/${file}`, 'utf8'));
  db.exec(
    "INSERT INTO auth_accounts(id,name,email,password_hash,role,active,version,created_at) VALUES('u1','U','u@x.co','x','customer',1,1,'2026-01-01')",
  );
  db.exec(
    "INSERT INTO paysuite_payments(id,owner_id,kind,target_id,amount,method,cycle,status,created_at,updated_at) VALUES('pay1','u1','product','pay1',50000,'mpesa','once','paid','2026-01-02','2026-01-02')",
  );
  db.exec(
    "INSERT INTO paysuite_events(fingerprint,payment_id,event,received_at) VALUES('fp1','pay1','payment.success','2026-01-02')",
  );
  const migration = readFileSync(
    'drizzle/0027_paysuite_method_optional.sql',
    'utf8',
  );
  db.exec(migration);
  const kept = db
    .prepare('SELECT method,status FROM paysuite_payments WHERE id=?')
    .get('pay1');
  assert.equal(kept.method, 'mpesa');
  assert.equal(kept.status, 'paid');
  db.prepare(
    "INSERT INTO paysuite_payments(id,owner_id,kind,target_id,amount,method,cycle,status,created_at,updated_at) VALUES('pay2','u1','product','pay2',100,NULL,'once','creating','2026-01-03','2026-01-03')",
  ).run();
  assert.throws(() =>
    db
      .prepare(
        "INSERT INTO paysuite_payments(id,owner_id,kind,target_id,amount,method,cycle,status,created_at,updated_at) VALUES('pay3','u1','product','pay3',100,'bogus','once','creating','2026-01-03','2026-01-03')",
      )
      .run(),
  );
  // The events ledger still enforces its reference to the rebuilt table.
  assert.throws(() =>
    db
      .prepare(
        "INSERT INTO paysuite_events(fingerprint,payment_id,event,received_at) VALUES('fp2','missing','x','2026-01-03')",
      )
      .run(),
  );
  assert.equal(
    db
      .prepare("SELECT COUNT(*) AS n FROM manager_audit WHERE id='paysuite-method-optional-20261010'")
      .get().n,
    1,
  );
  // A retried run keeps every row and never duplicates the marker.
  db.exec(migration);
  assert.equal(
    db.prepare('SELECT COUNT(*) AS n FROM paysuite_payments').get().n,
    2,
  );
  assert.equal(
    db
      .prepare("SELECT COUNT(*) AS n FROM manager_audit WHERE id='paysuite-method-optional-20261010'")
      .get().n,
    1,
  );
  db.close();
});


test('publication alert migration baselines existing published profiles without historical email flood',()=>{
 const db=new DatabaseSync(':memory:');try{
  for(const file of files.filter(f=>f!=='0033_profile_publication_alerts.sql'))db.exec(readFileSync('drizzle/'+file,'utf8'));
  db.exec("INSERT INTO auth_accounts(id,email,name,password_hash,role,created_at) VALUES('old','old@example.invalid','Old','unused','customer','2026-10-19'); INSERT INTO profiles(owner_id,username,draft_json,published_json,updated_at) VALUES('old','old-profile','{}','{}','2026-10-19')");
  db.exec(readFileSync('drizzle/0033_profile_publication_alerts.sql','utf8'));assert.equal(db.prepare("SELECT status FROM profile_publication_alerts WHERE owner_id='old'").get().status,'baseline');
  db.exec("UPDATE profiles SET published_json=NULL WHERE owner_id='old';UPDATE profiles SET published_json='{}' WHERE owner_id='old'");assert.equal(db.prepare("SELECT status FROM profile_publication_alerts WHERE owner_id='old'").get().status,'baseline');
 }finally{db.close();}
});
