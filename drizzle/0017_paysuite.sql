-- Additive gateway ledger. Existing manual orders and invoices remain intact.
CREATE TABLE paysuite_payments (
 id TEXT PRIMARY KEY,
 owner_id TEXT NOT NULL REFERENCES auth_accounts(id),
 kind TEXT NOT NULL CHECK(kind IN ('product','subscription')),
 target_id TEXT NOT NULL,
 amount INTEGER NOT NULL CHECK(amount>0),
 currency TEXT NOT NULL DEFAULT 'MZN' CHECK(currency='MZN'),
 method TEXT NOT NULL CHECK(method IN ('mpesa','emola','credit_card')),
 cycle TEXT NOT NULL CHECK(cycle IN ('once','monthly','annual')),
 provider_id TEXT UNIQUE,
 checkout_url TEXT,
 status TEXT NOT NULL CHECK(status IN ('creating','pending','paid','failed','review')),
 created_at TEXT NOT NULL,
 updated_at TEXT NOT NULL,
 UNIQUE(kind,target_id)
);
CREATE INDEX paysuite_owner ON paysuite_payments(owner_id,created_at);
CREATE TABLE paysuite_events (
 fingerprint TEXT PRIMARY KEY,
 payment_id TEXT NOT NULL REFERENCES paysuite_payments(id),
 event TEXT NOT NULL,
 received_at TEXT NOT NULL
);
CREATE TABLE checkout_pricing (
 id INTEGER PRIMARY KEY CHECK(id=1),
 customer_design INTEGER NOT NULL DEFAULT 15000 CHECK(customer_design>=0),
 team_design INTEGER NOT NULL DEFAULT 50000 CHECK(team_design>=0),
 maputo_delivery INTEGER NOT NULL DEFAULT 20000 CHECK(maputo_delivery>=0),
 enabled INTEGER NOT NULL DEFAULT 0,
 version INTEGER NOT NULL DEFAULT 0
);
INSERT INTO checkout_pricing(id) VALUES(1);
CREATE TABLE paysuite_product_orders (
 id TEXT PRIMARY KEY,
 owner_id TEXT NOT NULL REFERENCES auth_accounts(id),
 configuration_json TEXT NOT NULL,
 amount INTEGER NOT NULL CHECK(amount>0),
 status TEXT NOT NULL CHECK(status IN ('pending','paid','fulfilled','failed','review')),
 created_at TEXT NOT NULL
);
CREATE TABLE paysuite_stock_reservations (
 order_id TEXT NOT NULL REFERENCES paysuite_product_orders(id),
 product_id TEXT NOT NULL,
 quantity INTEGER NOT NULL CHECK(quantity>0),
 released INTEGER NOT NULL DEFAULT 0,
 PRIMARY KEY(order_id,product_id)
);
-- Fail the transaction rather than overselling against simultaneous checkouts.
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
