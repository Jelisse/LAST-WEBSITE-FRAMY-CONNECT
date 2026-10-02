'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useI18n } from './language-provider';
import {
  readConsent,
  writeConsent,
  measurementBlocked,
  consentChanged,
} from '@/lib/measurement-consent';
const consentKey = 'framy-profile-measurement:';
const blocked = measurementBlocked;
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
      session.current ||= crypto.randomUUID();
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
    try {
      writeConsent(value, consentKey + username);
    } catch {
      /* in-memory preference */
    }
    setConsent(readConsent(consentKey + username) ?? '');
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
  return (
    <aside className="profile-measurement">
      {consent ? (
        <button type="button" onClick={() => choose('')}>
          {english ? 'Measurement preferences' : t('Preferências de medição')}
        </button>
      ) : (
        <>
          <p>
            {english
              ? 'Allow this profile owner to count visits and clicks? This is optional. We do not share your identity or contact details.'
              : t(
                  'Permitir a contagem de visitas e cliques para o titular deste perfil? É opcional. Não partilhamos a sua identidade ou os seus contactos.',
                )}
          </p>
          <div>
            <button type="button" onClick={() => choose('no')}>
              {english ? 'Decline' : t('Recusar')}
            </button>
            <button type="button" onClick={() => choose('yes')}>
              {english ? 'Allow' : t('Permitir')}
            </button>
          </div>
        </>
      )}
    </aside>
  );
}
export { ProfileEngagementPanel } from './customer-analytics';
