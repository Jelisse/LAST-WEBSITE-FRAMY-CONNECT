CREATE TABLE product_options (
 id TEXT PRIMARY KEY, label TEXT NOT NULL,
 quantity INTEGER NOT NULL CHECK(quantity >= 0),
 enabled INTEGER NOT NULL DEFAULT 1 CHECK(enabled IN (0,1)),
 version INTEGER NOT NULL DEFAULT 0
);
--> statement-breakpoint
INSERT INTO product_options(id,label,quantity) VALUES
 ('tiktok','Porta-chaves TikTok',500),
 ('pattern','Porta-chaves Padrão artístico',500),
 ('instagram','Porta-chaves Instagram',500),
 ('blank-keychain','Porta-chaves em branco',500),
 ('blank-card','Cartões em branco',500);
--> statement-breakpoint
UPDATE product_catalog SET data_json=json_set(data_json,'$.amount',50000),version=version+1 WHERE id='keychain';
--> statement-breakpoint
-- Reserve exactly one unit in the same transaction as order creation.
CREATE TRIGGER reserve_product_option AFTER INSERT ON sandbox_orders
WHEN json_extract(NEW.data_json,'$.design.optionId') IS NOT NULL
BEGIN
 SELECT CASE WHEN NOT EXISTS (
  SELECT 1 FROM product_options WHERE id=json_extract(NEW.data_json,'$.design.optionId') AND quantity>0 AND enabled=1
 ) THEN RAISE(ABORT,'Modelo sem stock ou desactivado') END;
 UPDATE product_options SET quantity=quantity-1,version=version+1 WHERE id=json_extract(NEW.data_json,'$.design.optionId');
END;
--> statement-breakpoint
CREATE TRIGGER release_product_option AFTER UPDATE ON sandbox_orders
WHEN json_extract(NEW.data_json,'$.status')='CANCELLED' AND json_extract(OLD.data_json,'$.status')!='CANCELLED'
BEGIN
 UPDATE product_options SET quantity=quantity+1,version=version+1 WHERE id=json_extract(OLD.data_json,'$.design.optionId');
END;
--> statement-breakpoint
ALTER TABLE sandbox_memberships ADD trial_started_at TEXT;
--> statement-breakpoint
ALTER TABLE sandbox_memberships ADD trial_expires_at TEXT;
