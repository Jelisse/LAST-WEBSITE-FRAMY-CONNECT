'use client';
import { useCallback, useEffect, useState } from 'react';
import Link from '@/components/hard-link';
import { orderLabels } from '@/lib/domain';
import {
  reportTypes,
  type AgentOrder,
  type AgentReport,
} from '@/lib/agent-workflow';
import { AgentAction } from './agent-action';
import { OrderArtwork } from './order-artwork';

type Data = {
  orders: AgentOrder[];
  stock: {
    id: string;
    name: string;
    balance: number;
    reserved: number;
    available: number;
  }[];
  movements: {
    id: string;
    product_id: string;
    quantity: number;
    reason: string;
    created_at: string;
  }[];
  reports: AgentReport[];
};
const date = (value: string) => new Date(value).toLocaleString('pt-PT');
export function AgentWorkspace({ displayName }: { displayName: string }) {
  const [data, setData] = useState<Data | null>(null),
    [error, setError] = useState(''),
    [notice, setNotice] = useState(''),
    [busy, setBusy] = useState(false);
  const [tab, setTab] = useState('orders'),
    [filter, setFilter] = useState('active'),
    [search, setSearch] = useState(''),
    [reportType, setReportType] =
      useState<keyof typeof reportTypes>('incident');
  const [reportOrder, setReportOrder] = useState(''),
    [reportId, setReportId] = useState(() => crypto.randomUUID());
  const load = useCallback(async () => {
    const r = await fetch('/api/agent', { cache: 'no-store' });
    const d = (await r.json()) as Data & { error?: string };
    if (!r.ok) throw Error(d.error);
    setData(d);
  }, []);
  useEffect(() => {
    void load().catch((e) => setError(e.message));
  }, [load]);
  useEffect(() => {
    if (busy) return;
    const timer = setInterval(
      () => void load().catch((e) => setError(e.message)),
      30000,
    );
    return () => clearInterval(timer);
  }, [load, busy]);
  async function save(payload: Record<string, unknown>) {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const r = await fetch('/api/agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const d = (await r.json()) as { error?: string };
      if (!r.ok) throw Error(d.error);
      setNotice('Guardado e disponível para Operações.');
      await load();
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Não foi possível guardar.');
      return false;
    } finally {
      setBusy(false);
    }
  }
  const orders = data?.orders ?? [];
  const filtered = orders.filter(
    (o) =>
      (filter === 'all' ||
        (filter === 'active' &&
          !['DELIVERED', 'CANCELLED'].includes(o.status)) ||
        o.status === filter) &&
      `${o.id} ${o.customerName} ${o.productName} ${o.deliveryCity}`
        .toLowerCase()
        .includes(search.toLowerCase()),
  );
  const stockReport = [
    'low_stock',
    'damage',
    'stock_count',
    'receipt',
  ].includes(reportType);
  function report(orderId = '') {
    setReportOrder(orderId);
    setReportType('incident');
    setTab('reports');
  }
  return (
    <main id="main" className="agent-workspace">
      <header className="agent-header">
        <div>
          <Link href="/">Framy Connect</Link>
          <p className="agent-eyebrow">Operações · Agente de execução</p>
          <h1>Olá, {displayName}</h1>
          <p>Os seus pedidos, produção, entregas e stock num só lugar.</p>
        </div>
        <Link href="/sair">Terminar sessão</Link>
      </header>
      <section className="agent-metrics" aria-label="Resumo de trabalho">
        {[
          ['Por produzir', orders.filter((o) => o.status === 'QUEUED').length],
          [
            'Em produção',
            orders.filter((o) => o.status === 'IN_PRODUCTION').length,
          ],
          ['Para entregar', orders.filter((o) => o.status === 'READY').length],
          ['Entregues', orders.filter((o) => o.status === 'DELIVERED').length],
        ].map(([label, total]) => (
          <article key={label}>
            <span>{label}</span>
            <strong>{total}</strong>
          </article>
        ))}
      </section>
      <div className="agent-toolbar">
        <nav aria-label="Área do agente">
          {[
            ['orders', 'Pedidos'],
            ['stock', 'O meu stock'],
            ['reports', 'Relatórios e alertas'],
          ].map(([id, label]) => (
            <button
              type="button"
              key={id}
              aria-pressed={tab === id}
              onClick={() => setTab(id)}
            >
              {label}
              {id === 'reports' &&
              data?.reports.some((r) => r.status === 'open')
                ? ' •'
                : ''}
            </button>
          ))}
        </nav>
        <button
          type="button"
          disabled={busy}
          onClick={() => void load().catch((e) => setError(e.message))}
        >
          Actualizar
        </button>
      </div>
      {error && (
        <p role="alert" className="agent-error">
          {error}
        </p>
      )}
      {notice && (
        <p role="status" className="agent-notice">
          {notice}
        </p>
      )}
      {!data && !error && <p role="status">A carregar as suas operações…</p>}
      {tab === 'orders' && (
        <section className="agent-panel">
          <div className="agent-section-heading">
            <div>
              <h2>Os meus pedidos</h2>
              <p>
                Trabalhe apenas nos pedidos pagos e atribuídos por Operações.
              </p>
            </div>
            <div className="agent-filters">
              <input
                aria-label="Pesquisar pedidos"
                placeholder="Pedido, cliente ou cidade"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <select
                aria-label="Estado dos pedidos"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
              >
                <option value="active">Em curso</option>
                <option value="all">Todos</option>
                {Object.entries(orderLabels).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </div>
          </div>
          {data && !filtered.length && (
            <div className="agent-empty">
              <h3>
                {orders.length
                  ? 'Nenhum pedido neste filtro'
                  : 'Pronto para receber pedidos'}
              </h3>
              <p>
                Quando Operações atribuir um pedido, encontrará aqui o produto,
                o link aprovado e as próximas acções.
              </p>
            </div>
          )}
          {filtered.map((o) => (
            <details className="agent-order" key={o.id}>
              <summary>
                <span>
                  <strong>{o.productName}</strong>
                  <small>
                    #{o.id.slice(0, 8)} · {o.customerName} ·{' '}
                    {o.deliveryCity || 'Local por confirmar'}
                  </small>
                </span>
                <span className="agent-badge">
                  {orderLabels[o.status] ?? o.status}
                </span>
              </summary>
              <div className="agent-order-body">
                <dl className="agent-facts">
                  <div>
                    <dt>Pagamento</dt>
                    <dd>
                      {o.paid
                        ? 'Confirmado por Operações'
                        : 'Sem confirmação — não produzir'}
                      {o.paymentReference && ` · Ref. ${o.paymentReference}`}
                    </dd>
                  </div>
                  <div>
                    <dt>Quantidade</dt>
                    <dd>{o.quantity}</dd>
                  </div>
                  <div>
                    <dt>Contacto de entrega</dt>
                    <dd>{o.deliveryContact || 'Por indicar'}</dd>
                  </div>
                  <div>
                    <dt>Destino</dt>
                    <dd>
                      {o.deliveryCity} {o.deliveryAddress}
                    </dd>
                  </div>
                  <div>
                    <dt>Actualizado</dt>
                    <dd>{date(o.updatedAt)}</dd>
                  </div>
                </dl>
                {o.approvedUrl && (
                  <div className="agent-approved-link">
                    <strong>Link aprovado para programar</strong>
                    <a href={o.approvedUrl} target="_blank" rel="noreferrer">
                      {o.approvedUrl}
                    </a>
                    <button
                      type="button"
                      onClick={() =>
                        void navigator.clipboard
                          .writeText(o.approvedUrl)
                          .then(() => setNotice('Link aprovado copiado.'))
                          .catch(() =>
                            setError(
                              'Não foi possível copiar. Seleccione e copie o link apresentado.',
                            ),
                          )
                      }
                    >
                      Copiar link
                    </button>
                    <small>
                      Use exactamente este endereço. Alterações são feitas por
                      Operações.
                    </small>
                  </div>
                )}
                <dl className="agent-facts">
                  {[
                    ['Programação e teste', o.fulfilment?.programmedAt],
                    ['Controlo de qualidade', o.fulfilment?.checkedAt],
                    ['Embalagem', o.fulfilment?.packagedAt],
                    ['Expedição', o.fulfilment?.dispatchedAt],
                    ['Entrega', o.fulfilment?.deliveredAt],
                  ].map(([label, time]) => (
                    <div key={label}>
                      <dt>{label}</dt>
                      <dd>{time ? date(time) : 'Pendente'}</dd>
                    </div>
                  ))}
                </dl>
                {o.fulfilment?.courier && (
                  <p>
                    {o.fulfilment.courier} · Referência: {o.fulfilment.tracking}
                  </p>
                )}
                {o.proof && <p>Comprovativo: {o.proof}</p>}
                {o.design && (
                  <details>
                    <summary>
                      Ver design aprovado e ficheiros de produção
                    </summary>
                    <OrderArtwork order={o} />
                  </details>
                )}
                <AgentAction
                  key={`${o.id}-${o.version}`}
                  order={o}
                  onSave={save}
                  busy={busy}
                />
                <button
                  type="button"
                  className="agent-secondary"
                  onClick={() => report(o.id)}
                >
                  Reportar problema / feedback
                </button>
              </div>
            </details>
          ))}
        </section>
      )}
      {tab === 'stock' && (
        <section className="agent-panel">
          <h2>Stock atribuído</h2>
          <p>
            As entradas são registadas por Operações. As entregas confirmadas
            descontam automaticamente uma unidade. Reporte contagens e danos
            para reconciliação.
          </p>
          {!data?.stock.length && (
            <div className="agent-empty">
              <h3>Ainda sem stock atribuído</h3>
              <p>As transferências aprovadas por Operações aparecerão aqui.</p>
            </div>
          )}
          {!!data?.stock.length && (
            <div className="agent-table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Produto</th>
                    <th>Saldo</th>
                    <th>Reservado</th>
                    <th>Disponível</th>
                  </tr>
                </thead>
                <tbody>
                  {data.stock.map((s) => (
                    <tr key={s.id}>
                      <td>{s.name}</td>
                      <td>{s.balance}</td>
                      <td>{s.reserved}</td>
                      <td>{s.available}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <button
            type="button"
            className="agent-primary"
            onClick={() => {
              setReportType('stock_count');
              setReportOrder('');
              setTab('reports');
            }}
          >
            Registar contagem / alertar Operações
          </button>
          <h3>Movimentos recentes</h3>
          <div className="agent-table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Produto</th>
                  <th>Unidades</th>
                  <th>Motivo</th>
                </tr>
              </thead>
              <tbody>
                {data?.movements.map((m) => (
                  <tr key={m.id}>
                    <td>{date(m.created_at)}</td>
                    <td>
                      {data.stock.find((s) => s.id === m.product_id)?.name ??
                        m.product_id}
                    </td>
                    <td>
                      {m.quantity > 0 ? '+' : ''}
                      {m.quantity}
                    </td>
                    <td>{m.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
      {tab === 'reports' && (
        <section className="agent-panel">
          <h2>Relatórios e alertas</h2>
          <p>
            Envie incidentes, feedback e relatórios directamente para Operações.
            Nunca recolha pagamentos; reporte qualquer tentativa de pagamento
            directo.
          </p>
          <form
            className="agent-report-form"
            onSubmit={async (e) => {
              e.preventDefault();
              const form = e.currentTarget;
              const values = Object.fromEntries(new FormData(form));
              const ok = await save({
                action: 'report',
                id: reportId,
                ...values,
                type: reportType,
                orderId: reportOrder,
                quantity: stockReport ? Number(values.quantity) : undefined,
              });
              if (ok) {
                form.reset();
                setReportOrder('');
                setReportId(crypto.randomUUID());
              }
            }}
          >
            <fieldset disabled={busy}>
              <label>
                Tipo
                <select
                  value={reportType}
                  onChange={(e) =>
                    setReportType(e.target.value as keyof typeof reportTypes)
                  }
                >
                  {Object.entries(reportTypes).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Pedido relacionado (opcional)
                <select
                  value={reportOrder}
                  onChange={(e) => setReportOrder(e.target.value)}
                >
                  <option value="">Sem pedido associado</option>
                  {orders.map((o) => (
                    <option key={o.id} value={o.id}>
                      #{o.id.slice(0, 8)} · {o.productName}
                    </option>
                  ))}
                </select>
              </label>
              {stockReport && (
                <>
                  <label>
                    Produto
                    <select name="productId" required defaultValue="">
                      <option value="" disabled>
                        Seleccione o produto atribuído
                      </option>
                      {data?.stock.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Quantidade{' '}
                    {reportType === 'stock_count'
                      ? 'contada'
                      : reportType === 'damage'
                        ? 'danificada'
                        : reportType === 'receipt'
                          ? 'recebida'
                          : 'disponível'}
                    <input
                      type="number"
                      name="quantity"
                      required
                      min={0}
                      max={100000}
                      step={1}
                    />
                  </label>
                </>
              )}
              <label>
                Descrição / notas
                <textarea
                  name="message"
                  required
                  minLength={5}
                  maxLength={3000}
                />
              </label>
              {['daily', 'weekly'].includes(reportType) && (
                <small>
                  Inclui automaticamente a contagem por estado dos pedidos
                  actualizados nas últimas{' '}
                  {reportType === 'daily' ? '24 horas' : '7 dias'}.
                </small>
              )}
              <button className="agent-primary">
                {busy ? 'A enviar…' : 'Enviar a Operações'}
              </button>
            </fieldset>
          </form>
          <h3>Histórico e respostas</h3>
          {!data?.reports.length && <p>Ainda não enviou relatórios.</p>}
          {data?.reports.map((r) => (
            <article className="agent-report" key={r.id}>
              <strong>
                {reportTypes[r.type]} ·{' '}
                {r.status === 'open' ? 'A aguardar Operações' : 'Resolvido'}
              </strong>
              <small>
                {date(r.createdAt)}{' '}
                {r.orderId && `· Pedido #${r.orderId.slice(0, 8)}`}
              </small>
              <p>{r.message}</p>
              {r.productId && (
                <p>
                  {r.productId} · Quantidade: {r.quantity}
                </p>
              )}
              {r.summary && (
                <p>
                  {Object.entries(r.summary)
                    .map(([k, v]) => `${orderLabels[k] ?? k}: ${v}`)
                    .join(' · ')}
                </p>
              )}
              {r.response && (
                <p>
                  <strong>Operações:</strong> {r.response}
                </p>
              )}
            </article>
          ))}
        </section>
      )}
    </main>
  );
}
