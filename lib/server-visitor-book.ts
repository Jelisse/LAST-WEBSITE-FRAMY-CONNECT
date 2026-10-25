import { database } from './server-db';
import { corporateAccess, corporatePlan } from './server-corporate';
import type { VisitorBook } from './visitor-book';
export async function publicVisitorBook(token: string) {
  if (!/^[a-f0-9]{32}$/.test(token)) return null;
  const b = await database()
    .prepare(
      `SELECT b.*,o.name AS organisation_name,o.owner_id,CASE WHEN b.show_logo=1 THEN json_extract(t.template_json,'$.logoUrl') ELSE NULL END AS logo_url FROM visitor_books b JOIN corporate_active_organisations o ON o.id=b.organisation_id LEFT JOIN corporate_templates t ON t.organisation_id=o.id WHERE b.public_id=? AND b.active=1 AND NOT EXISTS(SELECT 1 FROM demo_accounts d WHERE d.account_id=o.owner_id AND d.expires_at<=CAST(strftime('%s','now') AS INTEGER)*1000)`,
    )
    .bind(token)
    .first<VisitorBook & { owner_id: string }>();
  if (!b) return null;
  try {
    await corporatePlan(b.owner_id);
    return b;
  } catch {
    return null;
  }
}
export async function visitorBookAccess(
  user: string,
  id: string,
  manage = false,
) {
  const b = await database()
    .prepare('SELECT * FROM visitor_books WHERE id=?')
    .bind(id)
    .first<VisitorBook>();
  if (!b) throw Error('Livro indisponível ou sem permissão.');
  const org = await corporateAccess(user, b.organisation_id);
  if (
    org.role !== 'leader' &&
    (manage ||
      !(await database()
        .prepare(
          'SELECT 1 FROM visitor_book_access WHERE book_id=? AND account_id=?',
        )
        .bind(id, user)
        .first()))
  )
    throw Error('Livro indisponível ou sem permissão.');
  return { book: b, org };
}
export const visitorReadGuard = `EXISTS(SELECT 1 FROM visitor_books vb JOIN corporate_effective_members vm ON vm.organisation_id=vb.organisation_id AND vm.active=1 WHERE vb.id=visitor_entries.book_id AND vm.account_id=? AND (vm.role='leader' OR EXISTS(SELECT 1 FROM visitor_book_access va WHERE va.book_id=vb.id AND va.account_id=vm.account_id)))`;
export const visitorManageGuard = `EXISTS(SELECT 1 FROM corporate_effective_members vm WHERE vm.organisation_id=visitor_books.organisation_id AND vm.active=1 AND vm.account_id=? AND vm.role='leader')`;
