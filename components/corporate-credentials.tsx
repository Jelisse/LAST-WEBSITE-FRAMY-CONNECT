'use client';
import { useState } from 'react';
import { useI18n } from './language-provider';
import { PasswordInput } from './password-input';
export type ManagedEmployee = {
  account_id: string;
  name: string;
  email: string;
  role: string;
  active: number;
  left_at?: number | null;
  managed_access?: number;
  provisioned_at?: number | null;
  credential_version?: number;
};
export function CorporateCredentials({
  organisation,
  members,
  owner,
  reload,
}: {
  organisation: string;
  members: ManagedEmployee[];
  owner: boolean;
  reload: () => Promise<void>;
}) {
  const { t } = useI18n();
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [notice, setNotice] = useState('');
  const eligible = members.filter(
    (m) =>
      m.managed_access &&
      m.active &&
      !m.left_at &&
      (m.role === 'member' || owner),
  );
  if (!eligible.length) return null;
  return (
    <details className="corporate-panel">
      <summary>
        {t('Acessos autorizados: criar ou redefinir palavra-passe')}
      </summary>
      <p>
        {t(
          'Apenas contas novas autorizadas pelo trabalhador. Defina uma palavra-passe e entregue-a em privado; a Framy Connect não a mostra nem a envia por email. O trabalhador pode alterar a palavra-passe em Segurança da conta ou recuperar o acesso.',
        )}
      </p>
      {error && <p role="alert">{t(error)}</p>}
      {notice && <output aria-live="polite">{t(notice)}</output>}
      {eligible.map((m) => (
        <form
          key={m.account_id + ':' + m.credential_version}
          onSubmit={async (e) => {
            e.preventDefault();
            if (busy) return;
            const form = e.currentTarget,
              f = new FormData(form);
            setBusy(true);
            setError('');
            setNotice('');
            try {
              const r = await fetch('/api/corporate-employees', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  action: m.provisioned_at ? 'reset' : 'provision',
                  organisation,
                  accountId: m.account_id,
                  version: m.credential_version,
                  name: f.get('name'),
                  password: f.get('password'),
                }),
                signal: AbortSignal.timeout(20000),
              });
              const b = (await r.json()) as { error?: string };
              if (!r.ok) throw Error(b.error);
              form.reset();
              setNotice(
                'Acesso guardado. Entregue a palavra-passe ao trabalhador em privado.',
              );
              await reload();
            } catch (e) {
              setError(
                e instanceof Error ? e.message : 'Não foi possível guardar.',
              );
            } finally {
              setBusy(false);
            }
          }}
        >
          <strong>
            {m.email} ·{' '}
            {t(m.provisioned_at ? 'Conta criada' : 'Autorização confirmada')}
          </strong>
          <label>
            {t('Nome')}
            <input
              name="name"
              defaultValue={m.name}
              required
              maxLength={100}
              disabled={busy}
            />
          </label>
          <label>
            {t('Nova palavra-passe')}
            <PasswordInput
              name="password"
              required
              minLength={12}
              maxLength={72}
              autoComplete="new-password"
              disabled={busy}
            />
          </label>
          <label>
            <input name="confirmed" type="checkbox" required disabled={busy} />
            {t(
              'Confirmo que vou entregar esta palavra-passe ao trabalhador em privado.',
            )}
          </label>
          <button disabled={busy}>
            {t(
              m.provisioned_at
                ? 'Redefinir palavra-passe'
                : 'Criar acesso do trabalhador',
            )}
          </button>
        </form>
      ))}
    </details>
  );
}
