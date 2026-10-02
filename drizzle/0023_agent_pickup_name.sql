-- Rename the initial pickup point without overwriting manager customisations
-- or historical order/payment snapshots.
CREATE TABLE fulfilment_updates (
 id TEXT PRIMARY KEY,
 description TEXT NOT NULL,
 created_at TEXT NOT NULL
);
UPDATE checkout_pricing
SET fulfilment_json = json_set(
 fulfilment_json,
 '$.points[' || (SELECT key FROM json_each(fulfilment_json, '$.points')
   WHERE json_extract(value, '$.id') = 'mahota'
     AND json_extract(value, '$.name') = 'Framy Connect · Mahota' LIMIT 1) || '].name',
 'Ponto Agente Mahotas'
), version = version + 1
WHERE EXISTS (SELECT 1 FROM json_each(fulfilment_json, '$.points')
 WHERE json_extract(value, '$.id') = 'mahota'
   AND json_extract(value, '$.name') = 'Framy Connect · Mahota');
INSERT INTO fulfilment_updates(id, description, created_at)
VALUES ('mahota-agent-name', 'Initial pickup point renamed to Ponto Agente Mahotas', strftime('%Y-%m-%dT%H:%M:%fZ','now'));
