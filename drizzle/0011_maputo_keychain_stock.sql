-- Owner-confirmed existing physical stock, Maputo, Mozambique, 19 September 2026.
-- This distributes the existing 500 units; it does NOT receive 500 additional units.
-- Option quantities are available-to-order, so retain outstanding reservations.
UPDATE product_options
SET quantity = MAX(0,
    CASE id WHEN 'instagram' THEN 175 WHEN 'tiktok' THEN 175 WHEN 'pattern' THEN 150 END
    - (SELECT COUNT(*) FROM sandbox_orders
       WHERE json_extract(data_json,'$.productId')='keychain'
         AND json_extract(data_json,'$.design.optionId')=product_options.id
         AND json_extract(data_json,'$.status') IN ('PENDING_PAYMENT','QUEUED','IN_PRODUCTION','READY'))),
    enabled=1, version=version+1
WHERE id IN ('instagram','tiktok','pattern')
  AND NOT EXISTS (SELECT 1 FROM manager_audit WHERE id='owner-maputo-keychain-count-20260919');
--> statement-breakpoint
UPDATE product_options SET quantity=0,enabled=0,version=version+1
WHERE id='blank-keychain'
  AND NOT EXISTS (SELECT 1 FROM manager_audit WHERE id='owner-maputo-keychain-count-20260919');
--> statement-breakpoint
INSERT OR IGNORE INTO manager_audit(id,actor,action,subject,created_at)
VALUES('owner-maputo-keychain-count-20260919','system:owner-count',
  'Contagem física confirmada pelo proprietário',
  'Maputo, Moçambique: Instagram 175; TikTok 175; Padrão artístico 150. Total existente: 500 porta-chaves NFC. Sem entrada adicional de stock.',
  strftime('%Y-%m-%dT%H:%M:%fZ','now'));
