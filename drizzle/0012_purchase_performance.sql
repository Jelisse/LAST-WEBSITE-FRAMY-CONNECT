-- Move the existing one-time initialization out of the public request path.
-- Its original marker preserves all later sales and stock adjustments.
INSERT OR IGNORE INTO stock_movements(id,product_id,quantity,reason,actor,created_at,agent_id)
SELECT 'owner-count-keychain-20260918','keychain',500-COALESCE(SUM(quantity),0),
'Contagem física confirmada pelo proprietário: 500 porta-chaves','system:owner-count',
strftime('%Y-%m-%dT%H:%M:%fZ','now'),''
FROM stock_movements WHERE product_id='keychain';
--> statement-breakpoint
CREATE INDEX orders_product_status ON sandbox_orders(json_extract(data_json,'$.productId'),json_extract(data_json,'$.status'));
--> statement-breakpoint
CREATE INDEX orders_owner_status ON sandbox_orders(owner_id,json_extract(data_json,'$.status'));
--> statement-breakpoint
CREATE INDEX orders_expiration ON sandbox_orders(
  json_extract(data_json,'$.status'),
  json_extract(data_json,'$.paid'),
  COALESCE(json_extract(data_json,'$.reservationExpiresAt'),strftime('%Y-%m-%dT%H:%M:%fZ',created_at,'+1 day'))
);
