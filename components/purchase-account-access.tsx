'use client';

import { useState } from 'react';
import { useI18n } from './language-provider';

export function PurchaseAccountAccess({ productId }: { productId: string }) {
  const { t } = useI18n();
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  return <form className="purchase-account-access" onSubmit={async event => {
    event.preventDefault();
    setError('');
    setBusy(true);
    try {
      const response = await fetch('/api/auth', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(15_000),
        body: JSON.stringify({ action: 'resolve-account', email }),
      });
      const result = await response.json() as { mode?: 'login' | 'register'; error?: string };
      if (!response.ok || !['login', 'register'].includes(result.mode ?? ''))
        throw Error(result.error || 'Tente novamente.');
      try {
        sessionStorage.setItem('framy-auth-prefill', JSON.stringify({ email: email.trim(), expires: Date.now() + 600_000 }));
      } catch { /* Sign-in still works when browser storage is unavailable. */ }
      const query = new URLSearchParams({ return_to: '/encomendar/' + productId });
      if (result.mode === 'register') query.set('mode', 'register');
      location.assign('/entrar?' + query.toString());
    } catch (error) {
      setError(error instanceof Error && error.name !== 'TimeoutError' ? error.message : 'Tente novamente.');
      setBusy(false);
    }
  }}>
    <label>
      {t('Email')}
      <input type="email" name="email" autoComplete="email" required maxLength={254}
        value={email} disabled={busy}
        onChange={event => { setEmail(event.target.value); setError(''); }} />
    </label>
    <p className="muted">{t('Indique o seu email para continuar com a opção certa para si.')}</p>
    {error && <p role="alert">{t(error)}</p>}
    <button type="submit" className="btn btn-primary" disabled={busy}>
      {busy ? t('Aguarde…') : t('Continuar')}
    </button>
  </form>;
}
