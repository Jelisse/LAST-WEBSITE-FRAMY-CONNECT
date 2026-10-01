-- Attach an owned, published profile only after verified product payment.
-- Preserve already-associated production snapshots and existing paid terms.
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
