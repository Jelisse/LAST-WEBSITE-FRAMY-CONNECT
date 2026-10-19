'use client';
import { useEffect, useState } from 'react';
import Link from './hard-link';
import { useI18n } from './language-provider';
export function CorporateInvite() {
  const { t } = useI18n();
  const [token, setToken] = useState(''),
    [message, setMessage] = useState(''),
    [busy, setBusy] = useState(false),
    [done, setDone] = useState(false);
  const [info, setInfo] = useState<{
    organisation: string;
    role: string;
    team: string;
    newAccount: boolean;
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
      <h1>{t('Confirmar convite corporativo')}</h1>
      {info && (
        <>
          <h2>{info.organisation}</h2>
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
      {done ? (
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
                  confirmed: f.get('confirmed') === 'on',
                }),
              });
              const b = (await r.json()) as {
                error?: string;
                signIn?: boolean;
              };
              if (!r.ok) throw Error(b.error);
              try {
                sessionStorage.removeItem('framy-corporate-invite');
              } catch {
                /* Optional storage. */
              }
              setMessage(
                b.signIn
                  ? 'Email confirmado. Entre com a sua nova palavra-passe.'
                  : 'Convite confirmado.',
              );
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
          {info?.newAccount && (
            <label>
              {t('Nova palavra-passe para uma conta nova')}
              <input
                name="password"
                type="password"
                autoComplete="new-password"
                minLength={12}
                maxLength={72}
                required
              />
            </label>
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
              'Confirmo a associação e a partilha dos resultados da organização.',
            )}
          </label>
          <button disabled={busy || !token || !info}>{t('Confirmar')}</button>
          <Link href="/entrar?return_to=%2Fcorporativo%2Faceitar">
            {t('Entrar na conta existente')}
          </Link>
        </form>
      )}
    </main>
  );
}
