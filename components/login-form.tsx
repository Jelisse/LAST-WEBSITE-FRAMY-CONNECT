'use client';
import { useI18n, LanguageSelector } from '@/components/language-provider';

import { useState } from 'react';
import Link from '@/components/hard-link';
export function LoginForm({
  initialRegister = false,
}: {
  initialRegister?: boolean;
}) {
  const { t } = useI18n();
  const [register, setRegister] = useState(initialRegister),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  return (
    <main id="main" className="auth-page">
      <section className="auth-card">
        <LanguageSelector />
        <Link href="/">{t('Framy Connect')}</Link>
        <h1>{register ? t('Criar a minha conta') : t('Bem-vindo à Framy')}</h1>
        <p>
          {register
            ? t('Guarde o seu perfil e acompanhe os seus pedidos.')
            : t('Entre para abrir o seu painel.')}
        </p>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setError('');
            const data = new FormData(e.currentTarget);
            try {
              const r = await fetch('/api/auth', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  action: register ? 'register' : 'login',
                  email: data.get('email'),
                  password: data.get('password'),
                  name: data.get('name'),
                  returnTo: new URLSearchParams(location.search).get(
                    'return_to',
                  ),
                }),
              });
              const b = (await r.json()) as { error: string; next: string };
              if (!r.ok) throw Error(b.error);
              location.assign(b.next);
            } catch (e) {
              setError(e instanceof Error ? e.message : 'Tente novamente.');
              setBusy(false);
            }
          }}
        >
          {register && (
            <label>
              {t('Nome completo')}
              <input
                name="name"
                required
                minLength={2}
                maxLength={100}
                autoComplete="name"
              />
            </label>
          )}
          <label>
            {t('Email')}
            <input
              name="email"
              type="email"
              required
              autoComplete="email"
              maxLength={254}
            />
          </label>
          <label>
            {t('Palavra-passe')}
            <input
              name="password"
              type="password"
              required
              minLength={12}
              maxLength={72}
              autoComplete={register ? 'new-password' : 'current-password'}
            />
          </label>
          {register && <small>{t('Use pelo menos 12 caracteres.')}</small>}
          {error && <p role="alert">{t(error)}</p>}
          <button disabled={busy} type="submit">
            {busy
              ? t('Aguarde…')
              : register
                ? t('Criar conta e continuar')
                : t('Entrar')}
          </button>
        </form>
        {!register && (
          <p>
            <a href="mailto:support@framyconnect.co.mz?subject=Recuperar%20acesso">
              {t('Esqueci-me da palavra-passe — contactar apoio')}
            </a>
          </p>
        )}
        <button
          className="auth-switch"
          disabled={busy}
          onClick={() => {
            setRegister(!register);
            setError('');
          }}
        >
          {register ? t('Já tenho conta') : t('Sou novo — criar conta')}
        </button>
      </section>
    </main>
  );
}
