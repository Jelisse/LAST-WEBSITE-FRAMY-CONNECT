'use client';
import {
  featureCatalog,
  type PlanFeatures,
  type FeatureKey,
} from '@/lib/plan-features';
import { PlanFeatureIcon } from './plan-feature-icon';
import { useI18n } from './language-provider';
import { profileColors } from '@/lib/profile-business';
import { useCallback, useEffect, useState } from 'react';
import { ProfileSubscriptions } from './profile-subscriptions';
type Enquiry = {
  id: string;
  name: string;
  email: string;
  message: string;
  status: string;
  created_at: number;
};
type TeamData = {
  team: { id: string; name: string } | null;
  members: {
    id: string;
    name: string;
    username: string | null;
    version: number;
    published: number;
  }[];
  pending: { id: string; email: string; expires_at: number }[];
  invitations: { id: string; name: string }[];
  memberships: { id: string; name: string }[];
};
type DomainData = {
  configured: boolean;
  cname: string | null;
  domain: {
    hostname: string;
    token: string;
    status: string;
    checks_json: string;
  } | null;
};
export function ProfileGrowthHub({
  features,
  onEdit,
  onAnalytics,
  initialTab = 'overview',
}: {
  features: PlanFeatures;
  initialTab?: 'overview' | 'billing';
  onEdit: (section: 'business' | 'extras') => void;
  onAnalytics: () => void;
}) {
  const { t } = useI18n();
  const [tab, setTab] = useState(initialTab as string);
  const benefits: Partial<Record<FeatureKey, string>> = {
    whatsapp:
      'Facilite o primeiro contacto com uma mensagem pronta para enviar.',
    location:
      'Ajude os clientes a encontrar o seu negócio e a planear a visita.',
    showcase: 'Apresente os serviços e produtos que quer destacar.',
    english: 'Torne o seu perfil acessível a clientes que falam inglês.',
    enquiries: 'Receba pedidos do perfil e acompanhe cada resposta.',
    analytics: 'Saiba quais as ligações que despertam mais interesse.',
    teams: 'Organize os membros, convites e identidade visual da equipa.',
  };
  return (
    <div className="profile-growth">
      <section
        className="professional-tool-links"
        hidden={tab !== 'overview'}
        aria-label={t('Ferramentas profissionais')}
      >
        <h2>{t('Ferramentas profissionais')}</h2>
        <p>
          {t(
            'Escolha uma ferramenta, configure os dados e publique o perfil para mostrar as alterações aos visitantes.',
          )}
        </p>
        <div>
          {(
            [
              'whatsapp',
              'location',
              'showcase',
              'english',
              'enquiries',
              'analytics',
              'teams',
            ] as FeatureKey[]
          )
            .filter((key) => features[key])
            .map((key) => (
              <button
                type="button"
                key={key}
                onClick={() => {
                  if (key === 'analytics') onAnalytics();
                  else if (key === 'teams' || key === 'enquiries') setTab(key);
                  else
                    onEdit(
                      key === 'whatsapp' || key === 'location'
                        ? 'business'
                        : 'extras',
                    );
                }}
              >
                <PlanFeatureIcon feature={key} />
                <span>
                  <strong>{t(featureCatalog[key])}</strong>
                  <small>{t(benefits[key] ?? '')}</small>
                  <em>{t('Abrir ferramenta')} →</em>
                </span>
              </button>
            ))}
        </div>
      </section>
      <nav aria-label={t('Ferramentas do perfil')} className="growth-tabs">
        {[
          ['overview', 'Ferramentas profissionais'],
          ['billing', 'Plano e renovação'],
          ['enquiries', 'Caixa de entrada'],
          ['teams', 'A minha equipa'],
        ].map(([id, label]) => (
          <button key={id} aria-pressed={tab === id} onClick={() => setTab(id)}>
            {t(label)}
          </button>
        ))}
      </nav>
      {tab === 'billing' ? (
        <ProfileSubscriptions />
      ) : tab !== 'overview' ? (
        <GrowthTool key={tab} tool={tab} canManageTeam={features.teams} />
      ) : null}
    </div>
  );
}
function GrowthTool({
  tool,
  canManageTeam,
}: {
  tool: string;
  canManageTeam: boolean;
}) {
  const { t } = useI18n();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [enquiries, setEnquiries] = useState<Enquiry[]>([]),
    [teams, setTeams] = useState<TeamData | null>(null),
    [domains, setDomains] = useState<DomainData | null>(null),
    [error, setError] = useState(''),
    [notice, setNotice] = useState(''),
    [busy, setBusy] = useState(false),
    [loaded, setLoaded] = useState(false);
  const endpoint = '/api/profile-' + tool;
  const load = useCallback(
    async (signal?: AbortSignal) => {
      const r = await fetch(endpoint, {
        cache: 'no-store',
        signal: signal
          ? AbortSignal.any([signal, AbortSignal.timeout(15000)])
          : AbortSignal.timeout(15000),
      });
      const d = (await r.json()) as TeamData &
        DomainData & { enquiries: Enquiry[]; error?: string };
      if (!r.ok) throw Error(d.error);
      if (tool === 'enquiries') setEnquiries(d.enquiries);
      if (tool === 'teams') setTeams(d);
      if (tool === 'domains') setDomains(d);
      setLoaded(true);
    },
    [endpoint, tool],
  );
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
      const r = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(45000),
      });
      const d = (await r.json()) as { error?: string };
      if (!r.ok) throw Error(d.error);
      await load();
      setNotice('Actualizado.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Tente novamente.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="profile-growth-panel">
      {error && (
        <div role="alert">
          <p>{t(error)}</p>
          <button
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              setError('');
              try {
                await load();
              } catch (e) {
                setError(e instanceof Error ? e.message : 'Tente novamente.');
              } finally {
                setBusy(false);
              }
            }}
          >
            {t('Tentar novamente')}
          </button>
        </div>
      )}
      {notice && <output>{t(notice)}</output>}
      {!loaded && !error && <p>{t('A carregar…')}</p>}
      {tool === 'enquiries' && (
        <>
          <h2>{t('Pedidos de informação')}</h2>
          <p>
            {t(
              ' Mensagens dos visitantes do seu perfil, conservadas por 90 dias. Responda pelo seu email; a Framy não responde automaticamente. Não envie dados sensíveis. ',
            )}
          </p>
          {loaded && !enquiries.length && (
            <p>
              {t(
                ' Ainda não recebeu mensagens. Active o formulário no editor e publique o perfil. ',
              )}
            </p>
          )}
          {loaded && enquiries.length > 0 && (
            <label>
              {t('Estado')}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                {[
                  ['all', 'Todos'],
                  ['new', 'Nova'],
                  ['read', 'Lida'],
                  ['closed', 'Concluída'],
                ].map(([v, label]) => (
                  <option key={v} value={v}>
                    {t(label)}
                  </option>
                ))}
              </select>
            </label>
          )}
          {loaded &&
            enquiries.length > 0 &&
            !enquiries.some(
              (e) => statusFilter === 'all' || e.status === statusFilter,
            ) && <p>{t('Nenhum resultado encontrado.')}</p>}
          {enquiries
            .filter((e) => statusFilter === 'all' || e.status === statusFilter)
            .map((e) => (
              <article className="growth-invoice" key={e.id}>
                <h3>{e.name}</h3>
                <p>
                  {new Date(e.created_at).toLocaleString(t.locale, {
                    timeZone: 'Africa/Maputo',
                  })}{' '}
                  ·{' '}
                  {t(
                    (
                      {
                        new: 'Nova',
                        read: 'Lida',
                        closed: 'Concluída',
                      } as Record<string, string>
                    )[e.status],
                  )}
                </p>
                <p className="growth-preserve">{e.message}</p>
                <a href={'mailto:' + encodeURIComponent(e.email)}>
                  {t(' Responder a ')}
                  {e.email} ↗
                </a>
                <div className="growth-actions">
                  <button
                    disabled={busy}
                    onClick={() =>
                      void act({ action: 'status', id: e.id, status: 'read' })
                    }
                  >
                    {t(' Marcar como lida ')}
                  </button>
                  <button
                    disabled={busy}
                    onClick={() =>
                      void act({ action: 'status', id: e.id, status: 'closed' })
                    }
                  >
                    {t(' Concluir ')}
                  </button>
                  <details>
                    <summary>{t('Eliminar')}</summary>
                    <p>{t('A mensagem será eliminada permanentemente.')}</p>
                    <button
                      disabled={busy}
                      onClick={() => void act({ action: 'delete', id: e.id })}
                    >
                      {t(' Confirmar eliminação ')}
                    </button>
                  </details>
                </div>
              </article>
            ))}
        </>
      )}
      {teams && (
        <>
          <h2>{t('A sua equipa')}</h2>
          <div className="team-metrics">
            <article>
              <strong>{teams.members.length}</strong>
              <span>{t('Membros')}</span>
            </article>
            <article>
              <strong>{teams.pending.length}</strong>
              <span>{t('Convites pendentes')}</span>
            </article>
            <article>
              <strong>
                {Math.max(0, 25 - teams.members.length - teams.pending.length)}
              </strong>
              <span>{t('Lugares disponíveis')}</span>
            </article>
          </div>
          <div className="team-guide">
            <h3>{t('Como funciona a equipa')}</h3>
            <ol>
              <li>
                {t(
                  'Crie a equipa e convide as pessoas pelo email da conta Framy.',
                )}
              </li>
              <li>{t('Cada pessoa aceita o convite na sua própria conta.')}</li>
              <li>
                {t(
                  'Acompanhe os perfis publicados e aplique a cor da equipa quando necessário.',
                )}
              </li>
            </ol>
          </div>
          {!canManageTeam && (
            <p>
              {t(
                'A criação de equipas e convites requer um plano com gestão de equipa. Pode aceitar convites e gerir as suas participações.',
              )}
            </p>
          )}
          <p>
            {t(
              ' Até 25 pessoas. Cada pessoa mantém a sua conta, plano e contactos privados. A equipa vê o nome, link e estado de publicação e pode aplicar uma cor de marca após aceitação. ',
            )}
          </p>
          {teams.invitations.map((i) => (
            <form
              className="growth-notice"
              key={i.id}
              onSubmit={(ev) => {
                ev.preventDefault();
                void act({ action: 'accept', id: i.id, consent: true });
              }}
            >
              <h3>
                {t('Convite: ')}
                {i.name}
              </h3>
              <label className="growth-check">
                <input type="checkbox" required />
                {t(
                  ' Autorizo esta equipa a ver o estado do meu perfil e a alterar a cor nos rascunhos e no perfil publicado. ',
                )}
              </label>
              <button disabled={busy}>{t('Aceitar convite')}</button>
            </form>
          ))}
          {teams.memberships.map((m) => (
            <article key={m.id}>
              <strong>{m.name}</strong>
              <button
                disabled={busy}
                onClick={() => void act({ action: 'leave', id: m.id })}
              >
                {t(' Sair da equipa ')}
              </button>
            </article>
          ))}
          {!teams.team ? (
            <form
              onSubmit={(ev) => {
                ev.preventDefault();
                void act({
                  action: 'create',
                  name: new FormData(ev.currentTarget).get('name'),
                });
              }}
            >
              <label>
                {t(' Nome da equipa ')}
                <input name="name" maxLength={90} required />
              </label>
              <button disabled={busy || !canManageTeam}>
                {t('Criar equipa')}
              </button>
            </form>
          ) : (
            <>
              <h3>{teams.team.name}</h3>
              <form
                onSubmit={(ev) => {
                  ev.preventDefault();
                  void act({
                    action: 'invite',
                    email: new FormData(ev.currentTarget).get('email'),
                  });
                }}
              >
                <label>
                  {t(' Email da pessoa ')}
                  <input type="email" name="email" required maxLength={160} />
                </label>
                <button
                  disabled={
                    busy ||
                    !canManageTeam ||
                    teams.members.length + teams.pending.length >= 25
                  }
                >
                  {t('Criar convite')}
                </button>
                <p>
                  {t(
                    ' O convite aparece na conta com este email, em Ferramentas do perfil → A minha equipa. Expira em 7 dias. Não enviamos emails de convite automaticamente. ',
                  )}
                </p>
              </form>
              <label>
                {t('Pesquisar membros e convites')}
                <input
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </label>
              {search &&
                ![
                  ...teams.pending.map((i) => i.email),
                  ...teams.members.map(
                    (m) => m.name + ' ' + (m.username ?? ''),
                  ),
                ].some((v) =>
                  v.toLocaleLowerCase().includes(search.toLocaleLowerCase()),
                ) && <p role="status">{t('Nenhum resultado encontrado.')}</p>}
              {teams.pending
                .filter((i) =>
                  i.email
                    .toLocaleLowerCase()
                    .includes(search.toLocaleLowerCase()),
                )
                .map((i) => (
                  <div className="team-pending" key={i.id}>
                    {i.email} {t(' · convite pendente')}{' '}
                    <small>
                      {t('Expira em')}:{' '}
                      {new Date(i.expires_at).toLocaleDateString(t.locale, {
                        timeZone: 'Africa/Maputo',
                      })}
                    </small>
                    <button
                      disabled={busy}
                      onClick={() => void act({ action: 'revoke', id: i.id })}
                    >
                      {t(' Revogar ')}
                    </button>
                  </div>
                ))}
              {teams.members
                .filter((m) =>
                  (m.name + ' ' + (m.username ?? ''))
                    .toLocaleLowerCase()
                    .includes(search.toLocaleLowerCase()),
                )
                .map((m) => (
                  <article className="growth-invoice" key={m.id}>
                    <h3>{m.name}</h3>
                    {m.username && m.published ? (
                      <a
                        href={'/' + m.username}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {t(' Ver perfil ↗ ')}
                      </a>
                    ) : (
                      <p>{t('Perfil não publicado')}</p>
                    )}
                    <form
                      onSubmit={(ev) => {
                        ev.preventDefault();
                        void act({
                          action: 'brand',
                          id: m.id,
                          version: m.version,
                          accent: new FormData(ev.currentTarget).get('accent'),
                        });
                      }}
                    >
                      <label>
                        {t(' Cor da marca ')}
                        <select name="accent">
                          {profileColors.map((color) => (
                            <option key={color.value} value={color.value}>
                              {t(color.label)}
                            </option>
                          ))}
                        </select>
                      </label>
                      <button disabled={busy || !canManageTeam || !m.username}>
                        {t(' Aplicar ao perfil ')}
                      </button>
                    </form>
                    <button
                      disabled={busy}
                      onClick={() => void act({ action: 'remove', id: m.id })}
                    >
                      {t(' Remover da equipa ')}
                    </button>
                  </article>
                ))}
            </>
          )}
        </>
      )}
      {domains && (
        <>
          <h2>{t('O seu domínio, o seu perfil')}</h2>
          <p>
            {t(
              ' Ligue um subdomínio que já possui, por exemplo perfil.suaempresa.co.mz. Incluído no plano Profissional; o registo do domínio é pago ao seu fornecedor. ',
            )}
          </p>
          {!domains.configured && (
            <p className="growth-notice">
              {t(
                ' Pode registar o domínio e provar a propriedade. A publicação HTTPS aguarda a activação pela equipa Framy. ',
              )}
            </p>
          )}
          {!domains.domain ? (
            <form
              onSubmit={(ev) => {
                ev.preventDefault();
                void act({
                  action: 'add',
                  hostname: new FormData(ev.currentTarget).get('hostname'),
                });
              }}
            >
              <label>
                {t(' Domínio ')}
                <input
                  name="hostname"
                  placeholder={t('perfil.suaempresa.co.mz')}
                  required
                  maxLength={253}
                />
              </label>
              <button disabled={busy}>{t('Adicionar domínio')}</button>
            </form>
          ) : (
            <>
              <h3>{domains.domain.hostname}</h3>
              <p>
                {t(' Estado:')}{' '}
                {(
                  {
                    pending: 'A aguardar prova de propriedade',
                    verified: 'Propriedade verificada · aguarda configuração',
                    validating: 'A validar DNS e certificado',
                    active: 'Activo com HTTPS',
                  } as Record<string, string>
                )[domains.domain.status] ?? domains.domain.status}
              </p>
              <ol>
                <li>
                  {t(' No fornecedor DNS, adicione TXT')}{' '}
                  <code>
                    {t('_framy.')}
                    {domains.domain.hostname}
                  </code>{' '}
                  {t(' com valor')} <code>{domains.domain.token}</code>.
                </li>
                {domains.cname && (
                  <li>
                    {t(' Adicione CNAME ')}
                    <code>{domains.domain.hostname}</code> →{' '}
                    <code>{domains.cname}</code>.
                  </li>
                )}
                <li>
                  {t(
                    ' Confirme os registos, aguarde a propagação e verifique novamente. Mantenha o TXT para a verificação periódica. ',
                  )}
                </li>
              </ol>
              {domains.domain.checks_json !== '[]' && (
                <details>
                  <summary>{t('Registos de validação do certificado')}</summary>
                  {domainRecords(domains.domain.checks_json).map(
                    (record, i) => (
                      <p key={i}>
                        {record.type}: <code>{record.name}</code>
                        <br />
                        {t(' Valor: ')}
                        <code>{record.value}</code>
                      </p>
                    ),
                  )}
                  <p>
                    {t(
                      ' Adicione estes registos no seu fornecedor DNS e volte a verificar. ',
                    )}
                  </p>
                </details>
              )}
              <button
                disabled={busy}
                onClick={() => void act({ action: 'verify' })}
              >
                {t(busy ? 'A verificar…' : 'Verificar DNS e HTTPS')}
              </button>
              <details>
                <summary>{t('Desligar domínio')}</summary>
                <p>
                  {t(
                    ' O domínio deixará de abrir o perfil. O endereço Framy continua disponível. ',
                  )}
                </p>
                <button
                  disabled={busy}
                  onClick={() => void act({ action: 'remove' })}
                >
                  {t(' Confirmar remoção ')}
                </button>
              </details>
            </>
          )}
        </>
      )}
    </section>
  );
}

function domainRecords(
  raw: string,
): { type: string; name: string; value: string }[] {
  try {
    const data = JSON.parse(raw) as {
      ownership?: { type?: string; name?: string; value?: string };
      ssl?: { txt_name?: string; txt_value?: string }[];
    };
    const rows: { type: string; name: string; value: string }[] = [];
    if (data.ownership?.name && data.ownership.value)
      rows.push({
        type: data.ownership.type ?? 'TXT',
        name: data.ownership.name,
        value: data.ownership.value,
      });
    for (const row of data.ssl ?? [])
      if (row.txt_name && row.txt_value)
        rows.push({ type: 'TXT', name: row.txt_name, value: row.txt_value });
    return rows;
  } catch {
    return [];
  }
}
