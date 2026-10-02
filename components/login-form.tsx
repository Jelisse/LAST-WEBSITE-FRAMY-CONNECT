'use client';
import { useI18n, LanguageSelector } from '@/components/language-provider';

import { useEffect, useRef, useState } from 'react';
import Link from '@/components/hard-link';
import { PasswordInput } from './password-input';
export function LoginForm({
  initialRegister = false,
  purchaseReturn,
}: {
  initialRegister?: boolean;
  purchaseReturn?: string;
}) {
  const { t } = useI18n();
  const emailInput = useRef<HTMLInputElement>(null);
  useEffect(() => {
    try {
      const saved = JSON.parse(
        sessionStorage.getItem('framy-auth-prefill') || 'null',
      );
      if (
        saved &&
        typeof saved.email === 'string' &&
        saved.expires > Date.now() &&
        emailInput.current
      )
        emailInput.current.value = saved.email;
      sessionStorage.removeItem('framy-auth-prefill');
    } catch {
      /* Prefilling is optional. */
    }
  }, []);
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
          {purchaseReturn
            ? t('Após entrar, voltará à sua encomenda.')
            : register
              ? t('Guarde o seu perfil e acompanhe os seus pedidos.')
              : t('Entre para abrir o seu painel.')}
        </p>
        <form
          aria-busy={busy}
          onSubmit={async (e) => {
            e.preventDefault();
            if (busy) return;
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
                signal: AbortSignal.timeout(15000),
              });
              const b = (await r.json()) as { error: string; next: string };
              if (!r.ok) throw Error(b.error);
              location.assign(b.next);
            } catch (e) {
              setError(
                e instanceof Error &&
                  !['TimeoutError', 'TypeError', 'AbortError'].includes(e.name)
                  ? e.message
                  : 'Não foi possível ligar. Verifique a ligação e tente novamente.',
              );
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
              ref={emailInput}
              type="email"
              required
              autoComplete="email"
              maxLength={254}
            />
          </label>
          <label>
            {t('Palavra-passe')}
            <PasswordInput
              key={register ? 'register-password' : 'login-password'}
              name="password"
              required
              minLength={12}
              maxLength={72}
              autoComplete={register ? 'new-password' : 'current-password'}
            />
          </label>
          {!register && (
            <Link className="auth-forgot" href="/recuperar">
              {t('Esqueci-me da palavra-passe')}
            </Link>
          )}
          {register && <small>{t('Use pelo menos 12 caracteres.')}</small>}
          {error && <p role="alert">{t(error)}</p>}
          <button disabled={busy} type="submit">
            {busy
              ? t(register ? 'A criar conta…' : 'A entrar…')
              : register
                ? t('Criar conta e continuar')
                : t('Entrar')}
          </button>
        </form>
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
        {purchaseReturn && (
          <Link className="auth-return" href={purchaseReturn}>
            {t('Voltar à encomenda')}
          </Link>
        )}
      </section>
    </main>
  );
}
