'use client';
import { useEffect, useState } from 'react';
import {
  Eye,
  MousePointer2,
  Users,
  Download,
  RefreshCw,
  ArrowUpRight,
} from 'lucide-react';
import { useI18n } from './language-provider';
import { csvCell } from '@/lib/site-analytics';

type Report = {
  summary: { views: number; sessions: number; actions: number };
  actions: { label: string; count: number }[];
  daily: { day: string; views: number; actions: number }[];
  generatedAt?: number;
};
export function ProfileEngagementPanel({
  onEdit,
  onTools,
}: {
  onEdit?: () => void;
  onTools?: () => void;
}) {
  const { t } = useI18n();
  const [days, setDays] = useState(30);
  const [refresh, setRefresh] = useState(0);
  const [report, setReport] = useState<Report | null>(null);
  const [error, setError] = useState('');
  const [view, setView] = useState('chart');
  useEffect(() => {
    const controller = new AbortController();
    setReport(null);
    setError('');
    void fetch('/api/profile-engagement?days=' + days, {
      cache: 'no-store',
      signal: AbortSignal.any([controller.signal, AbortSignal.timeout(15000)]),
    })
      .then(async (r) => {
        const data = await r.json() as Report & { error?: string };
        if (!r.ok)
          throw Error(
            data.error ?? 'Estatísticas temporariamente indisponíveis.',
          );
        return data as Report;
      })
      .then((data) => {
        if (!controller.signal.aborted) setReport(data);
      })
      .catch((e) => {
        if (!controller.signal.aborted) setError(e.message);
      });
    return () => controller.abort();
  }, [days, refresh]);
  const now = report?.generatedAt ?? Date.now();
  // The endpoint uses a rolling window; include the partial first day in Maputo.
  const daily = Array.from({ length: days + 1 }, (_, i) => {
    const day = new Date(now + 7200000 - (days - i) * 86400000)
      .toISOString()
      .slice(0, 10);
    return (
      report?.daily.find((row) => row.day === day) ?? {
        day,
        views: 0,
        actions: 0,
      }
    );
  });
  const fmt = (n: number) => n.toLocaleString(t.locale);
  const date = (value: string) =>
    new Date(value + 'T12:00:00Z').toLocaleDateString(t.locale, {
      day: 'numeric',
      month: 'short',
      timeZone: 'Africa/Maputo',
    });
  const maximum = Math.ceil(Math.max(2, ...daily.flatMap((r) => [r.views, r.actions])) / 2) * 2;
  const line = (key: 'views' | 'actions') =>
    daily
      .map(
        (r, i) =>
          `${45 + (i * 650) / (daily.length - 1)},${220 - (r[key] / maximum) * 180}`,
      )
      .join(' ');
  function download() {
    const rows = [
      [t('Data'), t('Visitas'), t('Cliques')],
      ...daily.map((r) => [r.day, r.views, r.actions]),
    ];
    const blob = new Blob(
      ['\uFEFF' + rows.map((row) => row.map(csvCell).join(',')).join('\r\n')],
      { type: 'text/csv;charset=utf-8' },
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `framy-profile-${days}d.csv`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return (
    <section
      className="profile-engagement-panel customer-results"
      aria-busy={!report && !error}
    >
      <header>
        <div>
          <h2>{t('Resultados do meu perfil')}</h2>
          <p>
            {t(
              'Descubra o que atrai interesse e transforme os resultados em melhorias no perfil.',
            )}
          </p>
        </div>
        <div className="results-controls">
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
          <button
            onClick={() => setRefresh((v) => v + 1)}
            disabled={!report && !error}
            aria-label={t('Actualizar estatísticas')}
          >
            <RefreshCw size={18} />
          </button>
          <button onClick={download} disabled={!report}>
            <Download size={18} />
            {t('Exportar CSV')}
          </button>
        </div>
      </header>
      {error ? (
        <p role="alert">{t(error)}</p>
      ) : !report ? (
        <p role="status">{t('A carregar…')}</p>
      ) : (
        <>
          <div className="results-metrics">
            {[
              {
                label: 'Visitas',
                value: report.summary.views,
                Icon: Eye,
                help: 'Aberturas do perfil com consentimento.',
              },
              {
                label: 'Sessões estimadas',
                value: report.summary.sessions,
                Icon: Users,
                help: 'Sessões por dia; não representa pessoas únicas.',
              },
              {
                label: 'Cliques de interesse',
                value: report.summary.actions,
                Icon: MousePointer2,
                help: 'Cliques nos contactos, ligações e serviços.',
              },
            ].map(({ label, value, Icon, help }) => (
              <article key={label}>
                <Icon size={21} />
                <span>{t(label)}</span>
                <strong>{fmt(value)}</strong>
                <small>{t(help)}</small>
              </article>
            ))}
          </div>
          {!report.summary.views && !report.summary.actions && (
            <div className="results-guidance">
              <h3>{t('Comece a medir o interesse no seu perfil')}</h3>
              <p>
                {t(
                  'Publique o perfil e partilhe o seu link ou QR. Volte aqui para perceber quais os contactos e serviços mais procurados.',
                )}
              </p>
              {onEdit && (
                <button onClick={onEdit}>
                  {t('Editar perfil')}
                  <ArrowUpRight size={16} />
                </button>
              )}
            </div>
          )}
          <div className="results-grid">
            <article className="results-chart">
              <header>
                <div>
                  <h3>{t('Actividade ao longo do tempo')}</h3>
                  <p>
                    {t(
                      'Compare visitas e cliques para perceber os dias com mais interesse.',
                    )}
                  </p>
                </div>
                <div className="results-switch">
                  {['chart', 'table'].map((v) => (
                    <button
                      key={v}
                      aria-pressed={view === v}
                      onClick={() => setView(v)}
                    >
                      {t(v === 'chart' ? 'Gráfico' : 'Tabela')}
                    </button>
                  ))}
                </div>
              </header>
              {view === 'chart' ? (
                <>
                  <div className="results-legend">
                    <span>● {t('Visitas')}</span>
                    <span>◆ {t('Cliques')}</span>
                  </div>
                  <svg
                    viewBox="0 0 740 260"
                    role="img"
                    aria-label={t('Visitas e cliques por dia')}
                  >
                    <title>{t('Visitas e cliques por dia')}</title>
                    {[0, 0.5, 1].map((v) => (
                      <g key={v}>
                        <line
                          x1="45"
                          x2="695"
                          y1={220 - v * 180}
                          y2={220 - v * 180}
                          stroke="#e7ddd5"
                        />
                        <text
                          x="37"
                          y={224 - v * 180}
                          textAnchor="end"
                          fontSize="12"
                          fill="#625950"
                        >
                          {Math.round(maximum * v)}
                        </text>
                      </g>
                    ))}
                    <polyline
                      points={line('views')}
                      fill="none"
                      stroke="#ee590d"
                      strokeWidth="3"
                    />
                    <polyline
                      points={line('actions')}
                      fill="none"
                      stroke="#644436"
                      strokeDasharray="6 4"
                      strokeWidth="3"
                    />
                    {daily.map((r, i) => (
                      <g key={r.day}>
                        <circle
                          cx={45 + (i * 650) / (daily.length - 1)}
                          cy={220 - (r.views / maximum) * 180}
                          r="3"
                          fill="#ee590d"
                        >
                          <title>{`${date(r.day)}: ${r.views} ${t('Visitas')}, ${r.actions} ${t('Cliques')}`}</title>
                        </circle>
                      </g>
                    ))}
                    <text x="45" y="248" fontSize="12">
                      {date(daily[0].day)}
                    </text>
                    <text x="695" y="248" textAnchor="end" fontSize="12">
                      {date(daily.at(-1)!.day)}
                    </text>
                  </svg>
                </>
              ) : (
                <div className="results-table">
                  <table>
                    <caption>{t('Visitas e cliques por dia')}</caption>
                    <thead>
                      <tr>
                        <th>{t('Data')}</th>
                        <th>{t('Visitas')}</th>
                        <th>{t('Cliques')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {daily.map((r) => (
                        <tr key={r.day}>
                          <td>{date(r.day)}</td>
                          <td>{fmt(r.views)}</td>
                          <td>{fmt(r.actions)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </article>
            <article className="results-ranking">
              <h3>{t('Acções mais procuradas')}</h3>
              <p>
                {t(
                  'Identifique os contactos e serviços que despertam mais interesse.',
                )}
              </p>
              {report.actions.length ? (
                <ol>
                  {report.actions.map((r) => (
                    <li key={r.label}>
                      <div>
                        <span>{t(r.label)}</span>
                        <strong>{fmt(r.count)}</strong>
                      </div>
                      <meter
                        min="0"
                        max={Math.max(...report.actions.map((a) => a.count), 1)}
                        value={r.count}
                        aria-label={t(r.label)}
                      />
                    </li>
                  ))}
                </ol>
              ) : (
                <p>{t('Ainda não há cliques neste período.')}</p>
              )}
            </article>
          </div>
          <div className="results-guidance">
            <h3>{t('O que fazer a seguir')}</h3>
            <p>
              {t(
                report.summary.actions
                  ? 'Destaque as ligações mais procuradas, actualize os serviços e acompanhe a evolução nos próximos dias.'
                  : 'Confirme que os contactos estão visíveis e adicione uma chamada clara para WhatsApp ou para os seus serviços.',
              )}
            </p>
            <div className="growth-actions">
              {onEdit && (
                <button onClick={onEdit}>
                  {t('Editar perfil')}
                  <ArrowUpRight size={16} />
                </button>
              )}
              {onTools && (
                <button onClick={onTools}>
                  {t('Ferramentas profissionais')}
                  <ArrowUpRight size={16} />
                </button>
              )}
            </div>
          </div>
          <details className="results-method">
            <summary>{t('Como interpretar estes resultados')}</summary>
            <p>
              {t(
                'Apenas visitas com consentimento. As suas próprias visitas e pré-visualizações são excluídas. Cliques indicam interesse, não vendas ou mensagens enviadas.',
              )}
            </p>
            <p>
              {t(
                'Dias apresentados na hora de Maputo. Sessões são estimativas, não pessoas identificadas. Dados conservados por até 90 dias.',
              )}
            </p>
          </details>
        </>
      )}
    </section>
  );
}
