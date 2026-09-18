'use client';
import { useI18n, LanguageSelector } from '@/components/language-provider';

import { useState } from 'react';
import Link from '@/components/hard-link';
import { clearPrivateDeviceData } from '@/lib/client-privacy';
import '../entrar/style.css';
export default function Page() {
  const { t } = useI18n();
  const [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  async function post(body: Record<string, unknown>) {
    setBusy(true);
    setError('');
    try {
      const r = await fetch('/api/security', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const d = (await r.json()) as { error?: string };
      if (!r.ok) throw Error(d.error);
      try {
        clearPrivateDeviceData();
      } catch {
        /* Storage unavailable. */
      }
      location.assign('/entrar');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Tente novamente.');
      setBusy(false);
    }
  }
  return (
    <main id="main" className="auth-page">
      <section className="auth-card">
        <LanguageSelector />
        <Link href="/dashboard">{t('A minha conta')}</Link>
        <h1>{t('Segurança da conta')}</h1>
        <p>
          {t(
            'Alterar a palavra-passe termina todas as sessões, incluindo esta.',
          )}
        </p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const data = new FormData(e.currentTarget);
            if (data.get('password') !== data.get('confirm')) {
              setError('As palavras-passe não coincidem.');
              return;
            }
            void post({
              action: 'password',
              currentPassword: data.get('current'),
              password: data.get('password'),
            });
          }}
        >
          <label>
            {t('Palavra-passe actual')}
            <input
              type="password"
              name="current"
              required
              maxLength={72}
              autoComplete="current-password"
            />
          </label>
          <label>
            {t('Nova palavra-passe')}
            <input
              type="password"
              name="password"
              required
              minLength={12}
              maxLength={72}
              autoComplete="new-password"
            />
          </label>
          <label>
            {t('Repetir nova palavra-passe')}
            <input
              type="password"
              name="confirm"
              required
              minLength={12}
              maxLength={72}
              autoComplete="new-password"
            />
          </label>
          <button disabled={busy}>{t('Alterar palavra-passe')}</button>
        </form>
        {error && <p role="alert">{t(error)}</p>}
        <button
          disabled={busy}
          onClick={() => void post({ action: 'logout-all' })}
        >
          {t('Terminar sessão em todos os dispositivos')}
        </button>
      </section>
    </main>
  );
}
