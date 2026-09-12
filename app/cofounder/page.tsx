import Link from '@/components/hard-link';
import { requireChatGPTUser } from '@/app/chatgpt-auth';
import { database } from '@/lib/server-db';
import { orderLabels } from '@/lib/domain';
import '../entrar/style.css';
export const dynamic = 'force-dynamic';
export default async function Page() {
  const user = await requireChatGPTUser('/cofounder');
  const counts = await database()
    .prepare(
      "SELECT json_extract(data_json,'$.status') AS status,COUNT(*) AS total FROM sandbox_orders GROUP BY status",
    )
    .all<{ status: string; total: number }>();
  const agents = await database()
    .prepare(
      "SELECT COUNT(*) AS total FROM manager_records WHERE kind='agent' AND json_extract(data_json,'$.active')=1",
    )
    .first<{ total: number }>();
  return (
    <main id="main" className="staff-page">
      <header>
        <div>
          <Link href="/">Framy Connect</Link>
          <h1>Direcção · {user.displayName}</h1>
          <p>
            Visão geral do negócio. As operações e as finanças são geridas pelo
            Manager.
          </p>
        </div>
        <Link href="/sair">Terminar sessão</Link>
      </header>
      <article>
        <h2>Agentes activos</h2>
        <p>{agents?.total ?? 0}</p>
      </article>
      <h2>Pedidos por etapa</h2>
      {counts.results.length ? (
        counts.results.map((c) => (
          <article key={c.status}>
            <h2>{orderLabels[c.status] ?? c.status}</h2>
            <p>{c.total} pedidos</p>
          </article>
        ))
      ) : (
        <p>Ainda não existem pedidos.</p>
      )}
    </main>
  );
}
