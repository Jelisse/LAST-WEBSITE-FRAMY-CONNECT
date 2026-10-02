'use client';
import { useI18n } from '@/components/language-provider';
import { useCallback, useEffect, useState } from 'react';
import { Search } from 'lucide-react';
import type { ManagedPlan } from '@/lib/domain';
import {
  featureCatalog,
  planFeatures,
  type FeatureKey,
} from '@/lib/plan-features';
import {
  planAnnualMeticais,
  planMeticais,
  planPrice,
} from '@/lib/plan-pricing';
import {
  reminderVariables,
  renderReminder,
  type ReminderSettings,
} from '@/lib/subscription-settings';
import { ProfileSubscriptions } from './profile-subscriptions';
import { RenewalWhatsApp, type RenewalContact } from './renewal-whatsapp';
type Member = RenewalContact & {
  owner_id: string;
  name: string;
  email: string;
  plan_id: string;
  state: string;
  terms_json: string;
  paid_expires_at: string;
  trial_expires_at: string;
  next_plan_id?: string;
  next_starts_at?: string;
};
type Data = {
  plans: ManagedPlan[];
  reminders: ReminderSettings;
  reminderVersion: number;
  members: Member[];
  truncated: boolean;
  deliveries: {
    id: string;
    subject: string;
    email: string;
    sent_at: number | null;
    attempted_at: number | null;
  }[];
  audit: {
    action: string;
    subject: string;
    created_at: string;
    actor: string;
  }[];
};
const states: Record<string, string> = {
  inactive: 'Inactivo',
  trial: 'Experiência',
  launch: 'Lançamento',
  paid: 'Pago e activo',
  grace: 'Em tolerância',
  basic: 'Contacto básico',
};
const when = (s?: string) =>
  s
    ? new Date(s).toLocaleDateString('pt-MZ', { timeZone: 'Africa/Maputo' })
    : '—';
export function SubscriptionManager() {
  const { t } = useI18n();
  const [data, setData] = useState<Data | null>(null),
    [tab, setTab] = useState('plans'),
    [error, setError] = useState(''),
    [notice, setNotice] = useState(''),
    [busy, setBusy] = useState(false),
    [editing, setEditing] = useState<ManagedPlan | null>(null),
    [search, setSearch] = useState(''),
    [state, setState] = useState('all'),
    [cycle, setCycle] = useState('all'),
    [reminders, setReminders] = useState<ReminderSettings | null>(null);
  const load = useCallback(async (signal?: AbortSignal) => {
    const r = await fetch('/api/manager-subscriptions', {
      cache: 'no-store',
      signal: signal
        ? AbortSignal.any([signal, AbortSignal.timeout(15000)])
        : AbortSignal.timeout(15000),
    });
    const d = (await r.json()) as Data & { error?: string };
    if (!r.ok) throw Error(d.error ?? 'Não foi possível concluir.');
    setData(d);
    setReminders(d.reminders);
  }, []);
  useEffect(() => {
    const c = new AbortController();
    // State changes occur after the fetch resolves, not synchronously.
    // oxlint-disable-next-line react/react-compiler
    void load(c.signal).catch((e) => {
      if (!c.signal.aborted) setError(e.message);
    });
    return () => c.abort();
  }, [load]);
  async function save(url: string, body: object) {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const r = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(15000),
      });
      const d = (await r.json()) as Data & { error?: string };
      if (!r.ok) throw Error(d.error ?? 'Não foi possível concluir.');
      await load();
      setEditing(null);
      setNotice(
        'Alterações guardadas. Os períodos já pagos mantêm as condições contratadas.',
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Não foi possível guardar.');
    } finally {
      setBusy(false);
    }
  }
  const filtered =
    data?.members.filter((m) => {
      let terms;
      try {
        terms = JSON.parse(m.terms_json);
      } catch {
        terms = {};
      }
      return (
        (state === 'all' || m.state === state) &&
        (cycle === 'all' ||
          terms.billingCycle === cycle ||
          (cycle === 'monthly' &&
            m.plan_id !== 'free-30' &&
            !terms.billingCycle)) &&
        `${m.name} ${m.email} ${m.plan_id}`
          .toLowerCase()
          .includes(search.toLowerCase())
      );
    }) ?? [];
  return (
    <section className="subscription-manager management-suite" aria-busy={busy}>
      <div className="suite-toolbar">
        <p>
          {t('Configure os planos e acompanhe o ciclo de cada subscrição.')}
        </p>
        <button
          type="button"
          disabled={busy}
          onClick={() => {
            setBusy(true);
            void load()
              .catch((e) => setError(e.message))
              .finally(() => setBusy(false));
          }}
        >
          {t(' Actualizar dados ')}
        </button>
      </div>
      <nav className="suite-tabs" aria-label={t('Gestão de subscrições')}>
        {[
          ['plans', 'Planos e funcionalidades'],
          ['members', 'Clientes e validade'],
          ['payments', 'Pagamentos'],
          ['messages', 'Mensagens de renovação'],
          ['audit', 'Histórico'],
        ].map(([id, label]) => (
          <button key={id} aria-pressed={tab === id} onClick={() => setTab(id)}>
            {t(label)}
          </button>
        ))}
      </nav>
      {error && (
        <p role="alert" className="manager-error">
          {t(error)}
        </p>
      )}
      {notice && <output className="manager-notice">{t(notice)}</output>}
      {!data ? (
        <p>{t('A carregar subscrições…')}</p>
      ) : (
        <>
          <div className="suite-stats">
            {[
              [
                'Planos publicados',
                data.plans.filter((p) => p.active && p.id !== 'free-30').length,
              ],
              [
                'Períodos pagos activos',
                data.members.filter((m) => m.state === 'paid').length,
              ],
              [
                'Em tolerância',
                data.members.filter((m) => m.state === 'grace').length,
              ],
              [
                'Experiências',
                data.members.filter((m) => m.state === 'trial').length,
              ],
            ].map(([label, value]) => (
              <article key={label}>
                <span>{t(label)}</span>
                <strong>{value}</strong>
              </article>
            ))}
          </div>
          {data.truncated && (
            <p>
              {t(
                ' Indicadores referentes aos primeiros 500 clientes por validade. Refine a consulta através de uma exportação financeira. ',
              )}
            </p>
          )}
          {tab === 'plans' && (
            <>
              <div className="suite-toolbar">
                <p>
                  {t(
                    ' Preços e funcionalidades aplicam-se a novas compras e renovações. Arquivar impede novas adesões. ',
                  )}
                </p>
                <button
                  className="manager-primary"
                  onClick={() =>
                    setEditing({
                      id: 'plan-' + crypto.randomUUID(),
                      name: '',
                      audience: '',
                      description: '',
                      meticais: 100,
                      annualMeticais: 1000,
                      links: 8,
                      bio: 200,
                      active: false,
                      version: 0,
                      features: planFeatures({ id: 'personal' }),
                      monthlyEnabled: true,
                      annualEnabled: true,
                      benefits: [],
                      sortOrder: 0,
                    })
                  }
                >
                  {t(' Criar plano ')}
                </button>
              </div>
              {editing ? (
                <form
                  className="manager-card suite-form"
                  onSubmit={(e) => {
                    e.preventDefault();
                    void save('/api/manager', {
                      action: 'plan',
                      ...editing,
                      features: planFeatures(editing),
                      monthlyEnabled: editing.monthlyEnabled ?? true,
                      annualEnabled: editing.annualEnabled ?? true,
                      benefits: (editing.benefits ?? [])
                        .map((v) => v.trim())
                        .filter(Boolean),
                      sortOrder: editing.sortOrder ?? 0,
                    });
                  }}
                >
                  <h2>
                    {t(editing.version ? 'Editar plano' : 'Configurar plano')}
                  </h2>
                  <div className="suite-grid">
                    {(['name', 'audience'] as const).map((key, i) => (
                      <label key={key}>
                        {['Nome do plano', 'Público'][i]}
                        <input
                          required
                          maxLength={90}
                          value={editing[key]}
                          onChange={(e) =>
                            setEditing({ ...editing, [key]: e.target.value })
                          }
                        />
                      </label>
                    ))}
                    <label>
                      {t(' Mensal (MT) ')}
                      <input
                        required
                        type="number"
                        min={editing.id === 'free-30' ? 0 : 1}
                        max={10000}
                        step="0.01"
                        value={planMeticais(editing)}
                        onChange={(e) =>
                          setEditing({
                            ...editing,
                            meticais: Number(e.target.value),
                          })
                        }
                      />
                    </label>
                    <label>
                      {t(' Anual (MT) ')}
                      <input
                        required
                        type="number"
                        min={editing.id === 'free-30' ? 0 : 1}
                        max={120000}
                        step="0.01"
                        value={planAnnualMeticais(editing)}
                        onChange={(e) =>
                          setEditing({
                            ...editing,
                            annualMeticais: Number(e.target.value),
                          })
                        }
                      />
                    </label>
                    <label>
                      {t(' Máximo de links ')}
                      <input
                        required
                        type="number"
                        min={1}
                        max={50}
                        value={editing.links}
                        onChange={(e) =>
                          setEditing({
                            ...editing,
                            links: Number(e.target.value),
                          })
                        }
                      />
                    </label>
                    <label>
                      {t(' Caracteres da biografia ')}
                      <input
                        required
                        type="number"
                        min={0}
                        max={1200}
                        value={editing.bio}
                        onChange={(e) =>
                          setEditing({
                            ...editing,
                            bio: Number(e.target.value),
                          })
                        }
                      />
                    </label>
                    <label>
                      {t(' Ordem no catálogo ')}
                      <input
                        required
                        type="number"
                        min={0}
                        max={999}
                        value={editing.sortOrder ?? 0}
                        onChange={(e) =>
                          setEditing({
                            ...editing,
                            sortOrder: Number(e.target.value),
                          })
                        }
                      />
                    </label>
                  </div>
                  <label>
                    {t(' Descrição ')}
                    <textarea
                      required
                      maxLength={2000}
                      value={editing.description}
                      onChange={(e) =>
                        setEditing({ ...editing, description: e.target.value })
                      }
                    />
                  </label>
                  <div className="suite-checks">
                    {(
                      ['active', 'monthlyEnabled', 'annualEnabled'] as const
                    ).map((k, i) => (
                      <label key={k}>
                        <input
                          type="checkbox"
                          checked={editing[k] ?? true}
                          onChange={(e) =>
                            setEditing({ ...editing, [k]: e.target.checked })
                          }
                        />
                        {
                          [
                            'Publicar plano',
                            'Permitir pagamento mensal',
                            'Permitir pagamento anual',
                          ][i]
                        }
                      </label>
                    ))}
                  </div>
                  <fieldset>
                    <legend>
                      {t('Funcionalidades com controlo de acesso')}
                    </legend>
                    <div className="suite-checks">
                      {(Object.keys(featureCatalog) as FeatureKey[]).map(
                        (key) => (
                          <label key={key}>
                            <input
                              type="checkbox"
                              checked={planFeatures(editing)[key]}
                              onChange={(e) =>
                                setEditing({
                                  ...editing,
                                  features: {
                                    ...planFeatures(editing),
                                    [key]: e.target.checked,
                                  },
                                })
                              }
                            />
                            {t(featureCatalog[key])}
                          </label>
                        ),
                      )}
                    </div>
                  </fieldset>
                  <label>
                    {t(' Outros benefícios comerciais (um por linha, até 12) ')}
                    <textarea
                      maxLength={1900}
                      value={(editing.benefits ?? []).join('\n')}
                      onChange={(e) =>
                        setEditing({
                          ...editing,
                          benefits: e.target.value.split('\n'),
                        })
                      }
                    />
                  </label>
                  <p>
                    {t(
                      ' Estes textos descrevem serviços que a equipa oferece. Não criam novas funções no software. ',
                    )}
                  </p>
                  <div className="suite-toolbar">
                    <button disabled={busy} className="manager-primary">
                      {t(' Guardar plano ')}
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => setEditing(null)}
                    >
                      {t(' Fechar editor ')}
                    </button>
                  </div>
                </form>
              ) : null}
              <div className="suite-grid">
                {data.plans.map((p) => (
                  <article className="manager-card" key={p.id}>
                    <span className="manager-eyebrow">
                      {t(p.active ? 'PUBLICADO' : 'ARQUIVADO')}
                    </span>
                    <h2>{p.name}</h2>
                    <p>{p.description}</p>
                    <strong>
                      {t(
                        p.id === 'free-30'
                          ? 'Grátis'
                          : `${p.monthlyEnabled ? 'Mensal: ' + planPrice(p) : 'Mensal indisponível'} · ${p.annualEnabled ? 'Anual: ' + planPrice({ meticais: planAnnualMeticais(p) }) : 'Anual indisponível'}`,
                      )}
                    </strong>
                    <p>
                      {p.links} {t(' links · ')}
                      {p.bio} {t(' caracteres ')}
                    </p>
                    <ul>
                      {(Object.keys(featureCatalog) as FeatureKey[])
                        .filter((k) => planFeatures(p)[k])
                        .map((k) => (
                          <li key={k}>{t(featureCatalog[k])}</li>
                        ))}
                    </ul>
                    <button onClick={() => setEditing(p)}>
                      {t('Editar plano')}
                    </button>
                  </article>
                ))}
              </div>
            </>
          )}
          {tab === 'members' && (
            <section className="manager-card">
              <h2>{t('Clientes e períodos contratados')}</h2>
              <div className="suite-toolbar">
                <div className="suite-search-field">
                  <input
                    aria-label={t('Pesquisar cliente')}
                    placeholder={t('Nome, email ou plano')}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                  <Search size={20} aria-hidden="true" />
                </div>
                <select
                  aria-label={t('Estado')}
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                >
                  <option value="all">{t('Todos os estados')}</option>
                  {Object.entries(states).map(([id, label]) => (
                    <option key={id} value={id}>
                      {t(label)}
                    </option>
                  ))}
                </select>
                <select
                  aria-label={t('Periodicidade')}
                  value={cycle}
                  onChange={(e) => setCycle(e.target.value)}
                >
                  <option value="all">{t('Todas as periodicidades')}</option>
                  <option value="monthly">{t('Mensal')}</option>
                  <option value="annual">{t('Anual')}</option>
                </select>
              </div>
              <div className="suite-table">
                <table>
                  <thead>
                    <tr>
                      <th>{t('Cliente')}</th>
                      <th>{t('Plano contratado')}</th>
                      <th>{t('Estado')}</th>
                      <th>{t('Validade')}</th>
                      <th>{t('Próxima alteração')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((m) => (
                      <tr key={m.owner_id}>
                        <td>
                          {m.name}
                          <small>{m.email}</small>
                        </td>
                        <td>
                          {(() => {
                            try {
                              return JSON.parse(m.terms_json).name ?? m.plan_id;
                            } catch {
                              return m.plan_id;
                            }
                          })()}
                        </td>
                        <td>{t(states[m.state])}</td>
                        <td>{when(m.paid_expires_at ?? m.trial_expires_at)}</td>
                        <td>
                          {t(
                            m.next_starts_at
                              ? `${m.next_plan_id} · ${when(m.next_starts_at)}`
                              : '—',
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {!filtered.length && (
                <p>{t('Nenhum cliente corresponde aos filtros.')}</p>
              )}
              <p>
                {t(
                  ' As alterações de plano pagas começam no fim do período contratado. A activação depende de pagamento confirmado. ',
                )}
              </p>
            </section>
          )}
          {tab === 'payments' && <ProfileSubscriptions manager />}
          {tab === 'messages' && reminders && (
            <>
              <RenewalWhatsApp
                members={data.members}
                daysBefore={data.reminders.daysBefore}
                truncated={data.truncated}
              />
              <form
                className="manager-card suite-form"
                onSubmit={(e) => {
                  e.preventDefault();
                  void save('/api/manager-subscriptions', {
                    ...reminders,
                    version: data.reminderVersion,
                  });
                }}
              >
                <h2>{t('Lembretes de renovação')}</h2>
                <p>
                  {t(
                    ' Envio antes da validade terminar. Os avisos de tolerância e contacto básico continuam a explicar as regras de acesso. ',
                  )}
                </p>
                <label className="suite-check">
                  <input
                    type="checkbox"
                    checked={reminders.enabled}
                    onChange={(e) =>
                      setReminders({ ...reminders, enabled: e.target.checked })
                    }
                  />
                  {t(' Enviar lembretes por email ')}
                </label>
                <label>
                  {t(' Primeiro aviso: dias antes do fim ')}
                  <input
                    type="number"
                    min={2}
                    max={30}
                    required
                    value={reminders.daysBefore}
                    onChange={(e) =>
                      setReminders({
                        ...reminders,
                        daysBefore: Number(e.target.value),
                      })
                    }
                  />
                </label>
                <p>
                  {t(
                    ' Também será enviado um aviso no último dia. Não há débitos automáticos. ',
                  )}
                </p>
                <label>
                  {t(' Assunto ')}
                  <input
                    required
                    maxLength={160}
                    value={reminders.subject}
                    onChange={(e) =>
                      setReminders({ ...reminders, subject: e.target.value })
                    }
                  />
                </label>
                <label>
                  {t(' Mensagem ')}
                  <textarea
                    rows={6}
                    required
                    maxLength={2500}
                    value={reminders.message}
                    onChange={(e) =>
                      setReminders({ ...reminders, message: e.target.value })
                    }
                  />
                </label>
                <p>
                  {t(' Variáveis:')}{' '}
                  {reminderVariables.map((v) => '{' + v + '}').join(' · ')}
                </p>
                <aside className="suite-preview">
                  <h3>{t('Pré-visualização · dados de exemplo')}</h3>
                  {[reminders.subject, reminders.message].map((template, i) => (
                    <p key={i}>
                      {renderReminder(template, {
                        nome: 'Ana',
                        plano: 'Individual',
                        periodicidade: 'anual',
                        data_fim: '31/12/2026',
                        link_renovacao:
                          'https://framyconnect.co.mz/perfil?plans=1',
                      })}
                    </p>
                  ))}
                </aside>
                <button className="manager-primary" disabled={busy}>
                  {t(' Guardar mensagens ')}
                </button>
              </form>
              <section className="manager-card">
                <h2>{t('Últimos avisos')}</h2>
                <div className="suite-table">
                  <table>
                    <thead>
                      <tr>
                        <th>{t('Destinatário')}</th>
                        <th>{t('Assunto')}</th>
                        <th>{t('Estado do envio')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.deliveries.map((n) => (
                        <tr key={n.id}>
                          <td>{n.email}</td>
                          <td>{n.subject}</td>
                          <td>
                            {t(
                              n.sent_at
                                ? 'Aceite pelo serviço de email'
                                : n.attempted_at
                                  ? 'Tentativa sem confirmação'
                                  : 'Aviso na conta / por enviar',
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p>
                  {t(
                    ' Aceitação pelo serviço não confirma entrega na caixa de entrada. Consulte o Resend para o resultado de entrega. ',
                  )}
                </p>
              </section>
            </>
          )}
          {tab === 'audit' && (
            <section className="manager-card">
              <h2>{t('Histórico de gestão')}</h2>
              {data.audit.length ? (
                data.audit.map((a, i) => (
                  <p key={i}>
                    {when(a.created_at)} · {a.actor} · {a.action} ·{' '}
                    {t(
                      a.action.startsWith('Renovação:')
                        ? 'Definições de comunicação'
                        : a.subject,
                    )}
                  </p>
                ))
              ) : (
                <p>{t('Sem alterações registadas.')}</p>
              )}
            </section>
          )}
        </>
      )}
    </section>
  );
}
