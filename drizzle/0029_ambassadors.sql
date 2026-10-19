CREATE TABLE ambassadors (
 account_id TEXT PRIMARY KEY REFERENCES auth_accounts(id),
 code TEXT NOT NULL UNIQUE,
 commission_bps INTEGER NOT NULL DEFAULT 1000 CHECK(commission_bps BETWEEN 1000 AND 1500),
 active INTEGER NOT NULL DEFAULT 1 CHECK(active IN (0,1)),
 version INTEGER NOT NULL DEFAULT 1,
 created_at TEXT NOT NULL
);
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
CREATE INDEX ambassador_sales_owner ON ambassador_sales(ambassador_id,created_at);
CREATE TABLE ambassador_payouts (
 id TEXT PRIMARY KEY,
 ambassador_id TEXT NOT NULL REFERENCES ambassadors(account_id),
 amount INTEGER NOT NULL CHECK(amount>0),
 reference TEXT NOT NULL COLLATE NOCASE,
 paid_at TEXT NOT NULL,
 recorded_by TEXT NOT NULL REFERENCES auth_accounts(id),
 created_at TEXT NOT NULL,
 UNIQUE(ambassador_id,reference)
);
CREATE TRIGGER ambassador_verified_payment AFTER UPDATE OF status ON paysuite_payments
WHEN NEW.kind='product' AND NEW.status='paid' AND OLD.status<>'paid'
BEGIN UPDATE ambassador_sales SET status='earned' WHERE order_id=NEW.target_id AND status='pending'; END;
CREATE TRIGGER ambassador_failed_payment AFTER UPDATE OF status ON paysuite_payments
WHEN NEW.kind='product' AND NEW.status='failed'
BEGIN UPDATE ambassador_sales SET status='void' WHERE order_id=NEW.target_id AND status='pending'; END;
CREATE TRIGGER ambassador_refund_hold AFTER INSERT ON manager_audit
WHEN NEW.actor='paysuite' AND NEW.action='refund.success'
BEGIN UPDATE ambassador_sales SET status='held' WHERE status='earned' AND order_id IN (SELECT target_id FROM paysuite_payments WHERE id=NEW.subject AND kind='product'); END;
CREATE TRIGGER ambassador_payouts_immutable_update BEFORE UPDATE ON ambassador_payouts BEGIN SELECT RAISE(ABORT,'immutable payout'); END;
CREATE TRIGGER ambassador_payouts_immutable_delete BEFORE DELETE ON ambassador_payouts BEGIN SELECT RAISE(ABORT,'immutable payout'); END;
CREATE TRIGGER ambassador_sale_guard BEFORE INSERT ON ambassador_sales
WHEN NEW.status<>'pending' OR NEW.discount_amount<>CAST((NEW.base_amount+5)/10 AS INTEGER) OR NEW.commission_amount<>CAST(ROUND(NEW.base_amount*NEW.commission_bps/10000.0) AS INTEGER)
 OR NOT EXISTS(SELECT 1 FROM ambassadors b JOIN auth_accounts a ON a.id=b.account_id AND a.active=1 WHERE b.account_id=NEW.ambassador_id AND b.code=NEW.code AND b.commission_bps=NEW.commission_bps AND b.active=1)
 OR EXISTS(SELECT 1 FROM paysuite_product_orders o WHERE o.id=NEW.order_id AND o.owner_id=NEW.ambassador_id)
BEGIN SELECT RAISE(ABORT,'ambassador quote changed'); END;
