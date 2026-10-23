import { database } from './server-db';
const MAX_ACCOUNT_BYTES = 50 * 1024 * 1024;
export async function reserveUpload(
  id: string,
  ownerId: string,
  kind: string,
  bytes: number,
) {
  if (ownerId.startsWith('guest:')) {
    const session = ownerId.slice(6);
    const result = await database()
      .prepare(
        'INSERT INTO guest_stored_assets(id,session_id,bytes,created_at) SELECT ?,?,?,? WHERE (SELECT COALESCE(SUM(bytes),0) FROM guest_stored_assets WHERE session_id=?)+?<=? AND (SELECT COUNT(*) FROM guest_stored_assets WHERE session_id=?)<20',
      )
      .bind(
        id,
        session,
        bytes,
        new Date().toISOString(),
        session,
        bytes,
        20 * 1024 * 1024,
        session,
      )
      .run();
    return result.meta.changes === 1;
  }
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
  if (ownerId.startsWith('guest:')) {
    await database()
      .prepare('DELETE FROM guest_stored_assets WHERE id=? AND session_id=?')
      .bind(id, ownerId.slice(6))
      .run();
    return;
  }
  await database()
    .prepare('DELETE FROM stored_assets WHERE id=? AND owner_id=?')
    .bind(id, ownerId)
    .run();
}
