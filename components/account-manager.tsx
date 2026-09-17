'use client';
import { useState, useEffect, useCallback } from 'react';
import { roleLabels } from '@/lib/staff-policy';
type Account = {
  id: string;
  name: string;
  email: string;
  role: keyof typeof roleLabels;
  active: number;
  version: number;
};
export function AccountManager() {
  const [data, setData] = useState<{
      accounts: Account[];
      agents: { id: string; name: string }[];
      selfId: string;
      canCreateDirector: boolean;
    } | null>(null),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false),
    [invite, setInvite] = useState('');
  const load = useCallback(async () => {
    const r = await fetch('/api/accounts', { cache: 'no-store' });
    const d = (await r.json()) as NonNullable<typeof data> & { error?: string };
    if (!r.ok) throw Error(d.error);
    setData(d);
  }, []);
  useEffect(() => {
    void Promise.resolve()
      .then(load)
      .catch((e) => setError(e.message));
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
      <h2>Contas e acessos</h2>
      <p>
        Crie acessos para a equipa. Entregue o convite pessoalmente ao
        destinatário por um canal seguro. A recuperação suspende o acesso actual
        e termina todas as sessões.
      </p>
      {error && <p role="alert">{error}</p>}
      {invite && (
        <output>
          <p>
            Convite criado. Válido por 24 horas; guarde-o antes de sair desta
            página.
          </p>
          <label>
            Ligação privada de activação
            <input readOnly value={invite} onFocus={(e) => e.target.select()} />
          </label>
        </output>
      )}
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
          Nome
          <input name="name" required minLength={2} maxLength={100} />
        </label>
        <label>
          Email
          <input name="email" type="email" required maxLength={254} />
        </label>
        <label>
          Nível de acesso
          <select name="role">
            <option value="agent">Agente</option>
            <option value="manager">Gestor</option>
            {data?.canCreateDirector && (
              <option value="director">Direcção</option>
            )}
          </select>
        </label>
        <label>
          Ligar a um agente já cadastrado (opcional)
          <select name="agentId">
            <option value="">Criar novo registo</option>
            {data?.agents.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </label>
        <button className="btn btn-primary" disabled={busy}>
          Criar conta e convite
        </button>
      </form>
      <div className="manager-table-scroll">
        <table>
          <thead>
            <tr>
              <th>Nome</th>
              <th>Email</th>
              <th>Acesso</th>
              <th>Estado</th>
              <th>Acções</th>
            </tr>
          </thead>
          <tbody>
            {data?.accounts.map((a) => (
              <tr key={a.id}>
                <td>{a.name}</td>
                <td>{a.email}</td>
                <td>{roleLabels[a.role]}</td>
                <td>{a.active ? 'Activo' : 'Inactivo / por activar'}</td>
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
                        {a.active ? 'Desactivar' : 'Activar'}
                      </button>
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
                        Novo convite / recuperar acesso
                      </button>
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
