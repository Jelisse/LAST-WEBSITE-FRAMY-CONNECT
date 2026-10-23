-- Customer references are separate from immutable provider/internal IDs.
-- Allocation runs in the original insert transaction; unique indexes prevent collisions.


ALTER TABLE paysuite_product_orders ADD COLUMN public_reference TEXT;

CREATE UNIQUE INDEX paysuite_product_orders_public_reference ON paysuite_product_orders(public_reference);

CREATE TRIGGER paysuite_product_orders_reference_insert AFTER INSERT ON paysuite_product_orders
 WHEN NEW.public_reference IS NULL
 BEGIN
 UPDATE paysuite_product_orders SET public_reference=(WITH RECURSIVE attempts(n) AS (SELECT 1 UNION ALL SELECT n+1 FROM attempts WHERE n<16),
 seeds AS MATERIALIZED (SELECT '01' || substr(NEW.created_at,3,2) || printf('%07d',abs(random() % 10000000)) AS digits FROM attempts),
 candidates AS MATERIALIZED (SELECT 'FC-OR-' || substr(digits,3,2) || '-' || substr(digits,5,4) || '-' || substr(digits,9,3) || ((10 - ((((CAST(substr(digits,1,1) AS INTEGER) * 2) / 10 + (CAST(substr(digits,1,1) AS INTEGER) * 2) % 10) + CAST(substr(digits,2,1) AS INTEGER) + ((CAST(substr(digits,3,1) AS INTEGER) * 2) / 10 + (CAST(substr(digits,3,1) AS INTEGER) * 2) % 10) + CAST(substr(digits,4,1) AS INTEGER) + ((CAST(substr(digits,5,1) AS INTEGER) * 2) / 10 + (CAST(substr(digits,5,1) AS INTEGER) * 2) % 10) + CAST(substr(digits,6,1) AS INTEGER) + ((CAST(substr(digits,7,1) AS INTEGER) * 2) / 10 + (CAST(substr(digits,7,1) AS INTEGER) * 2) % 10) + CAST(substr(digits,8,1) AS INTEGER) + ((CAST(substr(digits,9,1) AS INTEGER) * 2) / 10 + (CAST(substr(digits,9,1) AS INTEGER) * 2) % 10) + CAST(substr(digits,10,1) AS INTEGER) + ((CAST(substr(digits,11,1) AS INTEGER) * 2) / 10 + (CAST(substr(digits,11,1) AS INTEGER) * 2) % 10)) % 10)) % 10) AS reference FROM seeds)
 SELECT reference FROM candidates WHERE NOT EXISTS(SELECT 1 FROM paysuite_product_orders existing WHERE existing.public_reference=candidates.reference) LIMIT 1) WHERE id=NEW.id;
 SELECT CASE WHEN (SELECT public_reference FROM paysuite_product_orders WHERE id=NEW.id) IS NULL THEN RAISE(ABORT,'reference allocation exhausted') END;
 END;

CREATE TRIGGER paysuite_product_orders_reference_backfill AFTER UPDATE OF public_reference ON paysuite_product_orders
 WHEN NEW.public_reference IS NULL
 BEGIN
 UPDATE paysuite_product_orders SET public_reference=(WITH RECURSIVE attempts(n) AS (SELECT 1 UNION ALL SELECT n+1 FROM attempts WHERE n<16),
 seeds AS MATERIALIZED (SELECT '01' || substr(NEW.created_at,3,2) || printf('%07d',abs(random() % 10000000)) AS digits FROM attempts),
 candidates AS MATERIALIZED (SELECT 'FC-OR-' || substr(digits,3,2) || '-' || substr(digits,5,4) || '-' || substr(digits,9,3) || ((10 - ((((CAST(substr(digits,1,1) AS INTEGER) * 2) / 10 + (CAST(substr(digits,1,1) AS INTEGER) * 2) % 10) + CAST(substr(digits,2,1) AS INTEGER) + ((CAST(substr(digits,3,1) AS INTEGER) * 2) / 10 + (CAST(substr(digits,3,1) AS INTEGER) * 2) % 10) + CAST(substr(digits,4,1) AS INTEGER) + ((CAST(substr(digits,5,1) AS INTEGER) * 2) / 10 + (CAST(substr(digits,5,1) AS INTEGER) * 2) % 10) + CAST(substr(digits,6,1) AS INTEGER) + ((CAST(substr(digits,7,1) AS INTEGER) * 2) / 10 + (CAST(substr(digits,7,1) AS INTEGER) * 2) % 10) + CAST(substr(digits,8,1) AS INTEGER) + ((CAST(substr(digits,9,1) AS INTEGER) * 2) / 10 + (CAST(substr(digits,9,1) AS INTEGER) * 2) % 10) + CAST(substr(digits,10,1) AS INTEGER) + ((CAST(substr(digits,11,1) AS INTEGER) * 2) / 10 + (CAST(substr(digits,11,1) AS INTEGER) * 2) % 10)) % 10)) % 10) AS reference FROM seeds)
 SELECT reference FROM candidates WHERE NOT EXISTS(SELECT 1 FROM paysuite_product_orders existing WHERE existing.public_reference=candidates.reference) LIMIT 1) WHERE id=NEW.id;
 SELECT CASE WHEN (SELECT public_reference FROM paysuite_product_orders WHERE id=NEW.id) IS NULL THEN RAISE(ABORT,'reference allocation exhausted') END;
 END;

UPDATE paysuite_product_orders SET public_reference=NULL WHERE public_reference IS NULL;

CREATE TRIGGER paysuite_product_orders_reference_immutable BEFORE UPDATE OF public_reference ON paysuite_product_orders
 WHEN OLD.public_reference IS NOT NULL AND NEW.public_reference IS NOT OLD.public_reference
 BEGIN SELECT RAISE(ABORT,'public reference is immutable'); END;

ALTER TABLE paysuite_payments ADD COLUMN public_reference TEXT;

CREATE UNIQUE INDEX paysuite_payments_public_reference ON paysuite_payments(public_reference);

CREATE TRIGGER paysuite_payments_reference_insert AFTER INSERT ON paysuite_payments
 WHEN NEW.public_reference IS NULL
 BEGIN
 UPDATE paysuite_payments SET public_reference=(WITH RECURSIVE attempts(n) AS (SELECT 1 UNION ALL SELECT n+1 FROM attempts WHERE n<16),
 seeds AS MATERIALIZED (SELECT '02' || substr(NEW.created_at,3,2) || printf('%07d',abs(random() % 10000000)) AS digits FROM attempts),
 candidates AS MATERIALIZED (SELECT 'FC-PY-' || substr(digits,3,2) || '-' || substr(digits,5,4) || '-' || substr(digits,9,3) || ((10 - ((((CAST(substr(digits,1,1) AS INTEGER) * 2) / 10 + (CAST(substr(digits,1,1) AS INTEGER) * 2) % 10) + CAST(substr(digits,2,1) AS INTEGER) + ((CAST(substr(digits,3,1) AS INTEGER) * 2) / 10 + (CAST(substr(digits,3,1) AS INTEGER) * 2) % 10) + CAST(substr(digits,4,1) AS INTEGER) + ((CAST(substr(digits,5,1) AS INTEGER) * 2) / 10 + (CAST(substr(digits,5,1) AS INTEGER) * 2) % 10) + CAST(substr(digits,6,1) AS INTEGER) + ((CAST(substr(digits,7,1) AS INTEGER) * 2) / 10 + (CAST(substr(digits,7,1) AS INTEGER) * 2) % 10) + CAST(substr(digits,8,1) AS INTEGER) + ((CAST(substr(digits,9,1) AS INTEGER) * 2) / 10 + (CAST(substr(digits,9,1) AS INTEGER) * 2) % 10) + CAST(substr(digits,10,1) AS INTEGER) + ((CAST(substr(digits,11,1) AS INTEGER) * 2) / 10 + (CAST(substr(digits,11,1) AS INTEGER) * 2) % 10)) % 10)) % 10) AS reference FROM seeds)
 SELECT reference FROM candidates WHERE NOT EXISTS(SELECT 1 FROM paysuite_payments existing WHERE existing.public_reference=candidates.reference) LIMIT 1) WHERE id=NEW.id;
 SELECT CASE WHEN (SELECT public_reference FROM paysuite_payments WHERE id=NEW.id) IS NULL THEN RAISE(ABORT,'reference allocation exhausted') END;
 END;

CREATE TRIGGER paysuite_payments_reference_backfill AFTER UPDATE OF public_reference ON paysuite_payments
 WHEN NEW.public_reference IS NULL
 BEGIN
 UPDATE paysuite_payments SET public_reference=(WITH RECURSIVE attempts(n) AS (SELECT 1 UNION ALL SELECT n+1 FROM attempts WHERE n<16),
 seeds AS MATERIALIZED (SELECT '02' || substr(NEW.created_at,3,2) || printf('%07d',abs(random() % 10000000)) AS digits FROM attempts),
 candidates AS MATERIALIZED (SELECT 'FC-PY-' || substr(digits,3,2) || '-' || substr(digits,5,4) || '-' || substr(digits,9,3) || ((10 - ((((CAST(substr(digits,1,1) AS INTEGER) * 2) / 10 + (CAST(substr(digits,1,1) AS INTEGER) * 2) % 10) + CAST(substr(digits,2,1) AS INTEGER) + ((CAST(substr(digits,3,1) AS INTEGER) * 2) / 10 + (CAST(substr(digits,3,1) AS INTEGER) * 2) % 10) + CAST(substr(digits,4,1) AS INTEGER) + ((CAST(substr(digits,5,1) AS INTEGER) * 2) / 10 + (CAST(substr(digits,5,1) AS INTEGER) * 2) % 10) + CAST(substr(digits,6,1) AS INTEGER) + ((CAST(substr(digits,7,1) AS INTEGER) * 2) / 10 + (CAST(substr(digits,7,1) AS INTEGER) * 2) % 10) + CAST(substr(digits,8,1) AS INTEGER) + ((CAST(substr(digits,9,1) AS INTEGER) * 2) / 10 + (CAST(substr(digits,9,1) AS INTEGER) * 2) % 10) + CAST(substr(digits,10,1) AS INTEGER) + ((CAST(substr(digits,11,1) AS INTEGER) * 2) / 10 + (CAST(substr(digits,11,1) AS INTEGER) * 2) % 10)) % 10)) % 10) AS reference FROM seeds)
 SELECT reference FROM candidates WHERE NOT EXISTS(SELECT 1 FROM paysuite_payments existing WHERE existing.public_reference=candidates.reference) LIMIT 1) WHERE id=NEW.id;
 SELECT CASE WHEN (SELECT public_reference FROM paysuite_payments WHERE id=NEW.id) IS NULL THEN RAISE(ABORT,'reference allocation exhausted') END;
 END;

UPDATE paysuite_payments SET public_reference=NULL WHERE public_reference IS NULL;

CREATE TRIGGER paysuite_payments_reference_immutable BEFORE UPDATE OF public_reference ON paysuite_payments
 WHEN OLD.public_reference IS NOT NULL AND NEW.public_reference IS NOT OLD.public_reference
 BEGIN SELECT RAISE(ABORT,'public reference is immutable'); END;
