import { env } from 'cloudflare:workers';
import { getChatGPTUser } from '@/app/chatgpt-auth';
import { profileBody, profileJSON as json } from '@/lib/profile-api';
import { validateDesignImage } from '@/lib/design-images';
export const dynamic = 'force-dynamic';
export async function GET() {
  if ((await getChatGPTUser())?.role !== 'manager')
    return json({ error: 'Acesso reservado ao gestor.' }, 403);
  try {
    const rows = await env.DB.prepare('SELECT * FROM design_images').all();
    return json({ images: rows.results });
  } catch {
    return json(
      { error: 'Imagens indisponíveis. Verifique as migrações.' },
      503,
    );
  }
}
export async function PUT(request: Request) {
  const user = await getChatGPTUser();
  if (user?.role !== 'manager')
    return json({ error: 'Acesso reservado ao gestor.' }, 403);
  let row;
  try {
    row = validateDesignImage(await profileBody(request));
  } catch (e) {
    return json(
      { error: e instanceof Error ? e.message : 'Dados inválidos.' },
      422,
    );
  }
  try {
    const result = await env.DB.batch([
      env.DB.prepare(
        'UPDATE design_images SET image=?,alt=?,version=version+1 WHERE id=? AND version=?',
      ).bind(row.image, row.alt, row.id, row.version),
      env.DB.prepare(
        "INSERT INTO manager_audit(id,actor,action,subject,created_at) SELECT ?,?,'Imagem de design actualizada',?,? WHERE changes()=1",
      ).bind(
        crypto.randomUUID(),
        user.userId,
        row.id,
        new Date().toISOString(),
      ),
    ]);
    if (!result[0].meta.changes)
      return json(
        { error: 'Esta opção mudou. Actualize antes de guardar.' },
        409,
      );
    return json({ image: { ...row, version: row.version + 1 } });
  } catch {
    return json({ error: 'Não foi possível guardar a imagem.' }, 503);
  }
}
