'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useI18n } from './language-provider';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from './ui/dialog';
import {
  readConsent,
  writeConsent,
  measurementBlocked,
  consentChanged,
} from '@/lib/measurement-consent';
const consentKey = 'framy-profile-measurement:v2:';
const blocked = measurementBlocked;
const visitorKey = 'framy-profile-visitor:';
function visitorSession(username: string) {
  try {
    const stored = JSON.parse(
      localStorage.getItem(visitorKey + username) ?? 'null',
    ) as { id: string; at: number } | null;
    if (
      stored &&
      /^[a-f0-9-]{36}$/.test(stored.id) &&
      Date.now() - stored.at < 90 * 86400000 &&
      stored.at <= Date.now()
    )
      return stored.id;
    const next = { id: crypto.randomUUID(), at: Date.now() };
    localStorage.setItem(visitorKey + username, JSON.stringify(next));
    return next.id;
  } catch {
    return crypto.randomUUID();
  }
}
export function useProfileEngagement(username: string, enabled: boolean) {
  const [consent, setConsent] = useState('pending');
  const session = useRef(''),
    viewed = useRef('');
  useEffect(() => {
    let value = '';
    try {
      value = readConsent(consentKey + username) ?? '';
    } catch {
      /* no storage, ask */
    }
    queueMicrotask(() => setConsent(blocked() ? 'blocked' : value));
    const sync = () => {
      setConsent(
        blocked() ? 'blocked' : (readConsent(consentKey + username) ?? ''),
      );
      session.current = '';
      viewed.current = '';
      if (readConsent(consentKey + username) !== 'yes') {
        try {
          localStorage.removeItem(visitorKey + username);
        } catch {
          /* Storage unavailable. */
        }
      }
    };
    window.addEventListener('storage', sync);
    window.addEventListener(consentChanged, sync);
    return () => {
      window.removeEventListener('storage', sync);
      window.removeEventListener(consentChanged, sync);
    };
  }, [username]);
  const record = useCallback(
    (target = '') => {
      if (
        !enabled ||
        consent !== 'yes' ||
        blocked() ||
        document.visibilityState !== 'visible'
      )
        return;
      try {
        if (readConsent(consentKey + username) !== 'yes') return;
      } catch {
        return;
      }
      session.current ||= visitorSession(username);
      void fetch('/api/profile-engagement', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: crypto.randomUUID(),
          session: session.current,
          consent: true,
          username,
          kind: target ? 'action' : 'view',
          target,
        }),
        keepalive: true,
        signal: AbortSignal.timeout(8000),
      }).catch(() => {});
    },
    [username, enabled, consent],
  );
  useEffect(() => {
    const visit = () => {
      if (
        enabled &&
        consent === 'yes' &&
        document.visibilityState === 'visible' &&
        viewed.current !== username
      ) {
        viewed.current = username;
        record();
      }
    };
    visit();
    document.addEventListener('visibilitychange', visit);
    return () => document.removeEventListener('visibilitychange', visit);
  }, [record, consent, enabled, username]);
  const choose = (value: string) => {
    if (value !== 'yes') {
      session.current = '';
      try {
        localStorage.removeItem(visitorKey + username);
      } catch {
        /* Storage unavailable. */
      }
    }
    try {
      writeConsent(value, consentKey + username);
    } catch {
      /* in-memory preference */
    }
    setConsent(value);
  };
  return { consent, choose, record };
}
export function ProfileMeasurementChoice({
  consent,
  choose,
  english = false,
}: {
  consent: string;
  english?: boolean;
  choose: (value: string) => void;
}) {
  const { t } = useI18n();
  if (consent === 'pending' || consent === 'blocked') return null;
  if (consent) return (
    <button type="button" className="sr-only focus:not-sr-only" onClick={() => choose('')}>
      {english ? 'Measurement preferences' : t('Preferências de medição')}
    </button>
  );
  return (
    <aside className="profile-measurement">
      {consent ? (
        <button type="button" onClick={() => choose('')}>
          {english ? 'Measurement preferences' : t('Preferências de medição')}
        </button>
      ) : (
        <Dialog open onOpenChange={(open) => { if (!open) choose('no'); }}>
          <DialogContent className="profile-consent-dialog" showCloseButton={false}>
          <DialogTitle className="sr-only">{english ? 'Measurement preferences' : t('Preferências de medição')}</DialogTitle>
          <DialogDescription>
            {english
              ? 'Allow this profile owner to count visits and clicks? This is optional. We do not share your identity or contact details.'
              : t(
                  'Permitir a contagem de visitas e cliques para o titular deste perfil? É opcional. Não partilhamos a sua identidade ou os seus contactos.',
                )}
          </DialogDescription>
          <p>{english ? 'Connections appear as a public total. With your permission, a random identifier on this device prevents repeat counting for up to 90 days.' : t('As conexões aparecem como um total público. Com a sua autorização, um identificador aleatório neste dispositivo evita contagens repetidas por até 90 dias.')}</p>
          <div>
            <button type="button" onClick={() => choose('no')}>
              {english ? 'Decline' : t('Recusar')}
            </button>
            <button type="button" onClick={() => choose('yes')}>
              {english ? 'Allow' : t('Permitir')}
            </button>
          </div>
          </DialogContent>
        </Dialog>
      )}
    </aside>
  );
}
export { ProfileEngagementPanel } from './customer-analytics';
