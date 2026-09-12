import sqlite3,json
from pathlib import Path
db=sqlite3.connect(':memory:')
db.executescript('CREATE TABLE product_catalog(id TEXT,data_json TEXT,version INTEGER); CREATE TABLE sandbox_orders(id TEXT PRIMARY KEY,data_json TEXT); CREATE TABLE sandbox_memberships(owner_id TEXT);')
db.executescript(Path('drizzle/0007_product_personalisation.sql').read_text())
def order(id,option):
 db.execute('INSERT OR IGNORE INTO sandbox_orders VALUES (?,?)',(id,json.dumps({'design':{'optionId':option},'status':'PENDING_PAYMENT'})))
def stock(id):return db.execute('SELECT quantity FROM product_options WHERE id=?',(id,)).fetchone()[0]
order('a','tiktok');assert stock('tiktok')==499
order('a','tiktok');assert stock('tiktok')==499,'Retry must not reserve twice'
db.execute("UPDATE sandbox_orders SET data_json=json_set(data_json,'$.status','CANCELLED') WHERE id='a'")
assert stock('tiktok')==500
db.execute("UPDATE sandbox_orders SET data_json=json_set(data_json,'$.status','CANCELLED') WHERE id='a'")
assert stock('tiktok')==500,'Repeated cancellation must not release twice'
db.execute("UPDATE product_options SET quantity=0 WHERE id='blank-keychain'")
try:order('b','blank-keychain');raise AssertionError('Oversold stock')
except sqlite3.IntegrityError:pass
db.execute("UPDATE product_options SET enabled=0 WHERE id='blank-card'")
try:order('c','blank-card');raise AssertionError('Disabled customisation accepted')
except sqlite3.IntegrityError:pass
db.execute("UPDATE product_options SET quantity=1 WHERE id='instagram'")
order('d','instagram')
try:order('e','instagram');raise AssertionError('Last unit sold twice')
except sqlite3.IntegrityError:pass
assert stock('instagram')==0
print('PASS: initial stock, atomic reservation, idempotent retries, cancellation, manual disable and last-unit protection')
