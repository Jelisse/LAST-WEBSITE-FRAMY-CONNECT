'use client';
import { useI18n, LanguageSelector } from '@/components/language-provider';

import { useState, useEffect } from 'react';
import Link from '@/components/hard-link';
import '../entrar/style.css';
export default function Page() {
  const { t } = useI18n();
  const [token, setToken] = useState('');
  useEffect(() => {
    const value = location.hash.slice(1);
    queueMicrotask(() => setToken(/^[a-f0-9]{64}$/.test(value) ? value : ''));
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
        {done ? (
          <>
            <p>
              {t(
                'Palavra-passe actualizada. As sessões anteriores foram terminadas. Inicie sessão com o email indicado na mensagem de recuperação.',
              )}
            </p>
            <Link href="/entrar">{t('Iniciar sessão')}</Link>
          </>
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
                'Escolha uma nova palavra-passe. A ligação enviada pela gestão é pessoal, válida por 30 minutos e só pode ser usada uma vez.',
              )}
            </p>
            <label>
              {t('Nova palavra-passe')}
              <input
                name="password"
                type="password"
                required
                minLength={12}
                maxLength={72}
                autoComplete="new-password"
              />
            </label>
            <label>
              {t('Repetir palavra-passe')}
              <input
                name="confirm"
                type="password"
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
          </form>
        )}
      </section>
    </main>
  );
}
