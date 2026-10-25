'use client';
import { VisitorBooks } from './visitor-books';
import { refreshDashboard } from '@/lib/dashboard-refresh';
import { CompanyTools, type CompanyToolView } from './company-tools';
import { CompanyCards } from './company-cards';
import { CompanyFollowups, type CompanyLead } from './company-followups';
import { CorporateSidebar } from './corporate-sidebar';
import { Users, ArrowRight } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import Link from './hard-link';
import { focusDashboardStart } from '@/lib/dashboard-navigation';
import { CorporateReports } from './corporate-reports';
import { CorporateGuide } from './corporate-guide';
import {
  corporateSections,
  type CorporateSection,
} from '@/lib/corporate-navigation';
import { CorporateEmailInvites } from './corporate-email-invites';
import { CorporateCredentials } from './corporate-credentials';
import { SourceImage } from './source-image';
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
  leads: CompanyLead[];
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
export function CorporateDashboard({
  view = 'reports',
  initialOrganisation = '',
  initialCampaign = '',
}: {
  view?: CorporateSection;
  initialOrganisation?: string;
  initialCampaign?: string;
}) {
  const { t, locale } = useI18n();
  const isTool = [
    'signatures',
    'backgrounds',
    'directory',
    'integrations',
  ].includes(view);
  const [data, setData] = useState<Data | null>(null),
    [detail, setDetail] = useState<Detail | null>(null),
    [organisation, setOrganisation] = useState(initialOrganisation),
    [days, setDays] = useState('30'),
    [campaign, setCampaign] = useState(''),
    [error, setError] = useState(''),
    [notice, setNotice] = useState(''),
    [busy, setBusy] = useState(false),
    [copied, setCopied] = useState('');
  const [qr, setQr] = useState<{ id: string; image: string } | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [toolsRevision, setToolsRevision] = useState(0);
  const [teamFilter, setTeamFilter] = useState('');
  const [inviteMode, setInviteMode] = useState<'invite' | 'authorization'>(
    'invite',
  );
  const revision = useRef(0);
  const [now, setNow] = useState(() => Date.now());
  const load = useCallback(async () => {
    const current = ++revision.current;
    const response = await fetch('/api/corporate', { cache: 'no-store' });
    const body = (await response.json()) as Data & { error?: string };
    if (current !== revision.current) return;
    if (!response.ok) throw Error(body.error);
    setData(body);
    setNow(Date.now());
    if (!organisation && body.organisations.length)
      setOrganisation(body.organisations[0].id);
    if (organisation && view !== 'reports' && view !== 'guide' && view !== 'visitors' && !isTool) {
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
  }, [organisation, days, view, isTool]);
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
  const leads =
    detail?.leads.filter(
      (l) =>
        (!campaign || l.campaign_id === campaign) &&
        (!teamFilter ||
          detail.members.find((m) => m.account_id === l.account_id)?.team ===
            teamFilter),
    ) ?? [];

  return (
    <main
      id="main"
      data-guidance-panel={view}
      className={
        'staff-page corporate-dashboard corporate-shell corporate-view-' + view
      }
    >
      <header>
        <DashboardTools navigation={null} />
      </header>
      <CorporateSidebar current={view} organisation={organisation} />
      <div className="corporate-content">
        <div className="corporate-hero">
          <h1>
            {t(corporateSections.find((section) => section.id === view)!.title)}
          </h1>
        </div>

        {error && <p role="alert">{t(error)}</p>}
        {notice && <output>{t(notice)}</output>}
        {!data ? (
          <p>{t('A carregar…')}</p>
        ) : (
          <>
            {!!data.organisations.length && (
              <div className="corporate-toolbar corporate-organisation">
                <label>
                  {t('Organização')}
                  <select
                    value={organisation}
                    disabled={busy}
                    onChange={(e) => {
                      if (
                        document.querySelector(
                          '[data-company-unsaved="true"]',
                        ) &&
                        !window.confirm(
                          t('Descartar alterações não guardadas?'),
                        )
                      )
                        return;
                      setOrganisation(e.target.value);
                      focusDashboardStart();
                      setDetail(null);
                      setCampaign('');
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
                {view !== 'reports' && (
                  <>
                    {' '}
                    <button
                      disabled={busy || refreshing}
                      onClick={async () => {
                        if (
                          isTool &&
                          document.querySelector(
                            '[data-company-unsaved="true"]',
                          ) &&
                          !window.confirm(
                            t('Descartar alterações não guardadas?'),
                          )
                        )
                          return;
                        setRefreshing(true);
                        setError('');
                        try {
                          await refreshDashboard(load);
                          if (isTool) setToolsRevision((x) => x + 1);
                          setNotice('');
                        } catch (e) {
                          setError(
                            e instanceof Error
                              ? e.message
                              : 'Não foi possível carregar.',
                          );
                        } finally {
                          setRefreshing(false);
                        }
                      }}
                    >
                      {t(refreshing ? 'A actualizar…' : 'Actualizar')}
                    </button>
                  </>
                )}
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
            )}
            {data.canCreate && view === 'team' && (
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
            {(!data.canCreate || view !== 'team') &&
              !data.organisations.length &&
              view !== 'guide' && (
                <section className="corporate-empty corporate-panel">
                  <span className="corporate-empty-icon">
                    <Users size={36} aria-hidden="true" />
                  </span>
                  <h2>{t('Comece pela sua empresa')}</h2>
                  <p>
                    {t(
                      'Configure a empresa e envie o pedido de aprovação. Se é trabalhador, aceite o convite recebido por email.',
                    )}
                  </p>
                  <Link
                    className="corporate-primary"
                    href={
                      data.canCreate
                        ? '/corporativo/equipa'
                        : '/corporativo/configurar'
                    }
                  >
                    {t('Configurar a minha empresa')}
                    <ArrowRight size={18} aria-hidden="true" />
                  </Link>
                  <small>
                    {t(
                      'Após aprovação, adicione a equipa e acompanhe as campanhas num só lugar.',
                    )}
                  </small>
                </section>
              )}
            {view === 'reports' && organisation && (
              <CorporateReports
                key={organisation}
                organisation={organisation}
                initialCampaign={initialCampaign}
              />
            )}
            {view === 'visitors' && organisation && <VisitorBooks key={organisation} organisation={organisation} />}
            {view === 'guide' && <CorporateGuide organisation={organisation} />}
            {view === 'cards' && organisation && (
              <CompanyCards key={organisation} organisation={organisation} />
            )}
            {isTool && organisation && (
              <CompanyTools
                key={organisation + view + toolsRevision}
                organisation={organisation}
                view={view as CompanyToolView}
              />
            )}
            {detail && view !== 'reports' && view !== 'guide' && view !== 'visitors' && !isTool && (
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
                {view === 'team' && (
                  <>
                    <div
                      className="corporate-state-counts"
                      aria-label={t('Estado da equipa')}
                    >
                      <div>
                        <strong>
                          {
                            detail.members.filter(
                              (m) =>
                                m.active &&
                                !m.left_at &&
                                m.within_limit !== 0 &&
                                (!m.managed_access || m.provisioned_at),
                            ).length
                          }
                        </strong>
                        <span>{t('Acessos activos')}</span>
                      </div>
                      <div>
                        <strong>{detail.invites.length}</strong>
                        <span>{t('Pedidos pendentes')}</span>
                      </div>
                      <div>
                        <strong>
                          {
                            detail.members.filter(
                              (m) =>
                                m.active &&
                                !m.left_at &&
                                m.managed_access &&
                                m.within_limit !== 0 &&
                                !m.provisioned_at,
                            ).length
                          }
                        </strong>
                        <span>{t('Prontos para criar acesso')}</span>
                      </div>
                    </div>
                    <p>
                      {t('Limite de trabalhadores')}:{' '}
                      {detail.organisation.seats}
                    </p>
                  </>
                )}
                {view === 'contacts' && (
                  <>
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
                    </div>
                  </>
                )}
                {view === 'team' && (
                  <>
                    {leader && (
                      <CorporateEmailInvites
                        key={organisation}
                        organisation={organisation}
                        mode={inviteMode}
                        onModeChange={setInviteMode}
                        teams={[
                          ...new Set(
                            [
                              ...detail.members.map((m) => m.team),
                              ...detail.invites.map((i) => i.team),
                            ].filter(Boolean),
                          ),
                        ]}
                        owner={owner}
                        emailReady={data.emailReady}
                        busy={busy}
                        setBusy={setBusy}
                        reload={load}
                      />
                    )}
                    {leader && (
                      <section
                        className="corporate-panel corporate-pending"
                        id="pending-employees"
                      >
                        <h2>
                          {t('Pedidos pendentes')} ({detail.invites.length})
                        </h2>
                        {!detail.invites.length && (
                          <p>{t('Não existem pedidos pendentes.')}</p>
                        )}
                        {detail.invites.map((i) => (
                          <div className="corporate-toolbar" key={i.id}>
                            <div className="corporate-pending-info">
                              <strong>{i.name || i.email}</strong>
                              {i.name && <small>{i.email}</small>}
                              <span className="corporate-status-pill">
                                {t(
                                  i.expires_at <= now
                                    ? 'Expirado — reenviar pedido'
                                    : i.delivery !== 'accepted'
                                      ? 'Pedido de envio por confirmar'
                                      : i.mode === 'authorization'
                                        ? 'A aguardar consentimento'
                                        : 'A aguardar aceitação do convite',
                                )}
                              </span>
                              <small>
                                {t(
                                  i.mode === 'authorization'
                                    ? 'Autorização: o líder cria o acesso'
                                    : 'Convite: o trabalhador define o acesso',
                                )}{' '}
                                · {t('Válido até')}{' '}
                                {new Date(i.expires_at).toLocaleDateString(
                                  locale,
                                  {
                                    timeZone: 'Africa/Maputo',
                                  },
                                )}
                                {i.team ? ' · ' + i.team : ''}
                              </small>
                            </div>
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
                              onClick={() =>
                                void act({ action: 'revoke', id: i.id })
                              }
                            >
                              {t('Cancelar convite')}
                            </button>
                          </div>
                        ))}
                      </section>
                    )}
                    {leader && (
                      <CorporateCredentials
                        organisation={organisation}
                        members={detail.members}
                        owner={owner}
                        reload={load}
                      />
                    )}
                    <h2 id="team-members">
                      {t('Trabalhadores')} ({detail.members.length})
                    </h2>
                    <div
                      className="corporate-table"
                      aria-label={t('Trabalhadores')}
                    >
                      <table>
                        <thead>
                          <tr>
                            {[
                              'Trabalhador',
                              'Equipa',
                              'Função',
                              'Estado',
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
                                  {t(
                                    m.role === 'leader'
                                      ? 'Líder'
                                      : 'Trabalhador',
                                  )}
                                </td>
                                <td>
                                  {t(
                                    m.active
                                      ? m.within_limit === 0
                                        ? 'Fora do limite'
                                        : m.managed_access && !m.provisioned_at
                                          ? 'Pronto para criar acesso'
                                          : 'Activo'
                                      : 'Suspenso',
                                  )}
                                </td>
                                <td>
                                  {leader &&
                                    m.account_id !==
                                      detail.organisation.owner_id &&
                                    (owner || m.role === 'member') && (
                                      <form
                                        onSubmit={(e) => {
                                          e.preventDefault();
                                          const f = new FormData(
                                            e.currentTarget,
                                          );
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
                                          <option
                                            value="leader"
                                            disabled={!owner}
                                          >
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
                  </>
                )}
                {view === 'campaigns' && (
                  <>
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
                            <Link
                              className="corporate-report-link"
                              href={
                                '/corporativo?' +
                                new URLSearchParams({
                                  organisation,
                                  campaign: c.id,
                                }).toString()
                              }
                            >
                              {t('Ver resultados')}
                            </Link>
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
                                  c.active
                                    ? 'Encerrar campanha'
                                    : 'Reabrir campanha',
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
                                    .filter(
                                      (m) => m.active && m.within_limit !== 0,
                                    )
                                    .map((m) => (
                                      <option
                                        value={m.account_id}
                                        key={m.account_id}
                                      >
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
                                        new URL(
                                          '/campanha/' + a.id,
                                          location.origin,
                                        ).href,
                                      );
                                      setCopied(a.id);
                                    } catch {
                                      setError('Não foi possível copiar.');
                                    }
                                  }}
                                >
                                  {t(
                                    copied === a.id
                                      ? 'Link copiado.'
                                      : 'Copiar link',
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
                                      setError(
                                        'Não foi possível gerar o código QR.',
                                      );
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
                  </>
                )}
                {view === 'contacts' && (
                  <CompanyFollowups
                    key={organisation}
                    organisation={organisation}
                    leads={leads}
                    leader={!!leader}
                    campaignNames={Object.fromEntries(
                      detail.campaigns.map((c) => [c.id, c.name]),
                    )}
                    memberNames={Object.fromEntries(
                      detail.members.map((member) => [
                        member.account_id,
                        member.name,
                      ]),
                    )}
                    onSaved={load}
                  />
                )}
              </>
            )}
          </>
        )}
      </div>
    </main>
  );
}
