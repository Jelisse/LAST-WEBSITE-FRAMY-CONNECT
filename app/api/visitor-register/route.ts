import { publicVisitorBook } from '@/lib/server-visitor-book';
import { visitorEntry } from '@/lib/visitor-book';
import { database } from '@/lib/server-db';
import { profileBody, profileJSON as json } from '@/lib/profile-api';
import { rateLimit } from '@/lib/request-limits';
export const dynamic = 'force-dynamic';
export async function POST(request: Request) {
  try {
    const b = await profileBody(request, 4000);
    if (!(await rateLimit(request, 'visitor-register', 30, 600000)))
      return json({ error: 'Aguarde antes de tentar novamente.' }, 429);
    const book = await publicVisitorBook((typeof b.token==='string'?b.token:''));
    if (!book) return json({ error: 'Livro de visitas indisponível.' }, 404);
    if (typeof b.requestId !== 'string' || !/^[a-f0-9-]{36}$/.test(b.requestId))
      throw Error('Pedido inválido.');
    const v = visitorEntry(b, {
        purposes: JSON.parse(book.purposes_json),
        departments: JSON.parse(book.departments_json),
      }),
      now = Date.now(),
      db = database();
    const r = await db
      .prepare(
        `INSERT OR IGNORE INTO visitor_entries(id,book_id,name,phone,email,company,position,purpose,department,consent_version,created_at,expires_at) SELECT ?,?,?,?,?,?,?,?,?,?,?,? WHERE EXISTS(SELECT 1 FROM visitor_books b JOIN corporate_active_organisations o ON o.id=b.organisation_id WHERE b.id=? AND b.active=1 AND b.version=? AND b.public_id=?)`,
      )
      .bind(
        b.requestId,
        book.id,
        v.name,
        v.phone,
        v.email,
        v.company,
        v.position,
        v.purpose,
        v.department,
        'visitor-v1',
        now,
        now + book.retention_days * 86400000,
        book.id,
        book.version,
        book.public_id,
      )
      .run();
    if (
      !r.meta.changes &&
      !(await db
        .prepare('SELECT 1 FROM visitor_entries WHERE id=? AND book_id=?')
        .bind(b.requestId, book.id)
        .first())
    )
      return json({ error: 'Livro alterado. Actualize a página.' }, 409);
    return json({ ok: true });
  } catch (e) {
    return json(
      {
        error:
          e instanceof Error &&
          /^(Autorize|Indique|Escolha|Pedido|Email|Campo)/.test(e.message)
            ? e.message
            : 'Confirme os dados e tente novamente.',
      },
      422,
    );
  }
}
