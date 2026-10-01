'use client';
import { useI18n } from '@/components/language-provider';

import { useState, useEffect, useCallback, useRef } from 'react';
import { roleLabels } from '@/lib/staff-policy';
type Account = {
  id: string;
  name: string;
  email: string;
  role: keyof typeof roleLabels;
  active: number;
  version: number;
  profileUsername: string | null;
  profilePublished: number;
};
export function AccountManager() {
  const { t } = useI18n();
  const recoveryHeading = useRef<HTMLHeadingElement>(null);
  const [search, setSearch] = useState('');
  const [recovery, setRecovery] = useState<Account | null>(null);
  const [notice, setNotice] = useState('');
  useEffect(() => {
    if (recovery) recoveryHeading.current?.focus();
  }, [recovery]);
  const [data, setData] = useState<{
      accounts: Account[];
      agents: { id: string; name: string }[];
      selfId: string;
      canCreateDirector: boolean;
      recoveryEmailReady: boolean;
    } | null>(null),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false),
    [invite, setInvite] = useState('');
  const load = useCallback(async () => {
    const r = await fetch(
      '/api/accounts?' + new URLSearchParams({ q: search }),
      { cache: 'no-store' },
    );
    const d = (await r.json()) as NonNullable<typeof data> & { error?: string };
    if (!r.ok) throw Error(d.error);
    setData(d);
  }, [search]);
  useEffect(() => {
    const timer = setTimeout(
      () => void load().catch((e) => setError(e.message)),
      250,
    );
    return () => clearTimeout(timer);
  }, [load]);
  async function save(body: Record<string, unknown>) {
    setBusy(true);
    setError('');
    setInvite('');
    try {
      const r = await fetch('/api/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const d = (await r.json()) as { error?: string; invitationUrl?: string };
      if (!r.ok) throw Error(d.error);
      setInvite(d.invitationUrl ?? '');
      await load();
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Não foi possível guardar.');
      return false;
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="panel account-management">
      <h2>{t('Contas e acessos')}</h2>
      <p>
        {t(
          'Pesquise clientes por nome ou email para recuperar o acesso. Os convites da equipa são geridos separadamente.',
        )}
      </p>
      {error && <p role="alert">{t(error)}</p>}
      {notice && <output>{t(notice)}</output>}
      <label>
        {t('Pesquisar por nome ou email')}
        <input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder={t('Nome do cliente ou email')}
        />
      </label>
      <p className="account-help">
        {t(
          'Até 500 resultados. Refine a pesquisa para encontrar a conta pretendida.',
        )}
      </p>
      {data && !data.recoveryEmailReady && (
        <p className="account-help">
          {t('O envio de recuperação por email ainda não está configurado.')}
        </p>
      )}
      {recovery && (
        <section
          className="account-recovery-panel"
          aria-labelledby="recovery-heading"
        >
          <h3 id="recovery-heading" ref={recoveryHeading} tabIndex={-1}>
            {t('Recuperar acesso do cliente')}
          </h3>
          <p>
            <strong>{recovery.name}</strong>
            <br />
            {t('Email de acesso e destino')}: <strong>{recovery.email}</strong>
          </p>
          <p>
            {t(
              'Envia uma ligação pessoal, válida por 30 minutos. O cliente escolhe uma nova palavra-passe; o gestor não a recebe. As sessões antigas terminam quando a recuperação é concluída.',
            )}
          </p>
          <p>
            {t(
              'Se o cliente não tiver acesso a este email, não envie para um endereço diferente sem um processo de verificação de identidade.',
            )}
          </p>
          <form
            onSubmit={async (event) => {
              event.preventDefault();
              setBusy(true);
              setError('');
              setNotice('');
              try {
                const response = await fetch('/api/account-recovery', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    action: 'send',
                    id: recovery.id,
                    version: recovery.version,
                    confirmed: true,
                  }),
                });
                const result = (await response.json()) as {
                  error?: string;
                  message?: string;
                };
                if (!response.ok) throw Error(result.error);
                setNotice(
                  result.message ||
                    'Email de recuperação aceite para envio. A ligação expira em 30 minutos.',
                );
                setRecovery(null);
              } catch (error) {
                setError(
                  error instanceof Error
                    ? error.message
                    : 'Não foi possível enviar.',
                );
              } finally {
                setBusy(false);
              }
            }}
          >
            <label className="account-confirm">
              <input type="checkbox" required />
              {t(
                'Confirmei que o cliente solicitou esta recuperação e que esta é a conta correcta.',
              )}
            </label>
            <div className="account-recovery-actions">
              <button
                className="btn btn-primary"
                disabled={busy || !data?.recoveryEmailReady}
              >
                {busy ? t('A enviar…') : t('Enviar ligação de recuperação')}
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => setRecovery(null)}
              >
                {t('Cancelar')}
              </button>
            </div>
          </form>
        </section>
      )}

      {invite && (
        <output>
          <p>
            {t(
              'Convite criado. Válido por 24 horas; guarde-o antes de sair desta página.',
            )}
          </p>
          <label>
            {t('Ligação privada de activação')}
            <input readOnly value={invite} onFocus={(e) => e.target.select()} />
          </label>
        </output>
      )}
      <details className="account-staff-create">
        <summary>{t('Criar acesso para a equipa')}</summary>
        <p>
          {t(
            'Convites da equipa: válidos por 24 horas. Um novo convite suspende o acesso anterior; entregue-o por um canal seguro.',
          )}
        </p>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            const form = e.currentTarget;
            const values = new FormData(form);
            if (
              await save({
                action: 'create',
                name: values.get('name'),
                email: values.get('email'),
                role: values.get('role'),
                agentId: values.get('agentId'),
              })
            )
              form.reset();
          }}
        >
          <label>
            {t('Nome')}
            <input name="name" required minLength={2} maxLength={100} />
          </label>
          <label>
            {t('Email')}
            <input name="email" type="email" required maxLength={254} />
          </label>
          <label>
            {t('Nível de acesso')}
            <select name="role">
              <option value="agent">{t('Agente')}</option>
              <option value="manager">{t('Gestor')}</option>
              {data?.canCreateDirector && (
                <option value="director">{t('Direcção')}</option>
              )}
            </select>
          </label>
          <label>
            {t('Ligar a um agente já cadastrado (opcional)')}
            <select name="agentId">
              <option value="">{t('Criar novo registo')}</option>
              {data?.agents.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </label>
          <button className="btn btn-primary" disabled={busy}>
            {t('Criar conta e convite')}
          </button>
        </form>
      </details>
      <div className="manager-table-scroll">
        <table>
          <thead>
            <tr>
              <th>{t('Nome')}</th>
              <th>{t('Email')}</th>
              <th>{t('Acesso')}</th>
              <th>{t('Estado')}</th>
              <th>{t('Link do perfil')}</th>
              <th>{t('Acções')}</th>
            </tr>
          </thead>
          <tbody>
            {data?.accounts.map((a) => (
              <tr key={a.id}>
                <td>{a.name}</td>
                <td>{a.email}</td>
                <td>{t(roleLabels[a.role])}</td>
                <td>{a.active ? t('Activo') : t('Inactivo / por activar')}</td>
                <td>
                  {a.profileUsername ? (
                    <>
                      <span>
                        {a.profilePublished
                          ? t('Publicado')
                          : t('Por publicar')}
                      </span>
                      {a.profilePublished && (
                        <div>
                          <a
                            href={'/' + encodeURIComponent(a.profileUsername)}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            {t('Pré-visualizar perfil')}
                          </a>
                          <button
                            type="button"
                            onClick={async () => {
                              try {
                                await navigator.clipboard.writeText(
                                  new URL(
                                    '/' +
                                      encodeURIComponent(a.profileUsername!),
                                    location.origin,
                                  ).href,
                                );
                                setNotice('Link copiado.');
                              } catch {
                                setError(
                                  'Não foi possível copiar. Abra o perfil e copie o endereço do navegador.',
                                );
                              }
                            }}
                          >
                            {t('Copiar link')}
                          </button>
                        </div>
                      )}
                    </>
                  ) : (
                    <span>—</span>
                  )}
                </td>
                <td>
                  {a.id !== data.selfId && (
                    <>
                      <button
                        disabled={busy}
                        onClick={() =>
                          void save({
                            action: 'update',
                            id: a.id,
                            version: a.version,
                            role: a.role,
                            active: a.active ? 0 : 1,
                          })
                        }
                      >
                        {a.active ? t('Desactivar') : t('Activar')}
                      </button>
                      {a.role === 'customer' ? (
                        <button
                          disabled={
                            busy || !a.active || !data.recoveryEmailReady
                          }
                          onClick={() => {
                            setRecovery(a);
                            setError('');
                            setNotice('');
                          }}
                        >
                          {t('Enviar recuperação')}
                        </button>
                      ) : (
                        <button
                          disabled={busy}
                          onClick={() =>
                            void save({
                              action: 'invite',
                              id: a.id,
                              version: a.version,
                            })
                          }
                        >
                          {t('Novo convite / recuperar acesso')}
                        </button>
                      )}
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
