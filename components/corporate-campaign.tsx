'use client';
import { PhoneInput } from './phone-input';
import { useEffect, useRef, useState } from 'react';
import Link from './hard-link';
import { useI18n } from './language-provider';
import { measurementBlocked } from '@/lib/measurement-consent';
type Info = {
  name: string;
  organisation: string;
  campaign: string;
  username: string | null;
};
export function CorporateCampaign({ id }: { id: string }) {
  const { t } = useI18n();
  const [info, setInfo] = useState<Info | null>(null),
    [message, setMessage] = useState(''),
    [busy, setBusy] = useState(false),
    [done, setDone] = useState(false);
  const requestId = useRef('');
  useEffect(() => {
    let cancelled = false;
    void fetch('/api/corporate-public?assignment=' + encodeURIComponent(id), {
      cache: 'no-store',
    })
      .then(async (r) => {
        const b = (await r.json()) as Info;
        if (!r.ok) throw Error('Campanha indisponível.');
        if (!cancelled) setInfo(b);
      })
      .catch((e) => {
        if (!cancelled) setMessage(e.message);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);
  return (
    <main id="main" className="corporate-dashboard corporate-public">
      <h1>{info?.organisation || t('Contacto da equipa')}</h1>
      {message && <output>{t(message)}</output>}
      {info && (
        <>
          <h2>{info.name}</h2>
          <p>{info.campaign}</p>
          {info.username && (
            <Link
              className="btn btn-primary"
              href={
                '/' +
                encodeURIComponent(info.username) +
                '?corporate=' +
                encodeURIComponent(id)
              }
              onClick={() => {
                if (!measurementBlocked())
                  void fetch('/api/corporate-public', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      action: 'metric',
                      assignment: id,
                      target: 'profile_open',
                    }),
                    keepalive: true,
                  }).catch(() => {});
              }}
            >
              {t('Abrir perfil')}
            </Link>
          )}
          {!done && (
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const f = new FormData(e.currentTarget);
                setBusy(true);
                requestId.current ||= crypto.randomUUID();
                try {
                  const r = await fetch('/api/corporate-public', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      action: 'lead',
                      assignment: id,
                      requestId: requestId.current,
                      name: f.get('name'),
                      email: f.get('email'),
                      phone: f.get('phone'),
                      interest: f.get('interest'),
                      consent: f.get('consent') === 'on',
                    }),
                  });
                  const b = (await r.json()) as { error?: string };
                  if (!r.ok) throw Error(b.error);
                  setDone(true);
                  setMessage('Contacto enviado.');
                } catch (e) {
                  setMessage(
                    e instanceof Error ? e.message : 'Não foi possível enviar.',
                  );
                } finally {
                  setBusy(false);
                }
              }}
            >
              <h2>{t('Deixar o meu contacto')}</h2>
              <p>{t('Indique email ou telefone.')}</p>
              <label>
                {t('Nome')}
                <input
                  name="name"
                  maxLength={100}
                  required
                  autoComplete="name"
                />
              </label>
              <label>
                {t('Email')}
                <input
                  name="email"
                  type="email"
                  maxLength={254}
                  autoComplete="email"
                />
              </label>
              <label>
                {t('Telefone')}
                <PhoneInput
                  name="phone"

                  maxLength={40}
                  autoComplete="tel"
                />
              </label>
              <label>
                {t('Interesse')}
                <textarea name="interest" maxLength={500} />
              </label>
              <label>
                <input type="checkbox" name="consent" required />
                {t(
                  'Autorizo o envio destes dados à organização indicada para responder ao meu interesse. Os dados ficam disponíveis durante 90 dias.',
                )}
              </label>
              <button disabled={busy}>{t('Enviar contacto')}</button>
            </form>
          )}
          <Link href="/privacidade">{t('Privacidade')}</Link>
        </>
      )}
    </main>
  );
}
