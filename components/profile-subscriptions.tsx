'use client';
import { useCallback, useEffect, useState } from 'react';
import { PaySuitePlanCheckout } from './paysuite-plan-checkout';
import { CreditCard, Mail, RefreshCw, ReceiptText } from 'lucide-react';
type Invoice = {
  id: string;
  plan_id: string;
  amount: number;
  instructions: string;
  status: string;
  expires_at: string;
  period_start?: string;
  period_end?: string;
  email?: string;
  name?: string;
};
type Data = {
  gatewayAvailable?: boolean;
  emailConfigured: boolean;
  settings: { enabled: number; instructions: string; version: number };
  invoices: Invoice[];
  state: string;
  expiresAt: string | null;
  membership: { next_plan_id?: string; next_starts_at?: string } | null;
  plans: { id: string; name: string; meticais: number; annualMeticais?: number; version: number }[];
  notices: {
    id: string;
    subject: string;
    message: string;
    read_at: number | null;
  }[];
};
const money = (amount: number) =>
  (amount / 100).toLocaleString('pt-MZ', { minimumFractionDigits: 2 }) + ' MT';
const date = (s: string) =>
  new Date(s).toLocaleDateString('pt-MZ', { timeZone: 'Africa/Maputo' });
export function ProfileSubscriptions({
  manager = false,
}: {
  manager?: boolean;
}) {
  const [data, setData] = useState<Data | null>(null),
    [error, setError] = useState(''),
    [notice, setNotice] = useState(''),
    [busy, setBusy] = useState(false),
    [observedAt, setObservedAt] = useState(0),
    [selected, setSelected] = useState<Invoice | null>(null);
  const load = useCallback(async (signal?: AbortSignal) => {
    const r = await fetch('/api/profile-subscriptions', {
      cache: 'no-store',
      signal: signal
        ? AbortSignal.any([signal, AbortSignal.timeout(15000)])
        : AbortSignal.timeout(15000),
    });
    const d = (await r.json()) as Data & { error?: string };
    if (!r.ok) throw Error(d.error);
    setData(d);
    setObservedAt(Date.now());
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    void Promise.resolve()
      .then(() => load(controller.signal))
      .catch((e) => {
        if (!controller.signal.aborted) setError(e.message);
      });
    return () => controller.abort();
  }, [load]);
  async function act(body: object) {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const r = await fetch('/api/profile-subscriptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(15000),
      });
      const d = (await r.json()) as { error?: string };
      if (!r.ok) throw Error(d.error);
      await load();
      setSelected(null);
      setNotice('Actualizado.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Tente novamente.');
    } finally {
      setBusy(false);
    }
  }
  async function refresh() {
    setBusy(true);
    setError('');
    try {
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Não foi possível actualizar.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className={`profile-growth-panel${manager ? ' subscription-manager' : ''}`} aria-busy={busy}>
      <header className={manager ? 'subscription-heading' : undefined}>
      <div>
      <h2>
        {manager ? 'Gestão das subscrições' : 'O seu plano digital'}
      </h2>
      <p>
        {manager ? 'Controle as adesões, as instruções e os pedidos de pagamento dos planos digitais.' : 'Pagamento de um mês de cada vez. Sem débito nem renovação automática. O produto físico é pago separadamente.'}
      </p>
      </div>
      {manager && <button type="button" disabled={busy} onClick={() => void refresh()}><RefreshCw size={16} aria-hidden="true" />{busy ? 'A actualizar…' : 'Actualizar'}</button>}
      </header>
      {error && <p role="alert">{error}</p>}
      {notice && <output>{notice}</output>}
      {!data ? (
        <p>A carregar…</p>
      ) : (
        <>
          {manager && <div className="subscription-status-grid">
            <article><CreditCard size={20} aria-hidden="true" /><div><span>Adesões pagas</span><strong>{data.settings.enabled ? 'Abertas' : 'Fechadas'}</strong><p>{data.gatewayAvailable ? 'PaySuite configurado' : 'PaySuite indisponível'}</p></div></article>
            <article><Mail size={20} aria-hidden="true" /><div><span>Comunicação</span><strong>{data.emailConfigured ? 'Email configurado' : 'Email por configurar'}</strong><p>Avisos disponíveis na conta</p></div></article>
          </div>}
          {manager ? (
            <form
              className="subscription-settings"
              key={data.settings.version}
              onSubmit={(ev) => {
                ev.preventDefault();
                const f = new FormData(ev.currentTarget);
                void act({
                  action: 'settings',
                  version: data.settings.version,
                  enabled: f.get('enabled') === 'on',
                  instructions: f.get('instructions'),
                });
              }}
            >
              <h3>Definições de pagamento</h3>
              <p className="subscription-help">Cada renovação exige autorização do cliente. Não existe débito automático; o produto físico é pago separadamente.</p>
              <label>
                Instruções para o cliente
                <textarea
                  name="instructions"
                  defaultValue={data.settings.instructions}
                  maxLength={1500}
                  rows={4}
                  placeholder="Explique ao cliente como efectuar e renovar o pagamento."
                />
              </label>
              <label className="growth-check subscription-availability">
                <input
                  name="enabled"
                  type="checkbox"
                  defaultChecked={!!data.settings.enabled}
                />
                <span><strong>Permitir adesões pagas</strong><small>Disponibiliza a adesão aos planos digitais.</small></span>
              </label>
              <p className="subscription-help">
                Ao abrir, as experiências já expiradas recebem pelo menos 7 dias
                de aviso, seguidos de 7 dias de tolerância. Verifique os dados
                de pagamento antes de activar.
              </p>
              <button disabled={busy}>{busy ? 'A guardar…' : 'Guardar alterações'}</button>
            </form>
          ) : (
            <>
              <p>
                <strong>
                  {
                    (
                      {
                        inactive: 'Active o perfil para começar',
                        trial: 'Experiência gratuita',
                        launch: 'Acesso prolongado durante o lançamento',
                        paid: 'Plano pago activo',
                        grace: 'Período de tolerância de 7 dias',
                        basic: 'Página de contacto básica',
                      } as Record<string, string>
                    )[data.state]
                  }
                </strong>
                {data.expiresAt &&
                  data.state !== 'launch' &&
                  ` · até ${date(data.expiresAt)}`}
              </p>
              {data.membership?.next_starts_at &&
                Date.parse(data.membership.next_starts_at) > observedAt && (
                  <p>
                    Alteração paga agendada para{' '}
                    {date(data.membership.next_starts_at)}. Até lá mantém o
                    plano actual.
                  </p>
                )}
              {data.notices
                .filter((n) => !n.read_at)
                .map((n) => (
                  <article className="growth-notice" key={n.id}>
                    <h3>{n.subject}</h3>
                    <p>{n.message}</p>
                    <button
                      disabled={busy}
                      onClick={() =>
                        void act({ action: 'read-notice', id: n.id })
                      }
                    >
                      Marcar como lido
                    </button>
                  </article>
                ))}
              {!data.settings.enabled ? (
                <p>
                  Adesões mensais ainda indisponíveis. O acesso de lançamento
                  continua sem cobrança.
                </p>
              ) : (
                <>
                  <div className="growth-plan-grid">
                    {data.plans.map((p) => data.gatewayAvailable ? <PaySuitePlanCheckout key={p.id} plan={p} trial={data.state==='trial'}/> : (
                      <form
                        key={p.id}
                        onSubmit={(ev) => {
                          ev.preventDefault();
                          void act({
                            action: 'request',
                            planId: p.id,
                            planVersion: p.version,
                            accepted: true,
                          });
                        }}
                      >
                        <h3>{p.name}</h3>
                        <strong>
                          {money(Math.round(p.meticais * 100))} / mês
                        </strong>
                        <p>
                          {p.id === 'personal'
                            ? '8 links · 200 caracteres · cores e contactos'
                            : '20 links · 600 caracteres · estatísticas, vitrine, mensagens, idiomas, equipa e domínio'}
                        </p>
                        <label className="growth-check">
                          <input type="checkbox" required />
                          Confirmo um mês, sem renovação automática.
                        </label>
                        <button
                          disabled={
                            busy ||
                            data.invoices.some(
                              (i) =>
                                i.status === 'pending' &&
                                Date.parse(i.expires_at) > observedAt,
                            )
                          }
                        >
                          Pedir pagamento deste plano
                        </button>
                      </form>
                    ))}
                  </div>
                  <p>
                    Uma alteração de plano começa no fim do período já pago. Os
                    dados que excedam o novo plano ficam guardados.
                  </p>
                </>
              )}
            </>
          )}
          <div className={manager ? 'subscription-history' : undefined}>
          <h3>
            {manager ? 'Pedidos e pagamentos' : 'Os seus pedidos de pagamento'}
          </h3>
          {!data.invoices.length && (manager ? <div className="subscription-empty"><ReceiptText size={28} aria-hidden="true" /><strong>Ainda não existem pedidos de pagamento</strong><p>Os pedidos dos planos digitais aparecerão aqui quando forem criados pelos clientes.</p></div> : <p>Ainda não existem pedidos.</p>)}
          {data.invoices.map((i) => (
            <article className="growth-invoice" key={i.id}>
              <strong>
                {i.name ??
                  (i.plan_id === 'personal' ? 'Pessoal' : 'Profissional')}{' '}
                · {money(i.amount)}
              </strong>
              {i.email && <p>{i.email}</p>}
              <p>
                Referência: <code>{i.id}</code>
              </p>
              <p>
                {
                  (
                    {
                      pending:
                        Date.parse(i.expires_at) <= observedAt
                          ? 'Expirado'
                          : 'A aguardar verificação',
                      confirmed: 'Pagamento confirmado',
                      cancelled: 'Cancelado',
                    } as Record<string, string>
                  )[i.status]
                }
              </p>
              {i.period_start && i.period_end && (
                <p>
                  Período: {date(i.period_start)} — {date(i.period_end)}
                </p>
              )}
              {i.status === 'pending' &&
                Date.parse(i.expires_at) > observedAt &&
                (i.instructions === 'PaySuite' ? <a href={manager ? '/manager/pagamentos' : '/checkout/retorno?payment='+encodeURIComponent(i.id)}>Consultar pagamento PaySuite</a> : manager ? (
                  <button disabled={busy} onClick={() => setSelected(i)}>
                    Verificar pagamento
                  </button>
                ) : (
                  <>
                    <p className="growth-preserve">{i.instructions}</p>
                    <p>
                      Indique a referência acima ao pagar. A equipa activa o
                      período após verificar o valor e a transacção. Pedido
                      válido até {date(i.expires_at)}.
                    </p>
                    <button
                      disabled={busy}
                      onClick={() => void act({ action: 'cancel', id: i.id })}
                    >
                      Cancelar pedido não pago
                    </button>
                  </>
                ))}
            </article>
          ))}
          {selected && (
            <form
              className="growth-notice"
              onSubmit={(ev) => {
                ev.preventDefault();
                const f = new FormData(ev.currentTarget);
                void act({
                  action: 'confirm',
                  id: selected.id,
                  paymentReference: f.get('reference'),
                  verifiedAmount: Math.round(Number(f.get('amount')) * 100),
                  currency: 'MZN',
                  verifiedInProvider: f.get('verified') === 'on',
                });
              }}
            >
              <h3>Verificar {money(selected.amount)}</h3>
              <label>
                Referência única no prestador
                <input
                  name="reference"
                  required
                  minLength={6}
                  maxLength={120}
                />
              </label>
              <label>
                Valor recebido em MT
                <input
                  name="amount"
                  required
                  type="number"
                  min="0.01"
                  step="0.01"
                />
              </label>
              <label className="growth-check">
                <input name="verified" type="checkbox" required />
                Verifiquei a transacção liquidada no prestador, destinatário,
                moeda MZN e valor exacto.
              </label>
              <button disabled={busy}>Registar pagamento confirmado</button>
              <button
                type="button"
                disabled={busy}
                onClick={() => setSelected(null)}
              >
                Voltar
              </button>
            </form>
          )}
          </div>
        </>
      )}
    </section>
  );
}
