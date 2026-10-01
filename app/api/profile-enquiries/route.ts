import { getChatGPTUser } from '@/app/chatgpt-auth';
import { database } from '@/lib/server-db';
import { profileBody, profileJSON as json } from '@/lib/profile-api';
import { cleanText } from '@/lib/profile-growth';
import { activeProfileSQL, hasPlanFeature } from '@/lib/entitlement';
import {
  profileMembership,
  publishedProfile,
} from '@/lib/server-profile-access';
import { rateLimit } from '@/lib/request-limits';
import type { Profile } from '@/lib/domain';
export const dynamic = 'force-dynamic';
export async function GET() {
  const u = await getChatGPTUser();
  if (!u) return json({ error: 'Inicie sessão.' }, 401);
  try {
    const rows = await database()
      .prepare(
        'SELECT * FROM profile_enquiries WHERE owner_id=? AND created_at>? ORDER BY created_at DESC LIMIT 100',
      )
      .bind(u.userId, Date.now() - 90 * 86400000)
      .all();
    return json({ enquiries: rows.results });
  } catch {
    return json({ error: 'Caixa de entrada indisponível.' }, 503);
  }
}
export async function POST(request: Request) {
  try {
    const b = await profileBody(request, 6000),
      db = database();
    if (b.action === 'status' || b.action === 'delete') {
      const u = await getChatGPTUser();
      if (!u) return json({ error: 'Inicie sessão.' }, 401);
      const id = cleanText(b.id, 80, true);
      if (b.action === 'delete')
        await db
          .prepare('DELETE FROM profile_enquiries WHERE id=? AND owner_id=?')
          .bind(id, u.userId)
          .run();
      else {
        if (!['new', 'read', 'closed'].includes(String(b.status)))
          throw Error('Estado inválido.');
        await db
          .prepare(
            'UPDATE profile_enquiries SET status=? WHERE id=? AND owner_id=?',
          )
          .bind(b.status, id, u.userId)
          .run();
      }
      return json({ ok: true });
    }
    if (b.website) return json({ ok: true });
    if (b.consent !== true)
      throw Error(
        'Autorize a partilha da mensagem e contacto com este negócio.',
      );
    const username = cleanText(b.username, 40, true);
    if (!/^[a-z0-9_]{3,40}$/.test(username)) throw Error('Perfil inválido.');
    const name = cleanText(b.name, 90, true),
      email = cleanText(b.email, 160, true),
      message = cleanText(b.message, 1500, true);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || message.length < 10)
      throw Error(
        'Indique um email válido e uma mensagem com pelo menos 10 caracteres.',
      );
    if (!(await rateLimit(request, 'profile-enquiry', 5)))
      return json({ error: 'Enviou várias mensagens. Tente mais tarde.' }, 429);
    const now = new Date().toISOString();
    const row = await db
      .prepare(
        `SELECT owner_id,published_json FROM profiles WHERE username=? AND published_json IS NOT NULL AND ${activeProfileSQL}`,
      )
      .bind(username, now, now)
      .first<{ owner_id: string; published_json: string }>();
    if (!row || !hasPlanFeature(await profileMembership(row.owner_id), 'enquiries'))
      return json({ error: 'Este formulário está indisponível.' }, 404);
    const profile = await publishedProfile(
      row.owner_id,
      JSON.parse(row.published_json) as Profile,
    );
    if (!profile.extras?.enquiries)
      return json({ error: 'Este formulário está indisponível.' }, 404);
    const id = cleanText(b.id, 36, true);
    if (!/^[a-f0-9-]{36}$/.test(id)) throw Error('Identificador inválido.');
    const result = await db
      .prepare(
        'INSERT OR IGNORE INTO profile_enquiries(id,owner_id,name,email,message,created_at) SELECT ?,?,?,?,?,? WHERE (SELECT COUNT(*) FROM profile_enquiries WHERE owner_id=? AND created_at>?)<100',
      )
      .bind(
        id,
        row.owner_id,
        name,
        email,
        message,
        Date.now(),
        row.owner_id,
        Date.now() - 86400000,
      )
      .run();
    if (
      !result.meta.changes &&
      !(await db
        .prepare('SELECT id FROM profile_enquiries WHERE id=? AND owner_id=?')
        .bind(id, row.owner_id)
        .first())
    )
      return json(
        {
          error:
            'Este negócio atingiu o limite diário de mensagens. Use outro contacto.',
        },
        429,
      );
    return json({ ok: true });
  } catch (e) {
    return json(
      {
        error:
          e instanceof Error && !/SQLITE|D1|no such/.test(e.message)
            ? e.message
            : 'Não foi possível enviar a mensagem.',
      },
      422,
    );
  }
}
