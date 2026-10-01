-- Publish the base products explicitly requested for the homepage.
-- Preserve stock and checkout availability; publication is not stock confirmation.
CREATE TABLE catalogue_publications (
 id TEXT PRIMARY KEY,
 product_ids TEXT NOT NULL,
 reason TEXT NOT NULL,
 created_at TEXT NOT NULL
);
UPDATE product_catalog SET data_json=json_set(data_json,'$.published',json('true')),version=version+1,updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id IN ('pvc','keychain') AND json_extract(data_json,'$.published')=0;
INSERT INTO catalogue_publications(id,product_ids,reason,created_at) VALUES('base-products-20261002','["pvc","keychain"]','Owner-approved homepage base prices: PVC 950 MT, keychain 500 MT, kit 1350 MT',strftime('%Y-%m-%dT%H:%M:%fZ','now'));
