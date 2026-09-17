import { database } from './server-db';
const MAX_ACCOUNT_BYTES = 50 * 1024 * 1024;
export async function reserveUpload(
  id: string,
  ownerId: string,
  kind: string,
  bytes: number,
) {
  const result = await database()
    .prepare(`INSERT INTO stored_assets(id,owner_id,kind,bytes,created_at)
    SELECT ?,?,?,?,? WHERE COALESCE((SELECT SUM(bytes) FROM stored_assets WHERE owner_id=?),0)+?<=?
    AND (SELECT COUNT(*) FROM stored_assets WHERE owner_id=?)<?`)
    .bind(
      id,
      ownerId,
      kind,
      bytes,
      new Date().toISOString(),
      ownerId,
      bytes,
      kind === 'product' ? 500 * 1024 * 1024 : MAX_ACCOUNT_BYTES,
      ownerId,
      kind === 'product' ? 1000 : 100,
    )
    .run();
  return result.meta.changes === 1;
}
export async function releaseUpload(id: string, ownerId: string) {
  await database()
    .prepare('DELETE FROM stored_assets WHERE id=? AND owner_id=?')
    .bind(id, ownerId)
    .run();
}
