import Link from 'next/link';
import { requireChatGPTUser } from '@/app/chatgpt-auth';
import { database } from '@/lib/server-db';
import { type SandboxOrder, orderLabels } from '@/lib/domain';
import { OrderProgressLine } from '@/components/customer-orders';
import { AgentAction } from '@/components/agent-action';
import '../entrar/style.css';
export const dynamic = 'force-dynamic';
export default async function Page() {
  const user = await requireChatGPTUser('/agent');
  const rows = await database()
    .prepare(
      "SELECT data_json FROM sandbox_orders WHERE json_extract(data_json,'$.agentId')=? ORDER BY created_at DESC",
    )
    .bind(user.userId)
    .all<{ data_json: string }>();
  const stock = await database()
    .prepare(
      'SELECT product_id,SUM(quantity) AS quantity FROM stock_movements WHERE agent_id=? GROUP BY product_id',
    )
    .bind(user.userId)
    .all<{ product_id: string; quantity: number }>();
  return (
    <main id="main" className="staff-page">
      <header>
        <div>
          <Link href="/">Framy Connect</Link>
          <h1>Agente · {user.displayName}</h1>
          <p>Produção, entregas e stock atribuído.</p>
        </div>
        <Link href="/sair">Terminar sessão</Link>
      </header>
      <section>
        <h2>O meu stock</h2>
        {stock.results.length ? (
          stock.results.map((s) => (
            <p key={s.product_id}>
              {s.product_id}: {s.quantity} unidades
            </p>
          ))
        ) : (
          <p>Ainda não tem stock atribuído.</p>
        )}
      </section>
      <h2>Os meus pedidos</h2>
      {rows.results.length ? (
        rows.results.map((r) => {
          const o = JSON.parse(r.data_json) as SandboxOrder;
          return (
            <article key={o.id}>
              <h2>
                {o.productName} · #{o.id.slice(0, 8)}
              </h2>
              <p>
                {orderLabels[o.status]} · Entrega:{' '}
                {o.deliveryCity || 'Por indicar'} {o.deliveryAddress}
              </p>
              <OrderProgressLine order={o} />
              <AgentAction id={o.id} version={o.version} status={o.status} />
            </article>
          );
        })
      ) : (
        <p>Os pedidos atribuídos pelo Manager aparecerão aqui.</p>
      )}
    </main>
  );
}
