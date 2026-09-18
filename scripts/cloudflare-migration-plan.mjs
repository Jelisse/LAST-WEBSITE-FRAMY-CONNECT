import { DatabaseSync } from 'node:sqlite';
import { readFileSync, readdirSync } from 'node:fs';

export const schemaInventorySQL = `SELECT type || ':' || name AS key FROM sqlite_master
 WHERE type IN ('table','index','trigger') AND name NOT LIKE 'sqlite_%'
 UNION ALL SELECT 'column:' || m.name || '.' || p.name AS key
 FROM sqlite_master m JOIN pragma_table_info(m.name) p
 WHERE m.type='table' AND m.name NOT LIKE 'sqlite_%'`;
export const stockMarker = 'owner-maputo-keychain-count-20260919';

export function migrationPlan(actualKeys, stockRecorded, directory = 'drizzle') {
  const expected = new DatabaseSync(':memory:');
  const available = new Set(actualKeys);
  const apply = [], skipped = [];
  try {
    for (const file of readdirSync(directory).filter(f => f.endsWith('.sql')).sort()) {
      const before = new Set(expected.prepare(schemaInventorySQL).all().map(r => r.key));
      expected.exec(readFileSync(`${directory}/${file}`, 'utf8'));
      const after = new Set(expected.prepare(schemaInventorySQL).all().map(r => r.key));
      if ([...before].some(k => !after.has(k)))
        throw Error(`Non-additive migration ${file}. Manual review required.`);
      const additions = [...after].filter(k => !before.has(k));
      if (!additions.length) {
        if (file === '0011_maputo_keychain_stock.sql' && !stockRecorded) apply.push(file);
        else if (file === '0008_printed_pvc_price.sql' || file === '0011_maputo_keychain_stock.sql') skipped.push(file);
        else throw Error(`Unrecognized data migration ${file}. Manual review required.`);
        continue;
      }
      const present = additions.filter(k => available.has(k));
      if (present.length && present.length !== additions.length)
        throw Error(`Partial migration ${file}. Inspect it manually; no automatic repair is safe.`);
      if (present.length === additions.length) skipped.push(file);
      else {
        apply.push(file);
        additions.forEach(k => available.add(k));
      }
    }
    return { apply, skipped };
  } finally { expected.close(); }
}
