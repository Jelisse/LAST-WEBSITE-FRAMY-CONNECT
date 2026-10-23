-- Guest physical checkout: preserve ledgers and dependent rows in one D1 import.
-- Copy/drop children first so replacing parents never leaves dangling foreign keys.
DROP TRIGGER IF EXISTS paysuite_stock_guard;
DROP TRIGGER IF EXISTS paysuite_stock_reserve;
DROP TRIGGER IF EXISTS paysuite_stock_release;
DROP TRIGGER IF EXISTS paysuite_fulfilment_date;
DROP TRIGGER IF EXISTS product_profile_after_payment;
DROP TRIGGER IF EXISTS product_profile_after_publish;
DROP TRIGGER IF EXISTS product_profile_after_create;
DROP TRIGGER IF EXISTS queue_payment_receipt;
DROP TRIGGER IF EXISTS ambassador_verified_payment;
DROP TRIGGER IF EXISTS ambassador_failed_payment;
DROP TRIGGER IF EXISTS ambassador_refund_hold;
DROP TRIGGER IF EXISTS ambassador_sale_guard;
CREATE TABLE paysuite_events_guest_copy AS SELECT * FROM paysuite_events;
DROP TABLE paysuite_events;
CREATE TABLE payment_email_receipts_guest_copy AS SELECT * FROM payment_email_receipts;
DROP TABLE payment_email_receipts;
CREATE TABLE paysuite_stock_reservations_guest_copy AS SELECT * FROM paysuite_stock_reservations;
DROP TABLE paysuite_stock_reservations;
CREATE TABLE ambassador_sales_guest_copy AS SELECT * FROM ambassador_sales;
DROP TABLE ambassador_sales;
CREATE TABLE paysuite_product_orders_guest_new (
 id TEXT PRIMARY KEY,
 owner_id TEXT REFERENCES auth_accounts(id),
 configuration_json TEXT NOT NULL,
 amount INTEGER NOT NULL CHECK(amount>0),
 status TEXT NOT NULL CHECK(status IN ('pending','paid','fulfilled','failed','review')),
 created_at TEXT NOT NULL
, fulfilled_at TEXT);
INSERT INTO paysuite_product_orders_guest_new(id,owner_id,configuration_json,amount,status,created_at,fulfilled_at) SELECT id,owner_id,configuration_json,amount,status,created_at,fulfilled_at FROM paysuite_product_orders;
DROP TABLE paysuite_product_orders;
ALTER TABLE paysuite_product_orders_guest_new RENAME TO paysuite_product_orders;
CREATE TABLE "paysuite_payments_guest_new" (
 id TEXT PRIMARY KEY,
 owner_id TEXT REFERENCES auth_accounts(id),
 kind TEXT NOT NULL CHECK(kind IN ('product','subscription')),
 target_id TEXT NOT NULL,
 amount INTEGER NOT NULL CHECK(amount>0),
 currency TEXT NOT NULL DEFAULT 'MZN' CHECK(currency='MZN'),
 method TEXT CHECK(method IS NULL OR method IN ('mpesa','emola','credit_card')),
 cycle TEXT NOT NULL CHECK(cycle IN ('once','monthly','annual')),
 provider_id TEXT UNIQUE,
 checkout_url TEXT,
 status TEXT NOT NULL CHECK(status IN ('creating','pending','paid','failed','review')),
 created_at TEXT NOT NULL,
 updated_at TEXT NOT NULL,
 UNIQUE(kind,target_id)
);
INSERT INTO paysuite_payments_guest_new(id,owner_id,kind,target_id,amount,currency,method,cycle,provider_id,checkout_url,status,created_at,updated_at) SELECT id,owner_id,kind,target_id,amount,currency,method,cycle,provider_id,checkout_url,status,created_at,updated_at FROM paysuite_payments;
DROP TABLE paysuite_payments;
ALTER TABLE paysuite_payments_guest_new RENAME TO paysuite_payments;
CREATE TABLE paysuite_events (
 fingerprint TEXT PRIMARY KEY,
 payment_id TEXT NOT NULL REFERENCES paysuite_payments(id),
 event TEXT NOT NULL,
 received_at TEXT NOT NULL
);
INSERT INTO paysuite_events(fingerprint,payment_id,event,received_at) SELECT fingerprint,payment_id,event,received_at FROM paysuite_events_guest_copy;
CREATE TABLE payment_email_receipts (
 payment_id TEXT PRIMARY KEY REFERENCES paysuite_payments(id),
 payload_json TEXT NOT NULL,
 status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','sent','review')),
 created_at INTEGER NOT NULL,
 first_attempt_at INTEGER,
 attempted_at INTEGER,
 sent_at INTEGER,
 provider_message_id TEXT
);
INSERT INTO payment_email_receipts(payment_id,payload_json,status,created_at,first_attempt_at,attempted_at,sent_at,provider_message_id) SELECT payment_id,payload_json,status,created_at,first_attempt_at,attempted_at,sent_at,provider_message_id FROM payment_email_receipts_guest_copy;
CREATE TABLE paysuite_stock_reservations (
 order_id TEXT NOT NULL REFERENCES paysuite_product_orders(id),
 product_id TEXT NOT NULL,
 quantity INTEGER NOT NULL CHECK(quantity>0),
 released INTEGER NOT NULL DEFAULT 0,
 PRIMARY KEY(order_id,product_id)
);
INSERT INTO paysuite_stock_reservations(order_id,product_id,quantity,released) SELECT order_id,product_id,quantity,released FROM paysuite_stock_reservations_guest_copy;
CREATE TABLE ambassador_sales (
 order_id TEXT PRIMARY KEY REFERENCES paysuite_product_orders(id),
 ambassador_id TEXT NOT NULL REFERENCES ambassadors(account_id),
 code TEXT NOT NULL,
 base_amount INTEGER NOT NULL CHECK(base_amount>0),
 discount_amount INTEGER NOT NULL CHECK(discount_amount>=0),
 commission_bps INTEGER NOT NULL CHECK(commission_bps BETWEEN 1000 AND 1500),
 commission_amount INTEGER NOT NULL CHECK(commission_amount>=0),
 status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','earned','void','held')),
 created_at TEXT NOT NULL
);
INSERT INTO ambassador_sales(order_id,ambassador_id,code,base_amount,discount_amount,commission_bps,commission_amount,status,created_at) SELECT order_id,ambassador_id,code,base_amount,discount_amount,commission_bps,commission_amount,status,created_at FROM ambassador_sales_guest_copy;
CREATE INDEX payment_email_receipts_queue ON payment_email_receipts(status,attempted_at);
CREATE INDEX paysuite_owner ON paysuite_payments(owner_id,created_at);
CREATE INDEX ambassador_sales_owner ON ambassador_sales(ambassador_id,created_at);
CREATE TABLE guest_checkout_sessions(id TEXT PRIMARY KEY,token_hash TEXT NOT NULL UNIQUE,expires_at INTEGER NOT NULL);
CREATE TABLE guest_stored_assets(id TEXT PRIMARY KEY,session_id TEXT NOT NULL REFERENCES guest_checkout_sessions(id),bytes INTEGER NOT NULL,created_at TEXT NOT NULL);
CREATE INDEX guest_assets_session ON guest_stored_assets(session_id);
CREATE TABLE guest_purchases(id TEXT PRIMARY KEY,session_id TEXT NOT NULL REFERENCES guest_checkout_sessions(id),name TEXT NOT NULL,email TEXT NOT NULL,created_at INTEGER NOT NULL,last_access_sent INTEGER);
CREATE INDEX guest_purchase_session ON guest_purchases(session_id,created_at);
CREATE TABLE guest_order_access(token_hash TEXT PRIMARY KEY,order_id TEXT NOT NULL REFERENCES guest_purchases(id),expires_at INTEGER NOT NULL);
CREATE TABLE order_progress(order_id TEXT PRIMARY KEY REFERENCES paysuite_product_orders(id),agent_id TEXT REFERENCES auth_accounts(id),stage TEXT NOT NULL DEFAULT 'confirmed' CHECK(stage IN ('confirmed','preparing','ready','dispatched','delivered')),version INTEGER NOT NULL DEFAULT 1,updated_at TEXT NOT NULL);
CREATE TABLE order_progress_events(id TEXT PRIMARY KEY,order_id TEXT NOT NULL REFERENCES paysuite_product_orders(id),stage TEXT NOT NULL,actor TEXT NOT NULL REFERENCES auth_accounts(id),created_at TEXT NOT NULL);
CREATE INDEX order_progress_agent ON order_progress(agent_id,updated_at);
CREATE TABLE guest_order_emails(order_id TEXT PRIMARY KEY REFERENCES guest_purchases(id),status TEXT NOT NULL DEFAULT 'pending',first_attempt_at INTEGER,attempted_at INTEGER);
CREATE TRIGGER paysuite_stock_guard BEFORE INSERT ON paysuite_stock_reservations
WHEN COALESCE((SELECT SUM(quantity) FROM stock_movements WHERE product_id=NEW.product_id),0)
 - (SELECT COUNT(*) FROM sandbox_orders WHERE json_extract(data_json,'$.productId')=NEW.product_id
 AND json_extract(data_json,'$.status') IN ('PENDING_PAYMENT','QUEUED','IN_PRODUCTION','READY')) < NEW.quantity
BEGIN SELECT RAISE(ABORT,'insufficient stock'); END;
CREATE TRIGGER paysuite_stock_reserve AFTER INSERT ON paysuite_stock_reservations BEGIN
 INSERT INTO stock_movements(id,product_id,quantity,reason,actor,created_at)
 VALUES('ps-reserve-'||NEW.order_id||'-'||NEW.product_id,NEW.product_id,-NEW.quantity,'Reserva checkout PaySuite','system',strftime('%Y-%m-%dT%H:%M:%fZ','now'));
END;
CREATE TRIGGER paysuite_stock_release AFTER UPDATE OF released ON paysuite_stock_reservations
WHEN OLD.released=0 AND NEW.released=1 BEGIN
 INSERT INTO stock_movements(id,product_id,quantity,reason,actor,created_at)
 VALUES('ps-release-'||NEW.order_id||'-'||NEW.product_id,NEW.product_id,NEW.quantity,'Libertação checkout PaySuite','system',strftime('%Y-%m-%dT%H:%M:%fZ','now'));
END;
CREATE TRIGGER paysuite_fulfilment_date AFTER UPDATE OF status ON paysuite_product_orders
WHEN NEW.status='fulfilled' AND OLD.status<>'fulfilled' AND NEW.fulfilled_at IS NULL
BEGIN UPDATE paysuite_product_orders SET fulfilled_at=strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id=NEW.id; END;
CREATE TRIGGER product_profile_after_payment AFTER UPDATE OF status ON paysuite_product_orders
WHEN NEW.status='paid' AND json_extract(NEW.configuration_json,'$.profileUsername') IS NULL
BEGIN
 UPDATE paysuite_product_orders
 SET configuration_json=json_set(configuration_json,
 '$.profileUsername',(SELECT username FROM profiles WHERE owner_id=NEW.owner_id),
 '$.profileSnapshot',json((SELECT published_json FROM profiles WHERE owner_id=NEW.owner_id)))
 WHERE id=NEW.id AND EXISTS(SELECT 1 FROM profiles WHERE owner_id=NEW.owner_id AND published_json IS NOT NULL);
END;
CREATE TRIGGER product_profile_after_publish AFTER UPDATE OF published_json ON profiles
WHEN NEW.published_json IS NOT NULL
BEGIN
 UPDATE paysuite_product_orders
 SET configuration_json=json_set(configuration_json,'$.profileUsername',NEW.username,'$.profileSnapshot',json(NEW.published_json))
 WHERE owner_id=NEW.owner_id AND status='paid' AND json_extract(configuration_json,'$.profileUsername') IS NULL;
END;
CREATE TRIGGER product_profile_after_create AFTER INSERT ON profiles
WHEN NEW.published_json IS NOT NULL
BEGIN
 UPDATE paysuite_product_orders
 SET configuration_json=json_set(configuration_json,'$.profileUsername',NEW.username,'$.profileSnapshot',json(NEW.published_json))
 WHERE owner_id=NEW.owner_id AND status='paid' AND json_extract(configuration_json,'$.profileUsername') IS NULL;
END;
CREATE TRIGGER queue_payment_receipt AFTER UPDATE OF status ON paysuite_payments
WHEN NEW.status='paid' AND OLD.status<>'paid'
BEGIN
 INSERT OR IGNORE INTO payment_email_receipts(payment_id,payload_json,created_at)
 SELECT NEW.id,json_object('email',COALESCE(a.email,g.email),'name',COALESCE(a.name,g.name),'amount',NEW.amount,'kind',NEW.kind,'cycle',NEW.cycle,'method',NEW.method,'reference',NEW.id,'providerReference',NEW.provider_id,'paidAt',NEW.updated_at,
 'configuration',json((SELECT configuration_json FROM paysuite_product_orders WHERE id=NEW.target_id AND owner_id IS NEW.owner_id)),
 'terms',json((SELECT terms_json FROM profile_invoices WHERE id=NEW.target_id AND owner_id IS NEW.owner_id)),
 'periodStart',(SELECT period_start FROM profile_invoices WHERE id=NEW.target_id AND owner_id IS NEW.owner_id),
 'periodEnd',(SELECT period_end FROM profile_invoices WHERE id=NEW.target_id AND owner_id IS NEW.owner_id)),unixepoch()*1000
 FROM (SELECT 1) seed LEFT JOIN auth_accounts a ON a.id=NEW.owner_id LEFT JOIN guest_purchases g ON g.id=NEW.id WHERE a.id IS NOT NULL OR g.id IS NOT NULL;
END;
CREATE TRIGGER ambassador_verified_payment AFTER UPDATE OF status ON paysuite_payments
WHEN NEW.kind='product' AND NEW.status='paid' AND OLD.status<>'paid'
BEGIN UPDATE ambassador_sales SET status='earned' WHERE order_id=NEW.target_id AND status='pending'; END;
CREATE TRIGGER ambassador_failed_payment AFTER UPDATE OF status ON paysuite_payments
WHEN NEW.kind='product' AND NEW.status='failed'
BEGIN UPDATE ambassador_sales SET status='void' WHERE order_id=NEW.target_id AND status='pending'; END;
CREATE TRIGGER ambassador_refund_hold AFTER INSERT ON manager_audit
WHEN NEW.actor='paysuite' AND NEW.action='refund.success'
BEGIN UPDATE ambassador_sales SET status='held' WHERE status='earned' AND order_id IN (SELECT target_id FROM paysuite_payments WHERE id=NEW.subject AND kind='product'); END;
CREATE TRIGGER ambassador_sale_guard BEFORE INSERT ON ambassador_sales
WHEN NEW.status<>'pending' OR NEW.discount_amount<>CAST((NEW.base_amount+5)/10 AS INTEGER) OR NEW.commission_amount<>CAST(ROUND(NEW.base_amount*NEW.commission_bps/10000.0) AS INTEGER)
 OR NOT EXISTS(SELECT 1 FROM ambassadors b JOIN auth_accounts a ON a.id=b.account_id AND a.active=1 WHERE b.account_id=NEW.ambassador_id AND b.code=NEW.code AND b.commission_bps=NEW.commission_bps AND b.active=1)
 OR EXISTS(SELECT 1 FROM paysuite_product_orders o WHERE o.id=NEW.order_id AND o.owner_id=NEW.ambassador_id)
BEGIN SELECT RAISE(ABORT,'ambassador quote changed'); END;
CREATE TRIGGER guest_payment_guard BEFORE INSERT ON paysuite_payments WHEN NEW.owner_id IS NULL AND (NEW.kind<>'product' OR NOT EXISTS(SELECT 1 FROM guest_purchases WHERE id=NEW.id)) BEGIN SELECT RAISE(ABORT,'guest product only'); END;
CREATE TRIGGER guest_order_guard BEFORE INSERT ON paysuite_product_orders WHEN NEW.owner_id IS NULL AND NOT EXISTS(SELECT 1 FROM guest_purchases WHERE id=NEW.id) BEGIN SELECT RAISE(ABORT,'guest identity required'); END;
-- Verify exact dependent data preservation before removing the transaction-local copies.
CREATE TABLE guest_checkout_migration_guard(ok INTEGER NOT NULL CHECK(ok=1));
INSERT INTO guest_checkout_migration_guard SELECT CASE WHEN EXISTS(SELECT * FROM paysuite_events EXCEPT SELECT * FROM paysuite_events_guest_copy) OR EXISTS(SELECT * FROM paysuite_events_guest_copy EXCEPT SELECT * FROM paysuite_events) THEN 0 ELSE 1 END;
INSERT INTO guest_checkout_migration_guard SELECT CASE WHEN EXISTS(SELECT * FROM payment_email_receipts EXCEPT SELECT * FROM payment_email_receipts_guest_copy) OR EXISTS(SELECT * FROM payment_email_receipts_guest_copy EXCEPT SELECT * FROM payment_email_receipts) THEN 0 ELSE 1 END;
INSERT INTO guest_checkout_migration_guard SELECT CASE WHEN EXISTS(SELECT * FROM paysuite_stock_reservations EXCEPT SELECT * FROM paysuite_stock_reservations_guest_copy) OR EXISTS(SELECT * FROM paysuite_stock_reservations_guest_copy EXCEPT SELECT * FROM paysuite_stock_reservations) THEN 0 ELSE 1 END;
INSERT INTO guest_checkout_migration_guard SELECT CASE WHEN EXISTS(SELECT * FROM ambassador_sales EXCEPT SELECT * FROM ambassador_sales_guest_copy) OR EXISTS(SELECT * FROM ambassador_sales_guest_copy EXCEPT SELECT * FROM ambassador_sales) THEN 0 ELSE 1 END;
DROP TABLE guest_checkout_migration_guard;
DROP TABLE paysuite_events_guest_copy;
DROP TABLE payment_email_receipts_guest_copy;
DROP TABLE paysuite_stock_reservations_guest_copy;
DROP TABLE ambassador_sales_guest_copy;
