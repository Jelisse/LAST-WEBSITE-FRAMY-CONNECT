-- Publish the approved starting prices once; subsequent manager edits remain authoritative.
UPDATE product_catalog SET data_json=json_set(data_json,'$.amount',CASE id WHEN 'pvc' THEN 95000 WHEN 'keychain' THEN 50000 WHEN 'wood' THEN 100000 WHEN 'metal' THEN 150000 WHEN 'keychain-leather' THEN 120000 END,'$.configurationPriceConfirmed',json('true')),version=version+1 WHERE id IN ('pvc','keychain','wood','metal','keychain-leather');
UPDATE product_catalog SET data_json=json_set(data_json,'$.kitAmount',135000) WHERE id='pvc';
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
CREATE INDEX payment_email_receipts_queue ON payment_email_receipts(status,attempted_at);
-- This outbox is committed atomically with the verified payment transition.
CREATE TRIGGER queue_payment_receipt AFTER UPDATE OF status ON paysuite_payments
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
