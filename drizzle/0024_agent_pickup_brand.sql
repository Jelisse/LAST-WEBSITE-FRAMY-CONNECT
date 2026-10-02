-- Preserve manager edits and historical order/payment snapshots.
CREATE INDEX fulfilment_updates_created_at ON fulfilment_updates(created_at);
UPDATE checkout_pricing
SET fulfilment_json = json_set(
 fulfilment_json,
 '$.points[' || (SELECT key FROM json_each(fulfilment_json, '$.points')
   WHERE json_extract(value, '$.id') = 'mahota'
     AND json_extract(value, '$.name') = 'Ponto Agente Mahotas' LIMIT 1) || '].name',
 'Agente FramyConnect — Mahotas'
), version = version + 1
WHERE EXISTS (SELECT 1 FROM json_each(fulfilment_json, '$.points')
 WHERE json_extract(value, '$.id') = 'mahota'
   AND json_extract(value, '$.name') = 'Ponto Agente Mahotas');
INSERT INTO fulfilment_updates(id, description, created_at)
VALUES ('mahota-agent-brand', 'Pickup point renamed to Agente FramyConnect — Mahotas', strftime('%Y-%m-%dT%H:%M:%fZ','now'));
