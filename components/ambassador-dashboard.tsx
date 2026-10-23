'use client';
import { refreshDashboard } from '@/lib/dashboard-refresh';

import { useCallback, useEffect, useRef, useState } from 'react';

import Link from '@/components/hard-link';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from './ui/dialog';

import { useI18n } from './language-provider';

const money = (n: number, locale: string) =>
  (n / 100).toLocaleString(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }) + ' MT';

type Member = {
  account_id: string;
  code: string;
  name: string;
  commission_bps: number;
  active: number;
  version: number;
};

type Sale = {
  order_id: string;
  ambassador_id: string;
  base_amount: number;
  discount_amount: number;
  commission_amount: number;
  commission_bps: number;
  status: string;
  created_at: string;
};

type Data = {
  manager: boolean;
  members: Member[];
  sales: Sale[];
  balances: {
    account_id: string;
    earned: number;
    paid: number;
    pending: number;
  }[];
  payouts: {
    id: string;
    ambassador_id: string;
    amount: number;
    reference: string;
    paid_at: string;
  }[];
  truncated: boolean;
};

export function AmbassadorCodeInput({
  initialCode = '',
  onChange,
}: {
  initialCode?: string;
  onChange: (code: string, ready: boolean) => void;
}) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false),
    [search, setSearch] = useState(''),
    [loading, setLoading] = useState(false),
    [listError, setListError] = useState('');
  const [choices, setChoices] = useState<{ name: string; code: string }[]>([]);
  const [truncated, setTruncated] = useState(false);
  const [input, setInput] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const revision = useRef(0);

  const apply = useCallback(
    async (value: string) => {
      const current = ++revision.current;
      if (!value.trim()) {
        setInput('');
        onChange('', true);
        setMessage('');
        setBusy(false);
        return;
      }
      setBusy(true);
      onChange('', false);
      try {
        const r = await fetch(
          '/api/ambassadors?code=' + encodeURIComponent(value.trim()),
          { cache: 'no-store' },
        );
        const b = (await r.json()) as { valid: boolean; code: string };
        if (current !== revision.current) return;
        if (!r.ok || !b.valid)
          throw Error('Código de embaixador inválido ou inactivo.');
        setInput(b.code);
        setOpen(false);
        onChange(b.code, true);
        setMessage('Desconto de 10% aplicado apenas aos produtos físicos.');
      } catch (e) {
        if (current === revision.current) {
          const error =
            e instanceof Error
              ? e.message
              : 'Não foi possível verificar o código.';
          setMessage(error);
          setListError(error);
          setInput('');
          onChange('', true);
        }
      } finally {
        if (current === revision.current) setBusy(false);
      }
    },
    [onChange],
  );

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled && initialCode) {
        setInput(initialCode);
        void apply(initialCode);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [initialCode, apply]);

  useEffect(() => {
    if (!open) return;
    let stopped = false;
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      setLoading(true);
      setListError('');
      void fetch(
        '/api/ambassadors?' + new URLSearchParams({ choices: '1', q: search }),
        { cache: 'no-store', signal: controller.signal },
      )
        .then(async (r) => {
          const b = (await r.json()) as {
            error?: string;
            items: { name: string; code: string }[];
            truncated: boolean;
          };
          if (!r.ok) throw Error(b.error);
          if (!stopped) {
            setChoices(b.items);
            setTruncated(b.truncated);
          }
        })
        .catch(() => {
          if (!stopped)
            setListError('Não foi possível carregar os embaixadores.');
        })
        .finally(() => {
          if (!stopped) setLoading(false);
        });
    }, 250);
    return () => {
      stopped = true;
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [open, search]);
  return (
    <div className="ambassador-code">
      <span>{t('Código de embaixador (opcional)')}</span>
      <button
        type="button"
        disabled={busy}
        aria-haspopup="dialog"
        onClick={() => setOpen(true)}
      >
        {busy ? t('A verificar…') : input || t('Escolher embaixador')}
      </button>
      {input && (
        <button type="button" disabled={busy} onClick={() => void apply('')}>
          {t('Remover código')}
        </button>
      )}
      {message && <output aria-live="polite">{t(message)}</output>}
      <Dialog
        open={open}
        onOpenChange={(value) => {
          if (!busy) setOpen(value);
        }}
      >
        <DialogContent className="ambassador-picker">
          <DialogTitle>{t('Escolher embaixador')}</DialogTitle>
          <DialogDescription>
            {t(
              'Seleccione um código para obter 10% de desconto nos produtos físicos. Design e entrega não têm desconto.',
            )}
          </DialogDescription>
          <label>
            {t('Pesquisar embaixador ou código')}
            <input
              value={search}
              maxLength={100}
              onChange={(e) => setSearch(e.target.value)}
              disabled={busy}
            />
          </label>
          {loading && <p>{t('A carregar…')}</p>}
          {listError && <p role="alert">{t(listError)}</p>}
          {!loading && !listError && choices.length === 0 && (
            <p>
              {t('Não existem embaixadores disponíveis para esta pesquisa.')}
            </p>
          )}
          <div className="ambassador-picker-list">
            {choices.map((choice) => (
              <button
                type="button"
                key={choice.code}
                disabled={busy || loading}
                onClick={() => void apply(choice.code)}
              >
                <strong>{choice.name}</strong>
                <span>{choice.code}</span>
              </button>
            ))}
          </div>
          {truncated && (
            <small>
              {t(
                'Pesquise pelo nome ou código para encontrar outros embaixadores.',
              )}
            </small>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export function AmbassadorDashboard() {
  const { t, locale } = useI18n();
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [payoutFor, setPayoutFor] = useState('');
  const [today] = useState(() =>
    new Date(Date.now() + 7200000).toISOString().slice(0, 10),
  );

  const load = useCallback(async () => {
    const r = await fetch('/api/ambassadors', { cache: 'no-store' });
    const b = (await r.json()) as Data & { error?: string };
    if (!r.ok) throw Error(b.error);
    setData(b);
  }, []);

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) void load().catch((e) => setError(e.message));
    });
    return () => {
      cancelled = true;
    };
  }, [load]);

  async function act(body: object) {
    setBusy(true);
    setError('');
    try {
      const r = await fetch('/api/ambassadors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const b = (await r.json()) as { error?: string };
      if (!r.ok) throw Error(b.error);
      await load();
      setPayoutFor('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Não foi possível guardar.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="profile-growth-panel ambassador-panel">
      <header>
        <h2>
          {t(
            data?.manager
              ? 'Gestão de embaixadores'
              : 'O meu painel de embaixador',
          )}
        </h2>
        <p>
          {t(
            'O cliente recebe 10% de desconto nos produtos físicos. A comissão de 10% a 15% usa o preço original dos produtos, sem design, entrega ou subscrições.',
          )}
        </p>
        <button
          type="button"
          disabled={busy}
          onClick={() => {
            setError('');
            void refreshDashboard(load).catch((e) => setError(e.message));
          }}
        >
          {t('Actualizar')}
        </button>
      </header>

      {error && <p role="alert">{t(error)}</p>}
      {!data ? (
        <p>{t('A carregar…')}</p>
      ) : (
        <>
          {data.truncated && (
            <p>
              {t(
                'Mostramos os 500 registos mais recentes. Os saldos incluem todo o histórico.',
              )}
            </p>
          )}

          {!data.manager && !data.members.length && (
            <>
              <p>
                {t(
                  'Registe-se como embaixador para receber o seu código pessoal. Não altera as funções de agente.',
                )}
              </p>
              <button
                className="btn btn-primary"
                disabled={busy}
                onClick={() => void act({ action: 'join' })}
              >
                {t('Tornar-me embaixador')}
              </button>
            </>
          )}

          {data.members.map((m) => {
            const balance = data.balances.find(
              (b) => b.account_id === m.account_id,
            );
            return (
              <article key={m.account_id} className="ambassador-member">
                <h3>{m.name}</h3>
                <p>
                  <strong className="ambassador-personal-code">{m.code}</strong>{' '}
                  · {(m.commission_bps / 100).toFixed(2)}% ·{' '}
                  {t(m.active ? 'Activo' : 'Inactivo')}
                </p>
                <dl className="ambassador-balances">
                  <div>
                    <dt>{t('Comissões confirmadas')}</dt>
                    <dd>{money(balance?.earned ?? 0, locale)}</dd>
                  </div>
                  <div>
                    <dt>{t('Por confirmar')}</dt>
                    <dd>{money(balance?.pending ?? 0, locale)}</dd>
                  </div>
                  <div>
                    <dt>{t('Pagamentos registados')}</dt>
                    <dd>{money(balance?.paid ?? 0, locale)}</dd>
                  </div>
                  <div>
                    <dt>{t('Saldo a receber')}</dt>
                    <dd>
                      {money(
                        (balance?.earned ?? 0) - (balance?.paid ?? 0),
                        locale,
                      )}
                    </dd>
                  </div>
                </dl>

                {data.manager && (
                  <>
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        const values = new FormData(e.currentTarget);
                        void act({
                          action: 'settings',
                          accountId: m.account_id,
                          version: m.version,
                          commissionBps: Math.round(
                            Number(values.get('rate')) * 100,
                          ),
                          active: values.get('active') === 'on',
                        });
                      }}
                    >
                      <label>
                        {t('Comissão (%)')}
                        <input
                          name="rate"
                          type="number"
                          min="10"
                          max="15"
                          step="0.01"
                          required
                          defaultValue={m.commission_bps / 100}
                          key={m.version}
                        />
                      </label>
                      <label>
                        <input
                          type="checkbox"
                          name="active"
                          defaultChecked={!!m.active}
                          key={'active' + m.version}
                        />
                        {t('Código activo')}
                      </label>
                      <button disabled={busy}>{t('Guardar')}</button>
                    </form>
                    <button
                      type="button"
                      onClick={() => setPayoutFor(m.account_id)}
                    >
                      {t('Registar comissão paga')}
                    </button>
                  </>
                )}
              </article>
            );
          })}

          {data.manager && payoutFor && (
            <form
              className="ambassador-payout"
              onSubmit={(e) => {
                e.preventDefault();
                const f = new FormData(e.currentTarget);
                void act({
                  action: 'payout',
                  accountId: payoutFor,
                  amount: Math.round(Number(f.get('amount')) * 100),
                  reference: f.get('reference'),
                  paidAt: f.get('date'),
                  confirmed: f.get('confirmed') === 'on',
                });
              }}
            >
              <h3>{t('Registar pagamento já realizado')}</h3>
              <p>
                {t(
                  'Este registo não transfere dinheiro. Confirme a transferência e guarde a referência.',
                )}
              </p>
              <label>
                {t('Valor (MT)')}
                <input
                  name="amount"
                  type="number"
                  min="0.01"
                  step="0.01"
                  required
                />
              </label>
              <label>
                {t('Referência')}
                <input
                  name="reference"
                  minLength={4}
                  maxLength={120}
                  required
                />
              </label>
              <label>
                {t('Data')}
                <input type="date" name="date" max={today} required />
              </label>
              <label>
                <input type="checkbox" name="confirmed" required />
                {t('Confirmo o pagamento já realizado.')}
              </label>
              <button disabled={busy}>{t('Registar')}</button>
              <button type="button" onClick={() => setPayoutFor('')}>
                {t('Cancelar')}
              </button>
            </form>
          )}

          {!!data.sales.length && (
            <div className="ambassador-table">
              <table>
                <caption>{t('Vendas atribuídas')}</caption>
                <thead>
                  <tr>
                    {[
                      'Data',
                      'Código',
                      'Preço original dos produtos',
                      'Desconto',
                      'Comissão',
                      'Estado',
                    ].map((v) => (
                      <th key={v}>{t(v)}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.sales.map((s) => (
                    <tr key={s.order_id}>
                      <td>
                        {new Date(s.created_at).toLocaleDateString(locale)}
                      </td>
                      <td>
                        {
                          data.members.find(
                            (m) => m.account_id === s.ambassador_id,
                          )?.code
                        }
                      </td>
                      <td>{money(s.base_amount, locale)}</td>
                      <td>{money(s.discount_amount, locale)}</td>
                      <td>
                        {money(s.commission_amount, locale)} (
                        {s.commission_bps / 100}%)
                      </td>
                      <td>
                        {t(
                          (
                            {
                              pending: 'Por confirmar',
                              earned: 'Confirmada',
                              held: 'Em revisão de reembolso',
                              void: 'Anulada',
                            } as Record<string, string>
                          )[s.status],
                        )}
                        {data.manager && s.status === 'held' && (
                          <form
                            onSubmit={(e) => {
                              e.preventDefault();
                              const f = new FormData(e.currentTarget);
                              void act({
                                action: 'resolve-sale',
                                orderId: s.order_id,
                                status: f.get('decision'),
                                reason: f.get('reason'),
                                confirmed: f.get('confirmed') === 'on',
                              });
                            }}
                          >
                            <select name="decision">
                              <option value="void">
                                {t('Anular comissão')}
                              </option>
                              <option value="earned">
                                {t('Confirmar comissão original')}
                              </option>
                            </select>
                            <input
                              name="reason"
                              aria-label={t('Motivo da revisão')}
                              required
                              minLength={8}
                              maxLength={300}
                            />
                            <label>
                              <input
                                type="checkbox"
                                name="confirmed"
                                required
                              />
                              {t('Confirmo a revisão.')}
                            </label>
                            <button disabled={busy}>{t('Guardar')}</button>
                          </form>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {!!data.payouts.length && (
            <div className="ambassador-table">
              <table>
                <caption>{t('Pagamentos registados')}</caption>
                <thead>
                  <tr>
                    <th>{t('Data')}</th>
                    <th>{t('Código')}</th>
                    <th>{t('Valor (MT)')}</th>
                    <th>{t('Referência')}</th>
                  </tr>
                </thead>
                <tbody>
                  {data.payouts.map((p) => (
                    <tr key={p.id}>
                      <td>{p.paid_at}</td>
                      <td>
                        {
                          data.members.find(
                            (m) => m.account_id === p.ambassador_id,
                          )?.code
                        }
                      </td>
                      <td>{money(p.amount, locale)}</td>
                      <td>{p.reference}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </section>
  );
}

export function AmbassadorLanding() {
  const { t } = useI18n();
  return (
    <main className="ambassador-landing">
      <h1>{t('Embaixadores Framy')}</h1>
      <p>
        {t(
          'Partilhe o seu código. Os seus clientes recebem 10% nos produtos físicos e ganha uma comissão de 10% a 15% sobre o preço original, definida pelo gestor.',
        )}
      </p>
      <Link href="/entrar?return_to=%2Fembaixadores">
        {t('Entrar ou criar conta para ser embaixador')}
      </Link>
    </main>
  );
}
