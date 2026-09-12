'use client';
import { useState } from 'react';
import Link from '@/components/hard-link';
export function LoginForm() {
  const [register, setRegister] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  return (
    <main id="main" className="auth-page">
      <section className="auth-card">
        <Link href="/">Framy Connect</Link>
        <h1>{register ? 'Criar a minha conta' : 'Bem-vindo à Framy'}</h1>
        <p>
          {register
            ? 'Guarde o seu perfil e acompanhe os seus pedidos.'
            : 'Entre para abrir o seu dashboard.'}
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
              Nome completo
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
            Email
            <input
              name="email"
              type="email"
              required
              autoComplete="email"
              maxLength={254}
            />
          </label>
          <label>
            Palavra-passe
            <input
              name="password"
              type="password"
              required
              minLength={12}
              maxLength={72}
              autoComplete={register ? 'new-password' : 'current-password'}
            />
          </label>
          {register && <small>Use pelo menos 12 caracteres.</small>}
          {error && <p role="alert">{error}</p>}
          <button disabled={busy} type="submit">
            {busy
              ? 'Aguarde…'
              : register
                ? 'Criar conta e continuar'
                : 'Entrar'}
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
          {register ? 'Já tenho conta' : 'Sou novo — criar conta'}
        </button>
      </section>
    </main>
  );
}
