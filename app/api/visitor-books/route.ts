import { getChatGPTUser } from '@/app/chatgpt-auth';
import { database } from '@/lib/server-db';
import { corporateAccess } from '@/lib/server-corporate';
import {
  visitorBookAccess,
  visitorReadGuard,
  visitorManageGuard,
} from '@/lib/server-visitor-book';
import { profileBody, profileJSON as json } from '@/lib/profile-api';
import { visitorConfig, visitorCSV } from '@/lib/visitor-book';
import { rateLimit } from '@/lib/request-limits';
export const dynamic = 'force-dynamic';
export async function GET(request: Request) {
  const u = await getChatGPTUser();
  if (!u) return json({ error: 'Entre na sua conta.' }, 401);
  try {
    const q = new URL(request.url).searchParams,
      db = database(),
      org = await corporateAccess(u.userId, q.get('organisation') || '');
    const books = await db
      .prepare(
        `SELECT b.* FROM visitor_books b WHERE b.organisation_id=? AND (?='leader' OR EXISTS(SELECT 1 FROM visitor_book_access a WHERE a.book_id=b.id AND a.account_id=?)) ORDER BY b.created_at LIMIT 20`,
      )
      .bind(org.id, org.role, u.userId)
      .all();
    const members =
      org.role === 'leader'
        ? await db
            .prepare(
              'SELECT m.account_id,a.name FROM corporate_effective_members m JOIN auth_accounts a ON a.id=m.account_id WHERE m.organisation_id=? AND m.active=1 ORDER BY a.name LIMIT 501',
            )
            .bind(org.id)
            .all()
        : { results: [] };
    const id = q.get('book');
    if (!id)
      return json({
        books: books.results,
        members: members.results,
        leader: org.role === 'leader',
      });
    const { book } = await visitorBookAccess(u.userId, id);
    if (book.organisation_id !== org.id) throw Error();
    const from = q.get('from') || '',
      to = q.get('to') || '';
    if (
      (from && !/^\d{4}-\d{2}-\d{2}$/.test(from)) ||
      (to && !/^\d{4}-\d{2}-\d{2}$/.test(to))
    )
      throw Error();
    const start = from ? Date.parse(from + 'T00:00:00+02:00') : 0,
      end = to ? Date.parse(to + 'T23:59:59.999+02:00') : Date.now();
    if (!Number.isFinite(start) || !Number.isFinite(end) || end < start)
      throw Error();
    const search = (q.get('search') || '').slice(0, 100),
      after = Number(q.get('offset') || 0);
    if (!Number.isInteger(after) || after < 0 || after > 100000) throw Error();
    const exporting = q.get('export') === 'csv',
      limit = exporting ? 1001 : 51;
    const r = await db
      .prepare(
        `SELECT id,name,phone,email,company,position,purpose,department,created_at FROM visitor_entries WHERE book_id=? AND expires_at>? AND created_at>? AND created_at BETWEEN ? AND ? AND (instr(lower(name),lower(?))>0 OR instr(lower(company),lower(?))>0) AND ${visitorReadGuard} AND (?=0 OR EXISTS(SELECT 1 FROM corporate_effective_members em WHERE em.organisation_id=? AND em.account_id=? AND em.active=1 AND em.role='leader')) ORDER BY created_at DESC,id DESC LIMIT ? OFFSET ?`,
      )
      .bind(
        id,
        Date.now(),
        Date.now() - book.retention_days * 86400000,
        start,
        end,
        search,
        search,
        u.userId,
        exporting ? 1 : 0,
        org.id,
        u.userId,
        limit,
        exporting ? 0 : after,
      )
      .all<Record<string, unknown>>();
    if (exporting) {
      if (org.role !== 'leader')
        return json({ error: 'Só os responsáveis podem exportar.' }, 403);
      if (r.results.length > 1000)
        return json(
          { error: 'Reduza o intervalo para exportar até 1000 visitas.' },
          422,
        );
      await db
        .prepare('INSERT INTO corporate_audit VALUES(?,?,?,?,?,?)')
        .bind(
          crypto.randomUUID(),
          org.id,
          u.userId,
          'visitor-export',
          id,
          Date.now(),
        )
        .run();
      return new Response(visitorCSV(r.results), {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': 'attachment; filename="visitas.csv"',
          'Cache-Control': 'private, no-store',
        },
      });
    }
    const access =
      org.role === 'leader'
        ? await db
            .prepare(
              'SELECT account_id FROM visitor_book_access WHERE book_id=?',
            )
            .bind(id)
            .all()
        : { results: [] };
    return json({
      books: books.results,
      members: members.results,
      leader: org.role === 'leader',
      entries: r.results.slice(0, 50),
      more: r.results.length > 50,
      access: access.results,
    });
  } catch {
    return json({ error: 'Livro indisponível ou sem permissão.' }, 403);
  }
}
export async function POST(request: Request) {
  const u = await getChatGPTUser();
  if (!u) return json({ error: 'Entre na sua conta.' }, 401);
  try {
    const b = await profileBody(request, 6000);
    if (!(await rateLimit(request, 'visitor-admin', 120, 600000)))
      return json({ error: 'Aguarde antes de tentar novamente.' }, 429);
    const db = database(),
      now = Date.now(),
      org = await corporateAccess(
        u.userId,
        typeof b.organisation === 'string' ? b.organisation : '',
        true,
      );
    let id = typeof b.book === 'string' ? b.book : '';
    if (b.action === 'create') {
      const c = visitorConfig(b);
      id = crypto.randomUUID();
      const r = await db
        .prepare(
          `INSERT INTO visitor_books(id,organisation_id,public_id,name,welcome,show_logo,active,retention_days,purposes_json,departments_json,created_at,updated_at) SELECT ?,?,?,?,?,?,?,?,?,?,?,? WHERE EXISTS(SELECT 1 FROM corporate_effective_members m WHERE m.organisation_id=? AND m.account_id=? AND m.active=1 AND m.role='leader') AND (SELECT COUNT(*) FROM visitor_books WHERE organisation_id=?)<20`,
        )
        .bind(
          id,
          org.id,
          crypto.randomUUID().replaceAll('-', ''),
          c.name,
          c.welcome,
          c.showLogo ? 1 : 0,
          c.active ? 1 : 0,
          c.retentionDays,
          JSON.stringify(c.purposes),
          JSON.stringify(c.departments),
          now,
          now,
          org.id,
          u.userId,
          org.id,
        )
        .run();
      if (!r.meta.changes) throw Error();
    } else {
      const { book } = await visitorBookAccess(u.userId, id, true);
      if (book.organisation_id !== org.id || b.version !== book.version)
        return json({ error: 'Actualize a página antes de guardar.' }, 409);
      if (b.action === 'save') {
        const c = visitorConfig(b);
        const r = await db
          .prepare(
            `UPDATE visitor_books SET name=?,welcome=?,show_logo=?,active=?,retention_days=?,purposes_json=?,departments_json=?,version=version+1,updated_at=? WHERE id=? AND version=? AND ${visitorManageGuard}`,
          )
          .bind(
            c.name,
            c.welcome,
            c.showLogo ? 1 : 0,
            c.active ? 1 : 0,
            c.retentionDays,
            JSON.stringify(c.purposes),
            JSON.stringify(c.departments),
            now,
            id,
            book.version,
            u.userId,
          )
          .run();
        if (!r.meta.changes) throw Error();
        await db
          .prepare(
            `UPDATE visitor_entries SET expires_at=MIN(expires_at,created_at+?) WHERE book_id=? AND ${visitorReadGuard}`,
          )
          .bind(c.retentionDays * 86400000, id, u.userId)
          .run();
      } else if (b.action === 'rotate') {
        const r = await db
          .prepare(
            `UPDATE visitor_books SET public_id=?,version=version+1,updated_at=? WHERE id=? AND version=? AND ${visitorManageGuard}`,
          )
          .bind(
            crypto.randomUUID().replaceAll('-', ''),
            now,
            id,
            book.version,
            u.userId,
          )
          .run();
        if (!r.meta.changes) throw Error();
      } else if (b.action === 'access') {
        const account = typeof b.account === 'string' ? b.account : '';
        const target = await db
          .prepare(
            'SELECT 1 FROM corporate_effective_members WHERE organisation_id=? AND account_id=? AND active=1',
          )
          .bind(org.id, account)
          .first();
        if (!target) throw Error();
        if (b.enabled === true)
          await db
            .prepare(
              `INSERT OR IGNORE INTO visitor_book_access SELECT visitor_books.id,? FROM visitor_books WHERE visitor_books.id=? AND ${visitorManageGuard} AND EXISTS(SELECT 1 FROM corporate_effective_members t WHERE t.organisation_id=visitor_books.organisation_id AND t.account_id=? AND t.active=1)`,
            )
            .bind(account, id, u.userId, account)
            .run();
        else
          await db
            .prepare(
              `DELETE FROM visitor_book_access WHERE book_id=? AND account_id=? AND EXISTS(SELECT 1 FROM visitor_books WHERE id=? AND ${visitorManageGuard})`,
            )
            .bind(id, account, id, u.userId)
            .run();
      } else throw Error();
    }
    await db
      .prepare('INSERT INTO corporate_audit VALUES(?,?,?,?,?,?)')
      .bind(
        crypto.randomUUID(),
        org.id,
        u.userId,
        'visitor-' + (typeof b.action === 'string' ? b.action : ''),
        id,
        now,
      )
      .run();
    return json({ ok: true, book: id });
  } catch {
    return json(
      {
        error: 'Não foi possível guardar. Confirme os campos e as permissões.',
      },
      422,
    );
  }
}
