'use client';
import { useCallback, useEffect } from 'react';
import { measurementBlocked } from '@/lib/measurement-consent';
/** Cookieless click totals. No view events, device IDs or visitor sessions. */
export function useProfileEngagement(username: string, enabled: boolean) {
  useEffect(() => {
    // Retire identifiers left by the former, consented profile tracker.
    try {
      localStorage.removeItem('framy-profile-visitor:' + username);
    } catch {
      /* Storage may be unavailable. */
    }
  }, [username]);
  const record = useCallback(
    (target = '') => {
      if (
        !enabled ||
        !target ||
        measurementBlocked() ||
        document.visibilityState !== 'visible'
      )
        return;
      void fetch('/api/profile-engagement', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'aggregate',
          username,
          kind: 'action',
          target,
        }),
        keepalive: true,
        signal: AbortSignal.timeout(8000),
      }).catch(() => {});
    },
    [username, enabled],
  );
  return { record };
}
export { ProfileEngagementPanel } from './customer-analytics';
