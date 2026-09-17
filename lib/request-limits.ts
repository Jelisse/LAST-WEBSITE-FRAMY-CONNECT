import { database } from './server-db';
import { tokenHash } from './server-auth';
export async function rateLimit(
  request: Request,
  scope: string,
  max: number,
  windowMs = 3600000,
) {
  const now = Date.now();
  const key =
    scope +
    ':' +
    (await tokenHash(request.headers.get('cf-connecting-ip') || 'local'));
  const row = await database()
    .prepare(`INSERT INTO auth_attempts(key,count,expires_at) VALUES(?,1,?)
    ON CONFLICT(key) DO UPDATE SET count=CASE WHEN auth_attempts.expires_at<=? THEN 1 ELSE auth_attempts.count+1 END,
    expires_at=CASE WHEN auth_attempts.expires_at<=? THEN excluded.expires_at ELSE auth_attempts.expires_at END RETURNING count`)
    .bind(key, now + windowMs, now, now)
    .first<{ count: number }>();
  return (row?.count ?? max + 1) <= max;
}
