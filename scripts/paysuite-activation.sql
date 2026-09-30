UPDATE checkout_pricing SET enabled=1,version=version+1 WHERE id=1 AND enabled=0;
UPDATE profile_billing_settings
SET enabled=1,
    opened_at=strftime('%Y-%m-%dT%H:%M:%fZ','now'),
    instructions=CASE WHEN trim(instructions)='' THEN 'Pague na página segura da PaySuite a partir da sua conta. Cada renovação exige a sua autorização; não há débito automático.' ELSE instructions END,
    version=version+1
WHERE id=1 AND enabled=0;
INSERT OR IGNORE INTO manager_audit(id,actor,action,subject,created_at)
VALUES('paysuite-live-launch-v1','deployment','Pagamentos PaySuite activados','Produtos e planos; preços existentes preservados',strftime('%Y-%m-%dT%H:%M:%fZ','now'));
