'use client';
import { PasswordInput } from '@/components/password-input';
import { useI18n, LanguageSelector } from '@/components/language-provider';

import { useState, useEffect } from 'react';
import Link from '@/components/hard-link';
import '../entrar/style.css';
export default function Page() {
  const { t } = useI18n();
  const [token, setToken] = useState('');
  const [ready, setReady] = useState(false);
  const [sent, setSent] = useState(false);
  useEffect(() => {
    const value = location.hash.slice(1);
    queueMicrotask(() => {
      setToken(/^[a-f0-9]{64}$/.test(value) ? value : '');
      setReady(true);
    });
    history.replaceState(null, '', '/recuperar');
  }, []);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [done, setDone] = useState(false);
  return (
    <main id="main" className="auth-page">
      <section className="auth-card">
        <LanguageSelector />
        <h1>{t('Recuperar o meu acesso')}</h1>
        {!ready ? (
          <p>{t('A carregar…')}</p>
        ) : done ? (
          <>
            <p>
              {t(
                'Palavra-passe actualizada. As sessões anteriores foram terminadas. Inicie sessão com o email indicado na mensagem de recuperação.',
              )}
            </p>
            <Link href="/entrar">{t('Iniciar sessão')}</Link>
          </>
        ) : !token ? (
          <form
            onSubmit={async (event) => {
              event.preventDefault();
              setBusy(true);
              setError('');
              const form = new FormData(event.currentTarget);
              try {
                const response = await fetch('/api/account-recovery', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    action: 'request',
                    email: form.get('email'),
                  }),
                  signal: AbortSignal.timeout(15000),
                });
                const body = (await response.json()) as { error?: string };
                if (!response.ok) throw Error(body.error || 'Tente novamente.');
                setSent(true);
              } catch (error) {
                setError(
                  error instanceof Error ? error.message : 'Tente novamente.',
                );
              } finally {
                setBusy(false);
              }
            }}
          >
            <p>
              {t(
                'Indique o email da sua conta. Enviaremos uma ligação pessoal para definir uma nova palavra-passe, válida por 30 minutos.',
              )}
            </p>
            {sent ? (
              <output>
                {t(
                  'Se existir uma conta activa com este email, receberá uma ligação de recuperação. Verifique também o spam.',
                )}
              </output>
            ) : (
              <>
                <label>
                  {t('Email')}
                  <input
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    maxLength={254}
                  />
                </label>
                <button disabled={busy}>
                  {busy ? t('Aguarde…') : t('Enviar ligação de recuperação')}
                </button>
              </>
            )}
            {error && <p role="alert">{t(error)}</p>}
            <Link href="/entrar">{t('Iniciar sessão')}</Link>
          </form>
        ) : (
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setBusy(true);
              setError('');
              const form = new FormData(e.currentTarget);
              try {
                if (form.get('password') !== form.get('confirm'))
                  throw Error('As palavras-passe não coincidem.');

                const r = await fetch('/api/account-recovery', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    action: 'reset',
                    token,
                    password: form.get('password'),
                  }),
                });
                const d = (await r.json()) as { error?: string };
                if (!r.ok) throw Error(d.error);
                setToken('');
                setDone(true);
              } catch (e) {
                setError(e instanceof Error ? e.message : 'Tente novamente.');
              } finally {
                setBusy(false);
              }
            }}
          >
            <p>
              {t(
                'Escolha uma nova palavra-passe. A ligação é pessoal, válida por 30 minutos e só pode ser usada uma vez.',
              )}
            </p>
            <label>
              {t('Nova palavra-passe')}
              <PasswordInput
                name="password"

                required
                minLength={12}
                maxLength={72}
                autoComplete="new-password"
              />
            </label>
            <label>
              {t('Repetir palavra-passe')}
              <PasswordInput
                name="confirm"

                required
                minLength={12}
                maxLength={72}
                autoComplete="new-password"
              />
            </label>
            {!token && (
              <p role="alert">
                {t(
                  'Abra a ligação recebida por email. Se expirou, peça uma nova ligação à gestão.',
                )}
              </p>
            )}
            {error && <p role="alert">{t(error)}</p>}
            <button disabled={busy || !token}>
              {busy ? t('A guardar…') : t('Guardar nova palavra-passe')}
            </button>
            <button
              type="button"
              className="auth-switch"
              disabled={busy}
              onClick={() => {
                setToken('');
                setError('');
                setSent(false);
              }}
            >
              {t('Pedir uma nova ligação')}
            </button>
          </form>
        )}
      </section>
    </main>
  );
}
