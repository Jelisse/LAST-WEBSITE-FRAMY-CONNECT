'use client';
import { useI18n, LanguageSelector } from '@/components/language-provider';

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
export function AgentWorkspace({ displayName }: { displayName: string }) {
  const { t } = useI18n();
  const date = (value: string) =>
    new Date(value).toLocaleString(t.locale, { timeZone: 'Africa/Maputo' });
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
    void Promise.resolve()
      .then(load)
      .catch((e) => setError(e.message));
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
      `${o.id} ${o.customerName} ${t(o.productName)} ${o.deliveryCity}`
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
        <LanguageSelector />
        <div>
          <Link href="/">{t('Framy Connect')}</Link>
          <p className="agent-eyebrow">{t('Operações · Agente de execução')}</p>
          <h1>
            {t('Olá, ')}
            {displayName}
          </h1>
          <p>
            {t('Os seus pedidos, produção, entregas e stock num só lugar.')}
          </p>
        </div>
        <Link href="/sair">{t('Terminar sessão')}</Link>
      </header>
      <section className="agent-metrics" aria-label={t('Resumo de trabalho')}>
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
            <span>{t(label)}</span>
            <strong>{total}</strong>
          </article>
        ))}
      </section>
      <div className="agent-toolbar">
        <nav aria-label={t('Área do agente')}>
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
              {t(label)}
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
          {t('Actualizar')}
        </button>
      </div>
      {error && (
        <p role="alert" className="agent-error">
          {t(error)}
        </p>
      )}
      {notice && <output className="agent-notice">{t(notice)}</output>}
      {!data && !error && <output>{t('A carregar as suas operações…')}</output>}
      {tab === 'orders' && (
        <section className="agent-panel">
          <div className="agent-section-heading">
            <div>
              <h2>{t('Os meus pedidos')}</h2>
              <p>
                {t(
                  'Trabalhe apenas nos pedidos pagos e atribuídos por Operações.',
                )}
              </p>
            </div>
            <div className="agent-filters">
              <input
                aria-label={t('Pesquisar pedidos')}
                placeholder={t('Pedido, cliente ou cidade')}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <select
                aria-label={t('Estado dos pedidos')}
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
              >
                <option value="active">{t('Em curso')}</option>
                <option value="all">{t('Todos')}</option>
                {Object.entries(orderLabels).map(([k, v]) => (
                  <option key={k} value={k}>
                    {t(v)}
                  </option>
                ))}
              </select>
            </div>
          </div>
          {data && !filtered.length && (
            <div className="agent-empty">
              <h3>
                {orders.length
                  ? t('Nenhum pedido neste filtro')
                  : t('Pronto para receber pedidos')}
              </h3>
              <p>
                {t(
                  'Quando Operações atribuir um pedido, encontrará aqui o produto, o link aprovado e as próximas acções.',
                )}
              </p>
            </div>
          )}
          {filtered.map((o) => (
            <details className="agent-order" key={o.id}>
              <summary>
                <span>
                  <strong>{t(o.productName)}</strong>
                  <small>
                    #{o.id.slice(0, 8)} · {o.customerName} ·{' '}
                    {o.deliveryCity || t('Local por confirmar')}
                  </small>
                </span>
                <span className="agent-badge">
                  {t(orderLabels[o.status] ?? o.status)}
                </span>
              </summary>
              <div className="agent-order-body">
                <dl className="agent-facts">
                  <div>
                    <dt>{t('Pagamento')}</dt>
                    <dd>
                      {o.paid
                        ? t('Confirmado por Operações')
                        : t('Sem confirmação — não produzir')}
                      {o.paymentReference && ` · Ref. ${o.paymentReference}`}
                    </dd>
                  </div>
                  <div>
                    <dt>{t('Quantidade')}</dt>
                    <dd>{o.quantity}</dd>
                  </div>
                  <div>
                    <dt>{t('Contacto de entrega')}</dt>
                    <dd>{o.deliveryContact || t('Por indicar')}</dd>
                  </div>
                  <div>
                    <dt>{t('Destino')}</dt>
                    <dd>
                      {o.deliveryCity} {o.deliveryAddress}
                    </dd>
                  </div>
                  <div>
                    <dt>{t('Actualizado')}</dt>
                    <dd>{date(o.updatedAt)}</dd>
                  </div>
                </dl>
                {o.approvedUrl && (
                  <div className="agent-approved-link">
                    <strong>{t('Link aprovado para programar')}</strong>
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
                      {t('Copiar link')}
                    </button>
                    <small>
                      {t(
                        'Use exactamente este endereço. Alterações são feitas por Operações.',
                      )}
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
                      <dt>{t(label)}</dt>
                      <dd>{time ? date(time) : t('Pendente')}</dd>
                    </div>
                  ))}
                </dl>
                {o.fulfilment?.courier && (
                  <p>
                    {o.fulfilment.courier}
                    {t(' · Referência: ')}
                    {o.fulfilment.tracking}
                  </p>
                )}
                {o.proof && (
                  <p>
                    {t('Comprovativo: ')}
                    {o.proof}
                  </p>
                )}
                {o.design && (
                  <details>
                    <summary>
                      {t('Ver design aprovado e ficheiros de produção')}
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
                  {t('Reportar problema / feedback')}
                </button>
              </div>
            </details>
          ))}
        </section>
      )}
      {tab === 'stock' && (
        <section className="agent-panel">
          <h2>{t('Stock atribuído')}</h2>
          <p>
            {t(
              'As entradas são registadas por Operações. As entregas confirmadas descontam automaticamente uma unidade. Reporte contagens e danos para reconciliação.',
            )}
          </p>
          {!data?.stock.length && (
            <div className="agent-empty">
              <h3>{t('Ainda sem stock atribuído')}</h3>
              <p>
                {t(
                  'As transferências aprovadas por Operações aparecerão aqui.',
                )}
              </p>
            </div>
          )}
          {!!data?.stock.length && (
            <div className="agent-table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>{t('Produto')}</th>
                    <th>{t('Saldo')}</th>
                    <th>{t('Reservado')}</th>
                    <th>{t('Disponível')}</th>
                  </tr>
                </thead>
                <tbody>
                  {data.stock.map((s) => (
                    <tr key={s.id}>
                      <td>{t(s.name)}</td>
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
            {t('Registar contagem / alertar Operações')}
          </button>
          <h3>{t('Movimentos recentes')}</h3>
          <div className="agent-table-wrap">
            <table>
              <thead>
                <tr>
                  <th>{t('Data')}</th>
                  <th>{t('Produto')}</th>
                  <th>{t('Unidades')}</th>
                  <th>{t('Motivo')}</th>
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
          <h2>{t('Relatórios e alertas')}</h2>
          <p>
            {t(
              'Envie incidentes, feedback e relatórios directamente para Operações. Nunca recolha pagamentos; reporte qualquer tentativa de pagamento directo.',
            )}
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
                {t('Tipo')}
                <select
                  value={reportType}
                  onChange={(e) =>
                    setReportType(e.target.value as keyof typeof reportTypes)
                  }
                >
                  {Object.entries(reportTypes).map(([k, v]) => (
                    <option key={k} value={k}>
                      {t(v)}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                {t('Pedido relacionado (opcional)')}
                <select
                  value={reportOrder}
                  onChange={(e) => setReportOrder(e.target.value)}
                >
                  <option value="">{t('Sem pedido associado')}</option>
                  {orders.map((o) => (
                    <option key={o.id} value={o.id}>
                      #{o.id.slice(0, 8)} · {t(o.productName)}
                    </option>
                  ))}
                </select>
              </label>
              {stockReport && (
                <>
                  <label>
                    {t('Produto')}
                    <select name="productId" required defaultValue="">
                      <option value="" disabled>
                        {t('Seleccione o produto atribuído')}
                      </option>
                      {data?.stock.map((s) => (
                        <option key={s.id} value={s.id}>
                          {t(s.name)}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    {t('Quantidade')}{' '}
                    {reportType === 'stock_count'
                      ? t('contada')
                      : reportType === 'damage'
                        ? t('danificada')
                        : reportType === 'receipt'
                          ? t('recebida')
                          : t('disponível')}
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
                {t('Descrição / notas')}
                <textarea
                  name="message"
                  required
                  minLength={5}
                  maxLength={3000}
                />
              </label>
              {['daily', 'weekly'].includes(reportType) && (
                <small>
                  {t(
                    'Inclui automaticamente a contagem por estado dos pedidos actualizados nas últimas',
                  )}{' '}
                  {reportType === 'daily' ? t('24 horas') : t('7 dias')}.
                </small>
              )}
              <button className="agent-primary">
                {busy ? t('A enviar…') : t('Enviar a Operações')}
              </button>
            </fieldset>
          </form>
          <h3>{t('Histórico e respostas')}</h3>
          {!data?.reports.length && <p>{t('Ainda não enviou relatórios.')}</p>}
          {data?.reports.map((r) => (
            <article className="agent-report" key={r.id}>
              <strong>
                {t(reportTypes[r.type])} ·{' '}
                {r.status === 'open'
                  ? t('A aguardar Operações')
                  : t('Resolvido')}
              </strong>
              <small>
                {date(r.createdAt)}{' '}
                {r.orderId && t('· Pedido #{0}', [r.orderId.slice(0, 8)])}
              </small>
              <p>{r.message}</p>
              {r.productId && (
                <p>
                  {r.productId}
                  {t(' · Quantidade: ')}
                  {r.quantity}
                </p>
              )}
              {r.summary && (
                <p>
                  {Object.entries(r.summary)
                    .map(([k, v]) => `${t(orderLabels[k] ?? k)}: ${v}`)
                    .join(' · ')}
                </p>
              )}
              {r.response && (
                <p>
                  <strong>{t('Operações:')}</strong> {r.response}
                </p>
              )}
            </article>
          ))}
        </section>
      )}
    </main>
  );
}
