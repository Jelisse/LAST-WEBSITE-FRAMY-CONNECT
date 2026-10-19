'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import Link from './hard-link';
import { focusDashboardStart } from '@/lib/dashboard-navigation';
import { parseCorporateBatch, processCorporateBatch } from '@/lib/corporate';
import { CorporateEmailInvites } from './corporate-email-invites';
import { CorporateCredentials } from './corporate-credentials';
import { SourceImage } from './source-image';
import { csvCell } from '@/lib/site-analytics';
import { DashboardTools } from './mobile-navigation';
import { useI18n } from './language-provider';
type Member = {
  managed_access?: number;
  credential_version?: number;
  provisioned_at?: number | null;
  account_id: string;
  name: string;
  email: string;
  role: string;
  active: number;
  within_limit?: number;
  left_at?: number | null;
  team: string;
  version: number;
};
type Campaign = { id: string; name: string; active: number };
type Assignment = {
  id: string;
  campaign_id: string;
  account_id: string;
  username: string | null;
};
type Data = {
  organisations: { id: string; name: string; role: string; owner_id: string }[];
  actorId: string;
  canCreate: boolean;
  emailReady: boolean;
};
type Detail = {
  organisation: {
    id: string;
    name: string;
    owner_id: string;
    actor_id: string;
    role: string;
    seats: number;
    analytics?: boolean;
  };
  members: Member[];
  campaigns: Campaign[];
  assignments: Assignment[];
  leadCounts: { account_id: string; campaign_id: string; count: number }[];
  metrics: {
    account_id: string;
    campaign_id: string;
    target: string;
    count: number;
  }[];
  leads: {
    id: string;
    account_id: string;
    campaign_id: string;
    name: string;
    email: string;
    phone: string;
    interest: string;
    created_at: number;
  }[];
  invites: {
    id: string;
    email: string;
    name: string;
    role: string;
    team: string;
    expires_at: number;
    delivery: string;
    mode?: string;
  }[];
  truncated: boolean;
};
export function CorporateDashboard() {
  const { t, locale } = useI18n();
  const [data, setData] = useState<Data | null>(null),
    [detail, setDetail] = useState<Detail | null>(null),
    [organisation, setOrganisation] = useState(''),
    [days, setDays] = useState('30'),
    [campaign, setCampaign] = useState(''),
    [error, setError] = useState(''),
    [notice, setNotice] = useState(''),
    [busy, setBusy] = useState(false),
    [copied, setCopied] = useState('');
  const [qr, setQr] = useState<{ id: string; image: string } | null>(null);
  const [teamFilter, setTeamFilter] = useState('');
  const [inviteMode, setInviteMode] = useState<'invite' | 'authorization'>(
    'invite',
  );
  const revision = useRef(0);
  const [batch, setBatch] = useState('');
  const [batchProgress, setBatchProgress] = useState<{
    completed: number;
    uncertain: number;
  } | null>(null);
  async function inviteBatch() {
    setBusy(true);
    setError('');
    setBatchProgress(null);
    try {
      const rows = parseCorporateBatch(batch);
      const result = await processCorporateBatch(
        rows,
        async (row) => {
          const r = await fetch('/api/corporate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'invite',
              organisation,
              role: 'member',
              mode: inviteMode,
              ...row,
            }),
            signal: AbortSignal.timeout(20000),
          });
          const b = (await r.json()) as { error?: string; delivery?: string };
          if (!r.ok || !['accepted', 'uncertain'].includes(b.delivery || ''))
            throw Error(b.error || 'Não foi possível enviar.');
          return b.delivery === 'accepted' ? 'accepted' : 'uncertain';
        },
        (completed, uncertain) => setBatchProgress({ completed, uncertain }),
      );
      setBatchProgress({
        completed: result.completed,
        uncertain: result.uncertain,
      });
      setBatch(
        result.remaining
          .map((row) => [row.name, row.email, row.team].join(';'))
          .join('\n'),
      );
      if (result.error) setError(result.error);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Não foi possível enviar.');
    } finally {
      setBusy(false);
      await load().catch((e) => setError(e.message));
    }
  }
  const load = useCallback(async () => {
    const current = ++revision.current;
    const response = await fetch('/api/corporate', { cache: 'no-store' });
    const body = (await response.json()) as Data & { error?: string };
    if (current !== revision.current) return;
    if (!response.ok) throw Error(body.error);
    setData(body);
    if (!organisation && body.organisations.length)
      setOrganisation(body.organisations[0].id);
    if (organisation) {
      const r = await fetch(
        '/api/corporate?' + new URLSearchParams({ organisation, days }),
        { cache: 'no-store' },
      );
      const b = (await r.json()) as Detail & { error?: string };
      if (current !== revision.current) return;
      if (!r.ok) {
        setDetail(null);
        throw Error(b.error);
      }
      setDetail(b);
    }
  }, [organisation, days]);
  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) void load().catch((e) => setError(e.message));
    });
    return () => {
      cancelled = true;
    };
  }, [load]);
  useEffect(() => {
    const refresh = () => {
      if (
        document.visibilityState === 'visible' &&
        !busy &&
        !document.activeElement?.closest('form')
      )
        void load().catch((e) => setError(e.message));
    };
    const timer = window.setInterval(refresh, 30000);
    window.addEventListener('focus', refresh);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('focus', refresh);
    };
  }, [load, busy]);
  async function act(body: Record<string, unknown>) {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const r = await fetch('/api/corporate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ organisation, ...body }),
      });
      const b = (await r.json()) as {
        error?: string;
        id?: string;
        delivery?: string;
      };
      if (!r.ok) throw Error(b.error);
      if (body.action === 'leave') {
        setOrganisation('');
        setDetail(null);
        setData((previous) =>
          previous
            ? {
                ...previous,
                organisations: previous.organisations.filter(
                  (o) => o.id !== organisation,
                ),
              }
            : previous,
        );
        setNotice('Saiu da organização.');
        return;
      }
      if (b.id) setOrganisation(b.id);
      setNotice(
        b.delivery === 'uncertain'
          ? 'Envio por confirmar. Pode reenviar o convite; o anterior será invalidado.'
          : b.delivery === 'accepted'
            ? 'Convite aceite pelo serviço de email. Aguarda confirmação do trabalhador.'
            : 'Alteração guardada.',
      );
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Não foi possível guardar.');
    } finally {
      setBusy(false);
    }
  }
  const leader = detail?.organisation.role === 'leader';
  const owner = detail?.organisation.owner_id === detail?.organisation.actor_id;
  const metrics = (account: string, target?: string) =>
    detail?.metrics
      .filter(
        (m) =>
          m.account_id === account &&
          (!campaign || m.campaign_id === campaign) &&
          (target ? m.target === target : m.target !== 'profile_open'),
      )
      .reduce((sum, m) => sum + m.count, 0) ?? 0;
  const leads =
    detail?.leads.filter(
      (l) =>
        (!campaign || l.campaign_id === campaign) &&
        (!teamFilter ||
          detail.members.find((m) => m.account_id === l.account_id)?.team ===
            teamFilter),
    ) ?? [];
  function exportResults() {
    if (!detail) return;
    const rows = [
      [
        'Trabalhador',
        'Equipa',
        'Campanha',
        'Aberturas do perfil',
        'Cliques',
        'Contactos recebidos',
      ],
      ...detail.members
        .filter((m) => !teamFilter || m.team === teamFilter)
        .map((m) => [
          m.name,
          m.team,
          campaign
            ? detail.campaigns.find((c) => c.id === campaign)?.name
            : 'Todas',
          metrics(m.account_id, 'profile_open'),
          metrics(m.account_id),
          detail.leadCounts
            .filter(
              (l) =>
                l.account_id === m.account_id &&
                (!campaign || l.campaign_id === campaign),
            )
            .reduce((sum, l) => sum + l.count, 0),
        ]),
    ];
    const url = URL.createObjectURL(
      new Blob(
        ['\ufeff' + rows.map((r) => r.map(csvCell).join(',')).join('\r\n')],
        { type: 'text/csv;charset=utf-8' },
      ),
    );
    const a = document.createElement('a');
    a.href = url;
    a.download = 'framy-corporativo.csv';
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  return (
    <main id="main" className="staff-page corporate-dashboard">
      <header>
        <DashboardTools />
      </header>
      <h1>{t('Equipa corporativa')}</h1>
      <div className="corporate-toolbar">
        <Link href="/perfil">{t('O meu perfil')}</Link>
        <Link href="/corporativo/configurar">
          {t('Configurar a minha empresa')}
        </Link>
      </div>
      <p>
        {t(
          'Organize trabalhadores e campanhas. Acompanhe apenas a actividade recolhida para a organização.',
        )}
      </p>
      {error && <p role="alert">{t(error)}</p>}
      {notice && <output>{t(notice)}</output>}
      {batchProgress && (
        <output>
          {t('Convites processados: {0}. Envios por confirmar: {1}.', [
            batchProgress.completed,
            batchProgress.uncertain,
          ])}
        </output>
      )}
      {!data ? (
        <p>{t('A carregar…')}</p>
      ) : (
        <>
          <div className="corporate-toolbar">
            <label>
              {t('Organização')}
              <select
                value={organisation}
                disabled={busy}
                onChange={(e) => {
                  setOrganisation(e.target.value);
                  focusDashboardStart();
                  setDetail(null);
                  setCampaign('');
                  setTeamFilter('');
                  setTeamFilter('');
                  setError('');
                }}
              >
                <option value="">{t('Seleccionar')}</option>
                {data.organisations.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name}
                  </option>
                ))}
              </select>
            </label>
            <button
              disabled={busy}
              onClick={() => void load().catch((e) => setError(e.message))}
            >
              {t('Actualizar')}
            </button>
            {organisation &&
              data.actorId &&
              data.organisations.some(
                (o) => o.id === organisation && o.owner_id !== data.actorId,
              ) && (
                <button
                  disabled={busy}
                  onClick={() => void act({ action: 'leave' })}
                >
                  {t('Sair da organização')}
                </button>
              )}
          </div>
          {data.canCreate && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void act({
                  action: 'create',
                  name: new FormData(e.currentTarget).get('name'),
                });
              }}
            >
              <h2>{t('Criar organização')}</h2>
              <label>
                {t('Nome')}
                <input name="name" required maxLength={100} />
              </label>
              <button disabled={busy}>{t('Criar')}</button>
            </form>
          )}
          {!data.canCreate && !data.organisations.length && (
            <p>
              {t(
                'Configure a empresa e envie o pedido de aprovação. Se é trabalhador, aceite o convite recebido por email.',
              )}
            </p>
          )}
          {detail && (
            <>
              <h2>{detail.organisation.name}</h2>
              {detail.organisation.analytics === false && (
                <p>
                  {t('Este contrato não inclui estatísticas corporativas.')}
                </p>
              )}
              {detail.truncated && (
                <p>
                  {t('A lista foi limitada. Refine o período e a campanha.')}
                </p>
              )}
              <p>
                {t('Limite de trabalhadores')}: {detail.organisation.seats}
              </p>
              <div className="corporate-toolbar">
                <label>
                  {t('Período')}
                  <select
                    value={days}
                    onChange={(e) => setDays(e.target.value)}
                  >
                    {[7, 30, 90].map((d) => (
                      <option key={d} value={d}>
                        {d} {t('dias')}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  {t('Campanha')}
                  <select
                    value={campaign}
                    onChange={(e) => setCampaign(e.target.value)}
                  >
                    <option value="">{t('Todas')}</option>
                    {detail.campaigns.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  {t('Equipa')}
                  <select
                    value={teamFilter}
                    onChange={(e) => setTeamFilter(e.target.value)}
                  >
                    <option value="">{t('Todas')}</option>
                    {[
                      ...new Set(
                        detail.members.map((m) => m.team).filter(Boolean),
                      ),
                    ].map((team) => (
                      <option key={team} value={team}>
                        {team}
                      </option>
                    ))}
                  </select>
                </label>
                <button onClick={exportResults}>
                  {t('Exportar resultados CSV')}
                </button>
              </div>
              <p>
                {t(
                  'Aberturas e cliques são acções, não pessoas únicas, contactos guardados ou seguidores confirmados.',
                )}
              </p>
              {leader && (
                <section className="corporate-panel">
                  <h2>{t('Como adicionar trabalhadores')}</h2>
                  <label>
                    {t('Método de entrada')}
                    <select
                      value={inviteMode}
                      disabled={busy}
                      onChange={(e) =>
                        setInviteMode(
                          e.target.value as 'invite' | 'authorization',
                        )
                      }
                    >
                      <option value="invite">
                        {t('Convite: o trabalhador define o acesso')}
                      </option>
                      <option value="authorization">
                        {t('Autorização: o líder cria o acesso')}
                      </option>
                    </select>
                  </label>
                  <p>
                    {t(
                      inviteMode === 'authorization'
                        ? 'O trabalhador autoriza por email. Só depois pode criar o acesso e definir a palavra-passe. Para contas existentes, use Convite.'
                        : 'O trabalhador confirma o email e define a palavra-passe. Se já tem conta, entra com o mesmo email e aceita a associação.',
                    )}
                  </p>
                </section>
              )}
              {leader && (
                <CorporateEmailInvites
                  key={organisation}
                  organisation={organisation}
                  mode={inviteMode}
                  emailReady={data.emailReady}
                  busy={busy}
                  setBusy={setBusy}
                  reload={load}
                />
              )}
              {leader && (
                <CorporateCredentials
                  organisation={organisation}
                  members={detail.members}
                  owner={owner}
                  reload={load}
                />
              )}
              {leader && (
                <details className="corporate-panel">
                  <summary>{t('Adicionar um trabalhador')}</summary>
                  <p>
                    {t(
                      'Os acessos só são activados após a confirmação enviada ao email indicado.',
                    )}
                  </p>
                  {!data.emailReady && (
                    <p>
                      {t('O envio de convites por email não está configurado.')}
                    </p>
                  )}
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      const f = new FormData(e.currentTarget);
                      void act({
                        action: 'invite',
                        name: f.get('name'),
                        email: f.get('email'),
                        team: f.get('team'),
                        role: f.get('role'),
                        mode: inviteMode,
                      });
                    }}
                  >
                    <label>
                      {t('Nome')}
                      <input name="name" required maxLength={100} />
                    </label>
                    <label>
                      {t('Email')}
                      <input
                        name="email"
                        type="email"
                        required
                        maxLength={254}
                      />
                    </label>
                    <label>
                      {t('Equipa')}
                      <input name="team" maxLength={80} />
                    </label>
                    <label>
                      {t('Função')}
                      <select name="role">
                        <option value="member">{t('Trabalhador')}</option>
                        <option value="leader" disabled={!owner}>
                          {t('Líder')}
                        </option>
                      </select>
                    </label>
                    <button disabled={busy || !data.emailReady}>
                      {t(
                        inviteMode === 'authorization'
                          ? 'Enviar autorização'
                          : 'Enviar convite',
                      )}
                    </button>
                  </form>
                </details>
              )}
              {leader && (
                <details className="corporate-panel">
                  <summary>{t('Adicionar trabalhadores em lote')}</summary>
                  <p>
                    {t(
                      'Um trabalhador por linha: Nome;email;equipa, sem cabeçalho. Até 25 por envio. Se houver uma falha, as linhas restantes ficam guardadas neste formulário.',
                    )}
                  </p>
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      void inviteBatch();
                    }}
                  >
                    <label>
                      {t('Trabalhadores')}
                      <textarea
                        disabled={busy}
                        value={batch}
                        onChange={(e) => setBatch(e.target.value)}
                        maxLength={12000}
                        rows={6}
                        required
                      />
                    </label>
                    <button disabled={busy || !data.emailReady}>
                      {t(
                        inviteMode === 'authorization'
                          ? 'Enviar autorizações'
                          : 'Enviar convites',
                      )}
                    </button>
                  </form>
                </details>
              )}
              <div className="corporate-table" aria-label={t('Trabalhadores')}>
                <table>
                  <thead>
                    <tr>
                      {[
                        'Trabalhador',
                        'Equipa',
                        'Função',
                        'Estado',
                        'Aberturas do perfil',
                        'Cliques',
                        'Contactos recebidos',
                        'Acções',
                      ].map((k) => (
                        <th key={k}>{t(k)}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {detail.members
                      .filter((m) => !teamFilter || m.team === teamFilter)
                      .map((m) => (
                        <tr key={m.account_id}>
                          <td>
                            {m.name}
                            <small>{m.email}</small>
                          </td>
                          <td>{m.team || '—'}</td>
                          <td>
                            {t(m.role === 'leader' ? 'Líder' : 'Trabalhador')}
                          </td>
                          <td>
                            {t(
                              m.active
                                ? m.managed_access && !m.provisioned_at
                                  ? 'Autorização confirmada'
                                  : m.within_limit === 0
                                    ? 'Fora do limite'
                                    : 'Activo'
                                : 'Suspenso',
                            )}
                          </td>
                          <td>{metrics(m.account_id, 'profile_open')}</td>
                          <td>{metrics(m.account_id)}</td>
                          <td>
                            {detail.leadCounts
                              .filter(
                                (l) =>
                                  l.account_id === m.account_id &&
                                  (!campaign || l.campaign_id === campaign),
                              )
                              .reduce((sum, l) => sum + l.count, 0)}
                          </td>
                          <td>
                            {leader &&
                              m.account_id !== detail.organisation.owner_id &&
                              (owner || m.role === 'member') && (
                                <form
                                  onSubmit={(e) => {
                                    e.preventDefault();
                                    const f = new FormData(e.currentTarget);
                                    void act({
                                      action: 'member',
                                      id: m.account_id,
                                      version: m.version,
                                      role: f.get('role'),
                                      mode: inviteMode,
                                      team: f.get('team'),
                                      active: f.get('active') === 'on',
                                    });
                                  }}
                                >
                                  <input
                                    name="team"
                                    aria-label={t('Equipa')}
                                    defaultValue={m.team}
                                    key={'team' + m.version}
                                    maxLength={80}
                                  />
                                  <select
                                    name="role"
                                    aria-label={t('Função')}
                                    defaultValue={m.role}
                                    key={'role' + m.version}
                                  >
                                    <option value="member">
                                      {t('Trabalhador')}
                                    </option>
                                    <option value="leader" disabled={!owner}>
                                      {t('Líder')}
                                    </option>
                                  </select>
                                  <label>
                                    <input
                                      type="checkbox"
                                      name="active"
                                      disabled={!!m.left_at}
                                      title={
                                        m.left_at
                                          ? t(
                                              'Envie um novo convite para voltar a associar este trabalhador.',
                                            )
                                          : undefined
                                      }
                                      defaultChecked={!!m.active}
                                      key={'active' + m.version}
                                    />
                                    {t('Activo')}
                                  </label>
                                  <button disabled={busy}>
                                    {t('Guardar')}
                                  </button>
                                </form>
                              )}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
              {leader && (
                <section className="corporate-panel">
                  <h2>{t('Convites pendentes')}</h2>
                  {detail.invites.map((i) => (
                    <div className="corporate-toolbar" key={i.id}>
                      <span>
                        {i.name} · {i.email} ·{' '}
                        {new Date(i.expires_at).toLocaleDateString(locale, {
                          timeZone: 'Africa/Maputo',
                        })}{' '}
                        ·{' '}
                        {t(
                          i.delivery === 'accepted'
                            ? 'Aceite pelo serviço de email'
                            : 'Envio por confirmar',
                        )}
                      </span>
                      <button
                        disabled={busy}
                        onClick={() =>
                          void act({
                            action: 'invite',
                            name: i.name,
                            email: i.email,
                            team: i.team,
                            role: i.role,
                            mode: i.mode,
                          })
                        }
                      >
                        {t('Reenviar')}
                      </button>
                      <button
                        disabled={busy}
                        onClick={() => void act({ action: 'revoke', id: i.id })}
                      >
                        {t('Cancelar convite')}
                      </button>
                    </div>
                  ))}
                </section>
              )}
              <section className="corporate-panel">
                <h2>{t('Campanhas e eventos')}</h2>
                <p>
                  {t(
                    'Use o link ou QR da campanha para atribuir resultados à equipa. Os links pessoais e NFC já gravados não são alterados.',
                  )}
                </p>
                {leader && (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      void act({
                        action: 'campaign',
                        name: new FormData(e.currentTarget).get('name'),
                      });
                    }}
                  >
                    <label>
                      {t('Nome da campanha')}
                      <input name="name" maxLength={100} required />
                    </label>
                    <button disabled={busy}>{t('Criar campanha')}</button>
                  </form>
                )}
                {detail.campaigns.map((c) => (
                  <article key={c.id}>
                    <div className="corporate-toolbar">
                      <h3>{c.name}</h3>
                      {leader && (
                        <button
                          disabled={busy}
                          onClick={() =>
                            void act({
                              action: 'campaign-state',
                              id: c.id,
                              active: !c.active,
                            })
                          }
                        >
                          {t(
                            c.active ? 'Encerrar campanha' : 'Reabrir campanha',
                          )}
                        </button>
                      )}
                    </div>
                    {leader && !!c.active && (
                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          void act({
                            action: 'assign',
                            id: c.id,
                            accountId: new FormData(e.currentTarget).get(
                              'member',
                            ),
                          });
                        }}
                      >
                        <label>
                          {t('Trabalhador')}
                          <select required name="member">
                            {detail.members
                              .filter((m) => m.active && m.within_limit !== 0)
                              .map((m) => (
                                <option value={m.account_id} key={m.account_id}>
                                  {m.name}
                                </option>
                              ))}
                          </select>
                        </label>
                        <button disabled={busy}>
                          {t('Gerar link de campanha')}
                        </button>
                      </form>
                    )}
                    {detail.assignments
                      .filter((a) => a.campaign_id === c.id)
                      .map((a) => (
                        <div key={a.id} className="corporate-toolbar">
                          <span>
                            {
                              detail.members.find(
                                (m) => m.account_id === a.account_id,
                              )?.name
                            }
                          </span>
                          <Link href={'/campanha/' + a.id}>
                            {t('Abrir link da campanha')}
                          </Link>
                          <button
                            onClick={async () => {
                              try {
                                await navigator.clipboard.writeText(
                                  new URL('/campanha/' + a.id, location.origin)
                                    .href,
                                );
                                setCopied(a.id);
                              } catch {
                                setError('Não foi possível copiar.');
                              }
                            }}
                          >
                            {t(
                              copied === a.id ? 'Link copiado.' : 'Copiar link',
                            )}
                          </button>
                          <button
                            onClick={async () => {
                              try {
                                const { default: QRCode } =
                                  await import('qrcode');
                                setQr({
                                  id: a.id,
                                  image: await QRCode.toDataURL(
                                    new URL(
                                      '/campanha/' + a.id,
                                      location.origin,
                                    ).href,
                                    { width: 240, margin: 2 },
                                  ),
                                });
                              } catch {
                                setError('Não foi possível gerar o código QR.');
                              }
                            }}
                          >
                            {t('Código QR')}
                          </button>
                          {qr?.id === a.id && (
                            <SourceImage
                              src={qr.image}
                              alt={t('Código QR')}
                              width={240}
                              height={240}
                            />
                          )}
                        </div>
                      ))}
                  </article>
                ))}
              </section>
              <section className="corporate-panel">
                <h2>{t('Contactos recebidos')}</h2>
                <p>
                  {t(
                    'Dados enviados voluntariamente para esta organização. Disponíveis durante 90 dias.',
                  )}
                </p>
                <div className="corporate-table">
                  <table>
                    <thead>
                      <tr>
                        {[
                          'Nome',
                          'Email',
                          'Telefone',
                          'Interesse',
                          'Trabalhador',
                          'Data',
                        ].map((k) => (
                          <th key={k}>{t(k)}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {leads.map((l) => (
                        <tr key={l.id}>
                          <td>{l.name}</td>
                          <td>{l.email}</td>
                          <td>{l.phone}</td>
                          <td>{l.interest}</td>
                          <td>
                            {
                              detail.members.find(
                                (m) => m.account_id === l.account_id,
                              )?.name
                            }
                          </td>
                          <td>
                            {new Date(l.created_at).toLocaleDateString(locale, {
                              timeZone: 'Africa/Maputo',
                            })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            </>
          )}
        </>
      )}
    </main>
  );
}
