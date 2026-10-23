'use client';
import { refreshDashboard } from '@/lib/dashboard-refresh';
import { useEffect, useState } from 'react';
import { useI18n } from './language-provider';
import { progressLabels } from '@/lib/order-tracking';
type Order = {
  id: string;
  public_reference: string;
  name: string;
  email: string;
  configuration_json: string;
  agent_id: string | null;
  stage: string;
  status: string;
  version: number;
};
export function OrderFulfilment() {
  const { t } = useI18n();
  const [data, setData] = useState<{
      orders: Order[];
      agents: { id: string; name: string }[];
      manager: boolean;
    } | null>(null),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false);
  async function load() {
    const r = await fetch('/api/order-progress', { cache: 'no-store' });
    const d = (await r.json()) as {
      orders: Order[];
      agents: { id: string; name: string }[];
      manager: boolean;
      error?: string;
    };
    if (!r.ok) throw Error(d.error);
    setData(d);
  }
  useEffect(() => {
    queueMicrotask(() => {
      void load().catch(() => setError('Não foi possível carregar.'));
    });
  }, []);
  async function act(order: Order, action: string, agentId?: string) {
    setBusy(true);
    setError('');
    try {
      const r = await fetch('/api/order-progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: order.id,
          version: order.version,
          action,
          agentId,
        }),
      });
      const d = (await r.json()) as { error?: string };
      if (!r.ok) throw Error(d.error);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Não foi possível carregar.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="panel fulfilment-dashboard">
      <div className="tracking-result-title">
        <h2>{t('Progresso das encomendas físicas')}</h2>
        <button
          className="btn"
          disabled={busy}
          onClick={() => {
            setBusy(true);
            void refreshDashboard(load)
              .catch(() => setError('Não foi possível carregar.'))
              .finally(() => setBusy(false));
          }}
        >
          {t('Actualizar')}
        </button>
      </div>
      <p>
        {t(
          'Actualize cada etapa após realizar o trabalho. O cliente acompanha pela referência.',
        )}
      </p>
      {error && <p role="alert">{t(error)}</p>}
      {data?.orders.length === 0 && <p>{t('Não há encomendas atribuídas.')}</p>}
      {data?.orders.map((order) => {
        const c = JSON.parse(order.configuration_json);
        const stage = order.status === 'fulfilled' ? 'delivered' : order.stage;
        const next = (
          {
            confirmed: 'preparing',
            preparing: c.fulfilment?.mode === 'pickup' ? 'ready' : 'dispatched',
            ready: 'delivered',
            dispatched: 'delivered',
          } as Record<string, string>
        )[stage];
        return (
          <article className="fulfilment-card" key={order.public_reference}>
            <h3>
              {order.name} · {t(progressLabels[stage])}
            </h3>
            <p>
              <strong>{t('Referência: ')}</strong>
              {order.public_reference}
            </p>
            <p>
              {order.email} · {c.contact}
            </p>
            <p>{c.address}</p>
            <p>
              {t(
                c.format === 'kit'
                  ? 'Kit'
                  : c.format === 'card'
                    ? 'Cartão NFC'
                    : 'Porta-chaves NFC',
              )}{' '}
              · {c.card} · {c.keychain}
            </p>
            {data.manager && stage !== 'delivered' && (
              <label>
                {t('Agente responsável')}
                <select
                  disabled={busy}
                  value={order.agent_id || ''}
                  onChange={(e) => void act(order, 'assign', e.target.value)}
                >
                  <option value="">{t('Por atribuir')}</option>
                  {data.agents.map((a) => (
                    <option value={a.id} key={a.id}>
                      {a.name}
                    </option>
                  ))}
                </select>
              </label>
            )}
            {next && (
              <button
                className="btn btn-primary"
                disabled={busy}
                onClick={() => {
                  if (
                    next !== 'delivered' ||
                    confirm(
                      t('Confirma que a encomenda foi entregue ao cliente?'),
                    )
                  )
                    void act(order, 'advance');
                }}
              >
                {t(progressLabels[next])}
              </button>
            )}
            <a href={'/acompanhar?referencia=' + order.public_reference}>
              {t('Acompanhar o pedido')}
            </a>
          </article>
        );
      })}
    </section>
  );
}
