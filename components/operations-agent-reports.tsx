'use client';
import { useI18n } from '@/components/language-provider';

import { useCallback, useEffect, useState } from 'react';
import { reportTypes, type AgentReport } from '@/lib/agent-workflow';
export function OperationsAgentReports() {
  const { t } = useI18n();
  const [reports, setReports] = useState<AgentReport[]>([]),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    const r = await fetch('/api/agent-reports', { cache: 'no-store' });
    const d = (await r.json()) as { reports: AgentReport[]; error?: string };
    if (!r.ok) throw Error(d.error);
    setReports(d.reports);
    setError('');
  }, []);
  useEffect(() => {
    void Promise.resolve()
      .then(load)
      .catch((e) => setError(e.message));
    const timer = setInterval(
      () => void load().catch((e) => setError(e.message)),
      30000,
    );
    return () => clearInterval(timer);
  }, [load]);
  return (
    <section className="manager-card">
      <h2>{t('Relatórios e alertas dos agentes')}</h2>
      <p>
        {t(
          'Contagens, danos, stock baixo, incidentes e relatórios de actividade. As correcções de stock são registadas por Operações no separador Stock.',
        )}
      </p>
      <button
        type="button"
        className="manager-secondary"
        onClick={() => void load().catch((e) => setError(e.message))}
      >
        {t('Actualizar relatórios')}
      </button>
      {error && <p role="alert">{t(error)}</p>}
      {!reports.length && <p>{t('Ainda não há relatórios dos agentes.')}</p>}
      {reports.map((r) => (
        <details key={r.id}>
          <summary>
            {r.status === 'open' ? t('Por tratar') : t('Resolvido')} ·{' '}
            {t(reportTypes[r.type])} · {r.agentName} ·{' '}
            {new Date(r.createdAt).toLocaleString(t.locale)}
          </summary>
          <p>{r.message}</p>
          <p>
            {r.orderId && t('Pedido #{0}', [r.orderId])}
            {r.productId &&
              `Produto: ${r.productId} · Quantidade: ${r.quantity}`}
          </p>
          {r.summary && (
            <p>
              {t('Pedidos actualizados no período:')}{' '}
              {Object.entries(r.summary)
                .map(([k, v]) => `${k}: ${v}`)
                .join(' · ')}
            </p>
          )}
          {r.response ? (
            <p>
              <strong>{t('Resposta de Operações:')}</strong> {r.response}
            </p>
          ) : (
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const form = e.currentTarget;
                setBusy(true);
                setError('');
                try {
                  const response = await fetch('/api/agent-reports', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      id: r.id,
                      version: r.version,
                      response: new FormData(form).get('response'),
                    }),
                  });
                  const d = (await response.json()) as { error?: string };
                  if (!response.ok) throw Error(d.error);
                  await load();
                } catch (e) {
                  setError(
                    e instanceof Error
                      ? e.message
                      : 'Não foi possível responder.',
                  );
                } finally {
                  setBusy(false);
                }
              }}
            >
              <label>
                {t('Resposta ao agente')}
                <textarea
                  name="response"
                  required
                  minLength={5}
                  maxLength={2000}
                />
              </label>
              <button className="manager-primary" disabled={busy}>
                {t('Responder e resolver')}
              </button>
            </form>
          )}
        </details>
      ))}
    </section>
  );
}
