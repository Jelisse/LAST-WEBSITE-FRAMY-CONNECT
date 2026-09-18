'use client';
import { useI18n, LanguageSelector } from '@/components/language-provider';

import { useState } from 'react';
import Link from '@/components/hard-link';
import '../entrar/style.css';
export default function Page() {
  const { t } = useI18n();
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [done, setDone] = useState(false);
  return (
    <main id="main" className="auth-page">
      <section className="auth-card">
        <LanguageSelector />
        <h1>{t('Activar o meu acesso')}</h1>
        {done ? (
          <>
            <p>
              {t(
                'Conta activada. Já pode iniciar sessão com o seu email e a nova palavra-passe.',
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
                const token = location.hash.slice(1);
                const r = await fetch('/api/activate', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    token,
                    password: form.get('password'),
                  }),
                });
                const d = (await r.json()) as { error?: string };
                if (!r.ok) throw Error(d.error);
                history.replaceState(null, '', '/activar');
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
                'Defina a sua palavra-passe. O convite é pessoal, válido por 24 horas e só pode ser usado uma vez.',
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
            {error && <p role="alert">{t(error)}</p>}
            <button disabled={busy}>
              {busy ? t('A activar…') : t('Activar conta')}
            </button>
          </form>
        )}
      </section>
    </main>
  );
}
