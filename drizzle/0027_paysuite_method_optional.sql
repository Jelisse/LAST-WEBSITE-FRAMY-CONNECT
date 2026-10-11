-- PaySuite hosted checkout lets the customer choose the method on the
-- provider page, so paysuite_payments.method must accept NULL until the
-- provider reports the chosen method. SQLite cannot relax a CHECK in place:
-- rebuild the table, preserving every row. Idempotent so an interrupted run
-- can be retried safely.
PRAGMA foreign_keys=OFF;
--> statement-breakpoint
PRAGMA defer_foreign_keys=ON;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS paysuite_payments_new (
 id TEXT PRIMARY KEY,
 owner_id TEXT NOT NULL REFERENCES auth_accounts(id),
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
--> statement-breakpoint
INSERT OR IGNORE INTO paysuite_payments_new SELECT * FROM paysuite_payments;
--> statement-breakpoint
DROP TABLE IF EXISTS paysuite_payments;
--> statement-breakpoint
ALTER TABLE paysuite_payments_new RENAME TO paysuite_payments;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS paysuite_owner ON paysuite_payments(owner_id,created_at);
--> statement-breakpoint
-- DROP TABLE removes triggers on the old table; restore the receipt outbox
-- trigger from 0020 verbatim.
CREATE TRIGGER IF NOT EXISTS queue_payment_receipt AFTER UPDATE OF status ON paysuite_payments
WHEN NEW.status='paid' AND OLD.status<>'paid'
BEGIN
 INSERT OR IGNORE INTO payment_email_receipts(payment_id,payload_json,created_at)
 SELECT NEW.id,json_object('email',a.email,'name',a.name,'amount',NEW.amount,'kind',NEW.kind,'cycle',NEW.cycle,'method',NEW.method,'reference',NEW.id,'providerReference',NEW.provider_id,'paidAt',NEW.updated_at,
 'configuration',json((SELECT configuration_json FROM paysuite_product_orders WHERE id=NEW.target_id AND owner_id=NEW.owner_id)),
 'terms',json((SELECT terms_json FROM profile_invoices WHERE id=NEW.target_id AND owner_id=NEW.owner_id)),
 'periodStart',(SELECT period_start FROM profile_invoices WHERE id=NEW.target_id AND owner_id=NEW.owner_id),
 'periodEnd',(SELECT period_end FROM profile_invoices WHERE id=NEW.target_id AND owner_id=NEW.owner_id)),unixepoch()*1000
 FROM auth_accounts a WHERE a.id=NEW.owner_id;
END;
--> statement-breakpoint
INSERT OR IGNORE INTO manager_audit(id,actor,action,subject,created_at)
VALUES('paysuite-method-optional-20261010','system:migration',
 'Método de pagamento escolhido na PaySuite',
 'paysuite_payments.method aceita NULL até a PaySuite confirmar o método escolhido pelo cliente na página de checkout.',
 strftime('%Y-%m-%dT%H:%M:%fZ','now'));
--> statement-breakpoint
PRAGMA foreign_keys=ON;
