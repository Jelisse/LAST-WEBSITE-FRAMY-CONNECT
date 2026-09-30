// D1 supports standalone PRAGMAs, not SQLite's table-valued PRAGMA joins.
// Never inspect Cloudflare's protected internal tables.
export function readCloudflareSchema(queryBatch) {
  const [objects] = queryBatch("SELECT type,name FROM sqlite_master WHERE type IN ('table','index','trigger','view') AND name NOT GLOB 'sqlite_*' AND name NOT GLOB '_cf_*' ORDER BY name");
  if (!Array.isArray(objects)) throw Error('Invalid schema response.');
  const keys = objects.map(row => `${row.type}:${row.name}`);
  const tables = objects.filter(row => row.type === 'table');
  if (!tables.length) return keys;
  const results = queryBatch(tables.map(row => `PRAGMA table_info('${row.name.replaceAll("'", "''")}')`).join(';'));
  if (results.length !== tables.length) throw Error('Incomplete column metadata response.');
  results.forEach((columns, index) => {
    if (!Array.isArray(columns) || !columns.length) throw Error('Missing column metadata.');
    for (const column of columns) keys.push(`column:${tables[index].name}.${column.name}`);
  });
  return keys;
}
