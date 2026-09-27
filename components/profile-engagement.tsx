'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useI18n } from './language-provider';
const consentKey = 'framy-profile-measurement:';
function blocked() {
  return (
    navigator.doNotTrack === '1' ||
    (navigator as Navigator & { globalPrivacyControl?: boolean })
      .globalPrivacyControl === true
  );
}
export function useProfileEngagement(username: string, enabled: boolean) {
  const [consent, setConsent] = useState('pending');
  const session = useRef(''),
    viewed = useRef('');
  useEffect(() => {
    let value = '';
    try {
      value = localStorage.getItem(consentKey + username) ?? '';
    } catch {
      /* no storage, ask */
    }
    queueMicrotask(() => setConsent(blocked() ? 'blocked' : value));
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
        if (localStorage.getItem(consentKey + username) !== 'yes') return;
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
      localStorage.setItem(consentKey + username, value);
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
type Report = {
  summary: { views: number; sessions: number; actions: number };
  actions: { label: string; count: number }[];
  daily: { day: string; views: number; actions: number }[];
};
export function ProfileEngagementPanel() {
  const { t } = useI18n();
  const [days, setDays] = useState(30),
    [report, setReport] = useState<Report | null>(null),
    [error, setError] = useState('');
  useEffect(() => {
    const controller = new AbortController();
    queueMicrotask(() => {
      setReport(null);
      setError('');
    });
    void fetch('/api/profile-engagement?days=' + days, {
      cache: 'no-store',
      signal: AbortSignal.any([controller.signal, AbortSignal.timeout(15000)]),
    })
      .then(async (response) => {
        const result = (await response.json()) as Report & { error?: string };
        if (!response.ok)
          throw Error(
            result.error ?? 'Estatísticas temporariamente indisponíveis.',
          );
        return result;
      })
      .then((data) => {
        if (!controller.signal.aborted) setReport(data);
      })
      .catch((e) => {
        if (!controller.signal.aborted)
          setError(
            e instanceof Error
              ? e.message
              : 'Estatísticas temporariamente indisponíveis.',
          );
      });
    return () => controller.abort();
  }, [days]);
  return (
    <section className="profile-engagement-panel">
      <header>
        <div>
          <h2>{t('Resultados do meu perfil')}</h2>
          <p>
            {t('Veja como os visitantes interagem com o seu perfil digital.')}
          </p>
        </div>
        <label>
          {t('Período')}
          <select
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
          >
            {[7, 30, 90].map((d) => (
              <option key={d} value={d}>
                {t('Últimos {0} dias', [d])}
              </option>
            ))}
          </select>
        </label>
      </header>
      <p>
        {t(
          'Apenas visitas com consentimento. As suas próprias visitas e pré-visualizações são excluídas. Cliques indicam interesse, não vendas ou mensagens enviadas.',
        )}
      </p>
      {error ? (
        <p role="alert">{t(error)}</p>
      ) : !report ? (
        <output>{t('A carregar…')}</output>
      ) : (
        <>
          <div className="profile-metrics">
            {[
              [t('Visitas'), report.summary.views],
              [t('Cliques de interesse'), report.summary.actions],
            ].map(([label, value]) => (
              <article key={label}>
                <span>{label}</span>
                <strong>{value}</strong>
              </article>
            ))}
          </div>
          {!report.summary.views && !report.summary.actions ? (
            <p>
              {t(
                'Ainda não há actividade registada neste período. Partilhe o seu perfil publicado para começar.',
              )}
            </p>
          ) : (
            <>
              <h3>{t('Acções mais procuradas')}</h3>
              <ul className="profile-action-ranking">
                {report.actions.map((row) => (
                  <li key={row.label}>
                    <span>{t(row.label)}</span>
                    <strong>{row.count}</strong>
                  </li>
                ))}
              </ul>
              <details>
                <summary>{t('Ver actividade por dia')}</summary>
                <table>
                  <thead>
                    <tr>
                      <th>{t('Data')}</th>
                      <th>{t('Visitas')}</th>
                      <th>{t('Cliques')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.daily.map((row) => (
                      <tr key={row.day}>
                        <td>{row.day}</td>
                        <td>{row.views}</td>
                        <td>{row.actions}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </details>
            </>
          )}
          <small>
            {t(
              'Dias apresentados na hora de Maputo. Sessões são estimativas, não pessoas identificadas. Dados conservados por até 90 dias.',
            )}
          </small>
        </>
      )}
    </section>
  );
}
