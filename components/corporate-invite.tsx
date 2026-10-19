'use client';
import { useEffect, useState } from 'react';
import Link from './hard-link';
import { PasswordInput } from './password-input';
import { useI18n } from './language-provider';
export function CorporateInvite() {
  const { t } = useI18n();
  const [authorized, setAuthorized] = useState(false);
  const [token, setToken] = useState(''),
    [message, setMessage] = useState(''),
    [busy, setBusy] = useState(false),
    [done, setDone] = useState(false);
  const [info, setInfo] = useState<{
    organisation: string;
    inviterName?: string;
    name?: string;
    role: string;
    team: string;
    newAccount: boolean;
    mode?: string;
  } | null>(null);
  useEffect(() => {
    let value = location.hash.slice(1);
    try {
      value = value || sessionStorage.getItem('framy-corporate-invite') || '';
      if (/^[a-f0-9]{64}$/.test(value)) {
        sessionStorage.setItem('framy-corporate-invite', value);
        queueMicrotask(() => setToken(value));
      }
      history.replaceState(null, '', location.pathname);
    } catch {
      if (/^[a-f0-9]{64}$/.test(value)) queueMicrotask(() => setToken(value));
    }
  }, []);
  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    void fetch('/api/corporate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'inspect-invite', token }),
    })
      .then(async (r) => {
        const b = (await r.json()) as NonNullable<typeof info> & {
          error?: string;
        };
        if (!r.ok) throw Error(b.error);
        if (!cancelled) setInfo(b);
      })
      .catch((e) => {
        if (!cancelled) setMessage(e.message);
      });
    return () => {
      cancelled = true;
    };
  }, [token]);
  return (
    <main id="main" className="corporate-dashboard corporate-invite">
      <h1>
        {t(
          info?.mode === 'authorization'
            ? 'Autorizar criação de conta'
            : info?.newAccount
              ? 'Criar a minha conta de trabalhador'
              : 'Aceitar convite corporativo',
        )}
      </h1>
      {info && (
        <>
          <h2>{info.organisation}</h2>
          {info.inviterName && (
            <p>{t('Convite enviado por {0}', [info.inviterName])}</p>
          )}
          <p>
            {t(info.role === 'leader' ? 'Líder' : 'Trabalhador')} · {info.team}
          </p>
        </>
      )}
      <p>
        {t(
          'Ao aceitar, associa a sua conta à organização. Os líderes terão acesso apenas aos resultados e contactos dos links de campanha. O histórico pessoal não é partilhado.',
        )}
      </p>
      {message && <output>{t(message)}</output>}
      {done && authorized ? (
        <p>
          {t(
            'Pode fechar esta página. O líder irá criar o acesso e entregar a sua palavra-passe em privado. Depois poderá alterá-la em Segurança da conta.',
          )}
        </p>
      ) : done ? (
        <Link href="/corporativo">{t('Abrir equipa corporativa')}</Link>
      ) : (
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            setBusy(true);
            try {
              const r = await fetch('/api/corporate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  action: 'accept',
                  token,
                  password: f.get('password'),
                  name: info?.newAccount
                    ? (f.get('name') ?? undefined)
                    : undefined,
                  confirmed: f.get('confirmed') === 'on',
                }),
              });
              const b = (await r.json()) as {
                error?: string;
                signIn?: boolean;
                authorized?: boolean;
              };
              if (!r.ok) throw Error(b.error);
              try {
                sessionStorage.removeItem('framy-corporate-invite');
              } catch {
                /* Optional storage. */
              }
              setMessage(
                b.authorized
                  ? 'Autorização confirmada. O líder pode agora criar o seu acesso.'
                  : b.signIn
                    ? 'Email confirmado. Entre com a sua nova palavra-passe.'
                    : 'Convite confirmado.',
              );
              setAuthorized(!!b.authorized);
              setDone(true);
            } catch (e) {
              setMessage(
                e instanceof Error ? e.message : 'Não foi possível confirmar.',
              );
            } finally {
              setBusy(false);
            }
          }}
        >
          {info?.newAccount && info.mode !== 'authorization' && (
            <>
              <label>
                {t('Nome completo')}
                <input
                  name="name"
                  required
                  maxLength={100}
                  autoComplete="name"
                  defaultValue={info.name || ''}
                />
              </label>
              <label>
                {t('Nova palavra-passe para uma conta nova')}
                <PasswordInput
                  name="password"
                  autoComplete="new-password"
                  minLength={12}
                  maxLength={72}
                  required
                />
              </label>
            </>
          )}
          {!info?.newAccount && (
            <p>
              {t(
                'Se já tem conta, entre nessa conta antes de confirmar este convite.',
              )}
            </p>
          )}
          <label>
            <input name="confirmed" type="checkbox" required />
            {t(
              info?.mode === 'authorization'
                ? 'Autorizo o líder a criar a minha conta e a definir ou redefinir a palavra-passe. Confirmo a associação e a partilha dos resultados das campanhas.'
                : 'Confirmo a associação e a partilha dos resultados da organização.',
            )}
          </label>
          <button disabled={busy || !token || !info}>
            {t(
              info?.mode === 'authorization'
                ? 'Autorizar criação de conta'
                : info?.newAccount
                  ? 'Criar conta e aceitar convite'
                  : 'Aceitar convite',
            )}
          </button>
          <Link href="/entrar?return_to=%2Fcorporativo%2Faceitar">
            {t('Entrar na conta existente')}
          </Link>
        </form>
      )}
    </main>
  );
}
