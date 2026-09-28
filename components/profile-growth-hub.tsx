'use client';
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
export function ProfileGrowthHub() {
  const [tab, setTab] = useState('billing');
  return (
    <div className="profile-growth">
      <nav aria-label="Ferramentas do perfil" className="growth-tabs">
        {[
          ['billing', 'Plano e renovação'],
          ['enquiries', 'Caixa de entrada'],
          ['teams', 'A minha equipa'],
          ['domains', 'Domínio próprio'],
        ].map(([id, label]) => (
          <button key={id} aria-pressed={tab === id} onClick={() => setTab(id)}>
            {label}
          </button>
        ))}
      </nav>
      {tab === 'billing' ? (
        <ProfileSubscriptions />
      ) : (
        <GrowthTool key={tab} tool={tab} />
      )}
    </div>
  );
}
function GrowthTool({ tool }: { tool: string }) {
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
      {error && <p role="alert">{error}</p>}
      {notice && <output>{notice}</output>}
      {!loaded && !error && <p>A carregar…</p>}
      {tool === 'enquiries' && (
        <>
          <h2>Pedidos de informação</h2>
          <p>
            Mensagens dos visitantes do seu perfil, conservadas por 90 dias.
            Responda pelo seu email; a Framy não responde automaticamente. Não
            envie dados sensíveis.
          </p>
          {loaded && !enquiries.length && (
            <p>
              Ainda não recebeu mensagens. Active o formulário no editor e
              publique o perfil.
            </p>
          )}
          {enquiries.map((e) => (
            <article className="growth-invoice" key={e.id}>
              <h3>{e.name}</h3>
              <p>
                {new Date(e.created_at).toLocaleString('pt-MZ', {
                  timeZone: 'Africa/Maputo',
                })}{' '}
                ·{' '}
                {
                  (
                    {
                      new: 'Nova',
                      read: 'Lida',
                      closed: 'Concluída',
                    } as Record<string, string>
                  )[e.status]
                }
              </p>
              <p className="growth-preserve">{e.message}</p>
              <a href={'mailto:' + encodeURIComponent(e.email)}>
                Responder a {e.email} ↗
              </a>
              <div className="growth-actions">
                <button
                  disabled={busy}
                  onClick={() =>
                    void act({ action: 'status', id: e.id, status: 'read' })
                  }
                >
                  Marcar como lida
                </button>
                <button
                  disabled={busy}
                  onClick={() =>
                    void act({ action: 'status', id: e.id, status: 'closed' })
                  }
                >
                  Concluir
                </button>
                <details>
                  <summary>Eliminar</summary>
                  <p>A mensagem será eliminada permanentemente.</p>
                  <button
                    disabled={busy}
                    onClick={() => void act({ action: 'delete', id: e.id })}
                  >
                    Confirmar eliminação
                  </button>
                </details>
              </div>
            </article>
          ))}
        </>
      )}
      {teams && (
        <>
          <h2>A sua equipa</h2>
          <p>
            Até 25 pessoas. Cada pessoa mantém a sua conta, plano e contactos
            privados. A equipa vê o nome, link e estado de publicação e pode
            aplicar uma cor de marca após aceitação.
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
              <h3>Convite: {i.name}</h3>
              <label className="growth-check">
                <input type="checkbox" required />
                Autorizo esta equipa a ver o estado do meu perfil e a alterar a
                cor nos rascunhos e no perfil publicado.
              </label>
              <button disabled={busy}>Aceitar convite</button>
            </form>
          ))}
          {teams.memberships.map((m) => (
            <article key={m.id}>
              <strong>{m.name}</strong>
              <button
                disabled={busy}
                onClick={() => void act({ action: 'leave', id: m.id })}
              >
                Sair da equipa
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
                Nome da equipa
                <input name="name" maxLength={90} required />
              </label>
              <button disabled={busy}>Criar equipa</button>
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
                  Email da pessoa
                  <input type="email" name="email" required maxLength={160} />
                </label>
                <button disabled={busy}>Criar convite</button>
                <p>
                  O convite aparece na conta com este email, em Ferramentas do
                  perfil → A minha equipa. Expira em 7 dias. Não enviamos emails
                  de convite automaticamente.
                </p>
              </form>
              {teams.pending.map((i) => (
                <p key={i.id}>
                  {i.email} · convite pendente{' '}
                  <button
                    disabled={busy}
                    onClick={() => void act({ action: 'revoke', id: i.id })}
                  >
                    Revogar
                  </button>
                </p>
              ))}
              {teams.members.map((m) => (
                <article className="growth-invoice" key={m.id}>
                  <h3>{m.name}</h3>
                  {m.username && m.published ? (
                    <a
                      href={'/' + m.username}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Ver perfil ↗
                    </a>
                  ) : (
                    <p>Perfil não publicado</p>
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
                      Cor da marca
                      <select name="accent">
                        {profileColors.map((color) => (
                          <option key={color.value} value={color.value}>
                            {color.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <button disabled={busy || !m.username}>
                      Aplicar ao perfil
                    </button>
                  </form>
                  <button
                    disabled={busy}
                    onClick={() => void act({ action: 'remove', id: m.id })}
                  >
                    Remover da equipa
                  </button>
                </article>
              ))}
            </>
          )}
        </>
      )}
      {domains && (
        <>
          <h2>O seu domínio, o seu perfil</h2>
          <p>
            Ligue um subdomínio que já possui, por exemplo
            perfil.suaempresa.co.mz. Incluído no plano Profissional; o registo
            do domínio é pago ao seu fornecedor.
          </p>
          {!domains.configured && (
            <p className="growth-notice">
              Pode registar o domínio e provar a propriedade. A publicação HTTPS
              aguarda a activação pela equipa Framy.
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
                Domínio
                <input
                  name="hostname"
                  placeholder="perfil.suaempresa.co.mz"
                  required
                  maxLength={253}
                />
              </label>
              <button disabled={busy}>Adicionar domínio</button>
            </form>
          ) : (
            <>
              <h3>{domains.domain.hostname}</h3>
              <p>
                Estado:{' '}
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
                  No fornecedor DNS, adicione TXT{' '}
                  <code>_framy.{domains.domain.hostname}</code> com valor{' '}
                  <code>{domains.domain.token}</code>.
                </li>
                {domains.cname && (
                  <li>
                    Adicione CNAME <code>{domains.domain.hostname}</code> →{' '}
                    <code>{domains.cname}</code>.
                  </li>
                )}
                <li>
                  Confirme os registos, aguarde a propagação e verifique
                  novamente. Mantenha o TXT para a verificação periódica.
                </li>
              </ol>
              {domains.domain.checks_json !== '[]' && (
                <details>
                  <summary>Registos de validação do certificado</summary>
                  {domainRecords(domains.domain.checks_json).map(
                    (record, i) => (
                      <p key={i}>
                        {record.type}: <code>{record.name}</code>
                        <br />
                        Valor: <code>{record.value}</code>
                      </p>
                    ),
                  )}
                  <p>
                    Adicione estes registos no seu fornecedor DNS e volte a
                    verificar.
                  </p>
                </details>
              )}
              <button
                disabled={busy}
                onClick={() => void act({ action: 'verify' })}
              >
                {busy ? 'A verificar…' : 'Verificar DNS e HTTPS'}
              </button>
              <details>
                <summary>Desligar domínio</summary>
                <p>
                  O domínio deixará de abrir o perfil. O endereço Framy continua
                  disponível.
                </p>
                <button
                  disabled={busy}
                  onClick={() => void act({ action: 'remove' })}
                >
                  Confirmar remoção
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
