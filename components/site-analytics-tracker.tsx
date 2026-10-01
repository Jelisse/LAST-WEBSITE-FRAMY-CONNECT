'use client';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useI18n } from './language-provider';
import Link from '@/components/hard-link';
import {
  readConsent,
  writeConsent,
  consentChanged,
  measurementBlocked,
} from '@/lib/measurement-consent';
import {
  analyticsPath,
  cleanReferrer,
  safeCampaign,
} from '@/lib/site-analytics';
const sessionKey = 'framy-analytics-session';
let listening = false;
const pendingSteps: { kind: string; step: number; path: string; at: number }[] =
  [];
export function emitCheckoutAnalytics(
  kind: 'step' | 'submitted' | 'checkout_error',
  step = -1,
) {
  try {
    if (readConsent() !== 'yes') return;
  } catch {
    return;
  }
  const detail = { kind, step, path: location.pathname, at: Date.now() };
  if (!listening) {
    if (pendingSteps.length < 12) pendingSteps.push(detail);
    return;
  }
  window.dispatchEvent(new CustomEvent('framy-analytics', { detail }));
}
export function SiteAnalyticsTracker() {
  const path = usePathname(),
    { t } = useI18n();
  const [consent, setConsent] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const publicPath = analyticsPath(path);
  useEffect(() => {
    const disabled = measurementBlocked();
    let saved: string | null = null;
    try {
      saved = readConsent();
    } catch {
      /* no storage, no collection */
    }
    queueMicrotask(() => {
      setBlocked(disabled);
      setConsent(saved);
      setLoaded(true);
    });
    const sync = () => {
      try {
        setConsent(readConsent());
      } catch {
        setConsent('no');
      }
    };
    window.addEventListener('storage', sync);
    window.addEventListener(consentChanged, sync);
    return () => {
      window.removeEventListener('storage', sync);
      window.removeEventListener(consentChanged, sync);
    };
  }, []);
  useEffect(() => {
    if (!publicPath || consent !== 'yes' || blocked) return;
    let cancelled = false,
      pageSent = false,
      lcp: number | null = null;
    const pageId = crypto.randomUUID();
    function send(
      kind: string,
      id = crypto.randomUUID(),
      step = -1,
      at = Date.now(),
    ) {
      if (cancelled || document.visibilityState !== 'visible') return;
      try {
        if (readConsent() !== 'yes') return;
        const saved = JSON.parse(localStorage.getItem(sessionKey) || 'null');
        const session =
          saved?.expires > Date.now() && /^[0-9a-f-]{36}$/.test(saved.id)
            ? saved.id
            : crypto.randomUUID();
        localStorage.setItem(
          sessionKey,
          JSON.stringify({ id: session, expires: Date.now() + 1800000 }),
        );
        const nav = performance.getEntriesByType('navigation')[0] as
          | PerformanceNavigationTiming
          | undefined;
        const body = {
          id,
          session,
          kind,
          step,
          at,
          path: publicPath,
          consent: true,
          referrer: cleanReferrer(document.referrer),
          campaign: safeCampaign(
            new URLSearchParams(location.search).get('utm_campaign'),
          ),
          device: /iPad|Tablet/i.test(navigator.userAgent)
            ? 'tablet'
            : /Mobi|Android/i.test(navigator.userAgent)
              ? 'mobile'
              : 'desktop',
          ...(kind === 'performance'
            ? {
                load: nav && nav.loadEventEnd > 0 ? nav.loadEventEnd : null,
                lcp,
              }
            : {}),
        };
        void fetch('/api/site-analytics', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
          keepalive: true,
          signal: AbortSignal.timeout(8000),
        }).catch(() => {});
      } catch {
        /* Analytics must never interrupt the customer journey. */
      }
    }
    const page = () => {
      if (!pageSent && document.visibilityState === 'visible') {
        pageSent = true;
        send('page', pageId);
        window.dispatchEvent(new Event('framy-analytics-enabled'));
      }
    };
    const initial = window.setTimeout(page, 1500);
    const timer = window.setInterval(() => {
      page();
      send('pulse');
    }, 60000);
    const visible = () => {
      if (document.visibilityState === 'visible') {
        if (!pageSent) page();
        else send('pulse');
      }
    };
    const custom = (event: Event) => {
      const d = (event as CustomEvent).detail;
      if (d && ['step', 'submitted', 'checkout_error'].includes(d.kind)) {
        page();
        send(d.kind, crypto.randomUUID(), d.step, d.at);
      }
    };
    let observer: PerformanceObserver | undefined;
    try {
      observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) lcp = entry.startTime;
      });
      observer.observe({ type: 'largest-contentful-paint', buffered: true });
    } catch {
      /* unsupported metric */
    }
    const perfTimer = window.setTimeout(() => {
      if (pageSent) send('performance', pageId);
    }, 15000);
    document.addEventListener('visibilitychange', visible);
    window.addEventListener('framy-analytics', custom);
    listening = true;
    for (const event of pendingSteps.splice(0)) {
      if (event.path === publicPath)
        send(event.kind, crypto.randomUUID(), event.step, event.at);
    }
    return () => {
      listening = false;
      cancelled = true;
      clearTimeout(initial);
      clearTimeout(perfTimer);
      clearInterval(timer);
      observer?.disconnect();
      document.removeEventListener('visibilitychange', visible);
      window.removeEventListener('framy-analytics', custom);
    };
  }, [publicPath, consent, blocked]);
  function choose(value: string) {
    try {
      setConsent(writeConsent(value));
      if (value !== 'yes') pendingSteps.length = 0;
    } catch {
      setConsent('no');
    }
  }
  if (!publicPath || !loaded || blocked) return null;
  if (consent)
    return (
      <div className="analytics-preferences">
        <button type="button" onClick={() => choose('')}>
          {t('Preferências de estatísticas')}
        </button>
      </div>
    );
  return (
    <aside
      className="analytics-consent"
      aria-label={t('Estatísticas opcionais')}
    >
      <strong>{t('Ajude-nos a melhorar a experiência')}</strong>
      <p>
        {t(
          'Podemos medir visitas, carregamento e etapas da compra? Não recolhemos nomes, formulários ou dados de pagamento. Pode alterar a escolha no rodapé.',
        )}
      </p>
      <p>
        <Link href="/privacidade#cookies">
          {t('Cookies e armazenamento no dispositivo')}
        </Link>
      </p>
      <div>
        <button type="button" onClick={() => choose('no')}>
          {t('Recusar')}
        </button>
        <button type="button" onClick={() => choose('yes')}>
          {t('Permitir estatísticas')}
        </button>
      </div>
    </aside>
  );
}
