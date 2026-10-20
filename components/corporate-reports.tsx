'use client';
/* oxlint-disable jsx-a11y/prefer-tag-over-role -- Inline SVG charts use a labelled image role and a separate data table. */
import { useCallback, useEffect, useState } from 'react';
import {
  BarChart3,
  MousePointerClick,
  Users,
  Eye,
  RefreshCw,
  Download,
  Trophy,
} from 'lucide-react';
import { useI18n } from './language-provider';
import Link from './hard-link';
import { csvCell } from '@/lib/site-analytics';
import {
  teamReportValue,
  type DailyReport,
  type TeamReport,
  type ReportCounts,
  type ReportMetric,
} from '@/lib/corporate-reports';
type Data = {
  name: string;
  role: string;
  analytics: boolean;
  generatedAt: number;
  totals: ReportCounts;
  daily: DailyReport[];
  teams: TeamReport[];
  campaigns: { id: string; name: string }[];
  teamOptions: { team: string }[];
  truncated: boolean;
};
const labels = {
  opens: 'Aberturas do perfil',
  clicks: 'Cliques',
  contacts: 'Contactos recebidos',
} as const;
export function CorporateReports({
  organisation,
  initialCampaign = '',
}: {
  organisation: string;
  initialCampaign?: string;
}) {
  const { t, locale } = useI18n();
  const [days, setDays] = useState('30'),
    [campaign, setCampaign] = useState(initialCampaign),
    [team, setTeam] = useState(''),
    [metric, setMetric] = useState<ReportMetric>('contacts'),
    [unit, setUnit] = useState<'total' | 'participant'>('total');
  const [snapshot, setSnapshot] = useState<{ key: string; data: Data } | null>(
      null,
    ),
    [error, setError] = useState(''),
    [refreshing, setRefreshing] = useState(false),
    [revision, setRevision] = useState(0);
  const params = new URLSearchParams({
    organisation,
    days,
    campaign,
    metric,
    unit,
  });
  if (team) params.set('team', team.slice(5));
  const key = params.toString();
  const load = useCallback(
    async (signal: AbortSignal) => {
      setRefreshing(true);
      setError('');
      try {
        const r = await fetch('/api/corporate-reports?' + key, {
          cache: 'no-store',
          signal: AbortSignal.any([signal, AbortSignal.timeout(15000)]),
        });
        const data = (await r.json()) as Data & { error?: string };
        if (!r.ok) throw Error(data.error || 'Não foi possível carregar.');
        if (!signal.aborted) {
          setSnapshot({ key, data });
          if (!data.analytics && metric !== 'contacts') setMetric('contacts');
        }
      } catch (e) {
        if (!signal.aborted)
          setError(
            e instanceof Error ? e.message : 'Não foi possível carregar.',
          );
      } finally {
        if (!signal.aborted) setRefreshing(false);
      }
    },
    [key, metric],
  );
  useEffect(() => {
    const controller = new AbortController();
    queueMicrotask(() => {
      if (!controller.signal.aborted) void load(controller.signal);
    });
    return () => controller.abort();
  }, [load, revision]);
  useEffect(() => {
    const timer = window.setInterval(() => {
      if (
        document.visibilityState === 'visible' &&
        !document.activeElement?.closest('.corporate-report-filters')
      )
        setRevision((n) => n + 1);
    }, 30000);
    return () => window.clearInterval(timer);
  }, []);
  const data = snapshot?.key === key ? snapshot.data : null,
    options = snapshot?.data;
  const number = (value: number) =>
    value.toLocaleString(locale, {
      maximumFractionDigits: unit === 'participant' ? 1 : 0,
    });
  const date = (value: number) =>
    new Intl.DateTimeFormat(locale, {
      day: '2-digit',
      month: 'short',
      timeZone: 'Africa/Maputo',
    }).format(value);
  const rows = (data?.teams ?? []).filter((row) => row[metric] > 0),
    max = Math.max(1, ...rows.map((row) => teamReportValue(row, metric, unit)));
  const peak = Math.max(1, ...(data?.daily ?? []).map((row) => row[metric]));
  const points = (data?.daily ?? []).map((row, i) => ({
    x: 44 + (i * 570) / Math.max(1, data!.daily.length - 1),
    y: 180 - (row[metric] * 150) / peak,
    row,
  }));
  const leader = data?.role === 'leader';
  function exportReport() {
    if (!data) return;
    const content = [
      [
        t('Equipa'),
        ...Object.values(labels).map((label) => t(label)),
        t('Participantes com actividade'),
      ],
      ...data.teams.map((row) => [
        row.team || t('Sem equipa'),
        data.analytics ? row.opens : '',
        data.analytics ? row.clicks : '',
        row.contacts,
        row.contributors,
      ]),
    ];
    const url = URL.createObjectURL(
      new Blob(
        [
          '\ufeff' +
            content.map((row) => row.map(csvCell).join(',')).join('\r\n'),
        ],
        { type: 'text/csv;charset=utf-8' },
      ),
    );
    const a = document.createElement('a');
    a.href = url;
    a.download = 'framy-relatorio-equipas.csv';
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return (
    <section className="corporate-reports">
      <div className="corporate-section-heading corporate-report-heading">
        <div>
          <h2>
            <BarChart3 size={24} aria-hidden="true" />
            {t('Desempenho da equipa')}
          </h2>
          <p>
            {t(
              'Compare resultados de campanhas, identifique equipas em destaque e acompanhe a actividade diária.',
            )}
          </p>
        </div>
        <button
          type="button"
          disabled={refreshing}
          onClick={() => setRevision((n) => n + 1)}
        >
          <RefreshCw size={18} aria-hidden="true" />
          {t(refreshing ? 'A actualizar…' : 'Actualizar')}
        </button>
      </div>
      <div className="corporate-report-filters">
        <label>
          {t('Período')}
          <select value={days} onChange={(e) => setDays(e.target.value)}>
            {[7, 30, 90].map((n) => (
              <option key={n} value={n}>
                {n} {t('dias')}
              </option>
            ))}
          </select>
        </label>
        <label>
          {t('Campanha')}
          <select
            value={campaign}
            onChange={(e) => setCampaign(e.target.value)}
          >
            <option value="">{t('Todas')}</option>
            {options?.campaigns.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
            {campaign && !options?.campaigns.some((c) => c.id === campaign) && (
              <option value={campaign}>{t('Campanha seleccionada')}</option>
            )}
          </select>
        </label>
        <label>
          {t('Equipa')}
          <select value={team} onChange={(e) => setTeam(e.target.value)}>
            <option value="">{t('Todas')}</option>
            {options?.teamOptions.map((row) => (
              <option key={row.team} value={'team:' + row.team}>
                {row.team || t('Sem equipa')}
              </option>
            ))}
          </select>
        </label>
        <label>
          {t('Comparar por')}
          <select
            value={metric}
            onChange={(e) => setMetric(e.target.value as ReportMetric)}
          >
            {(['contacts', 'clicks', 'opens'] as const).map((value) => (
              <option
                key={value}
                value={value}
                disabled={options?.analytics === false && value !== 'contacts'}
              >
                {t(labels[value])}
              </option>
            ))}
          </select>
        </label>
      </div>
      {error && (
        <p role="alert">
          {t(error)}{' '}
          <button type="button" onClick={() => setRevision((n) => n + 1)}>
            {t('Tentar novamente')}
          </button>
        </p>
      )}
      {!data && !error && (
        <p aria-live="polite">{t('A carregar os relatórios…')}</p>
      )}
      {data && (
        <>
          {!leader && (
            <p className="corporate-report-note">
              {t('Vê apenas os seus resultados nesta organização.')}
            </p>
          )}
          {!data.analytics && (
            <p className="corporate-report-note">
              {t(
                'Este contrato não inclui estatísticas de interacção. Os contactos recebidos continuam disponíveis.',
              )}
            </p>
          )}
          {data.truncated && (
            <p className="corporate-report-note">
              {t(
                'Relatório limitado. Refine a campanha ou a equipa; o ranking pode estar incompleto.',
              )}
            </p>
          )}
          <div className="corporate-report-kpis">
            {(['contacts', 'clicks', 'opens'] as const).map((value) => {
              const Icon =
                value === 'contacts'
                  ? Users
                  : value === 'clicks'
                    ? MousePointerClick
                    : Eye;
              return (
                <div key={value}>
                  <Icon size={22} aria-hidden="true" />
                  <span>{t(labels[value])}</span>
                  <strong>
                    {!data.analytics && value !== 'contacts'
                      ? '—'
                      : data.totals[value].toLocaleString(locale)}
                  </strong>
                  <small>{t('No período seleccionado')}</small>
                </div>
              );
            })}
          </div>
          <div className="corporate-report-charts">
            <section className="corporate-panel corporate-ranking">
              <div className="corporate-section-heading">
                <h3>
                  <Trophy size={20} aria-hidden="true" />
                  {t(leader ? 'Equipas em destaque' : 'Os meus resultados')}
                </h3>
                <label className="corporate-ranking-unit">
                  {t('Comparação')}
                  <select
                    value={unit}
                    onChange={(e) =>
                      setUnit(e.target.value as 'total' | 'participant')
                    }
                  >
                    <option value="total">{t('Total')}</option>
                    <option value="participant">
                      {t('Por participante com actividade')}
                    </option>
                  </select>
                </label>
              </div>
              <p className="corporate-inline-help">
                {t(labels[metric])} ·{' '}
                {t(
                  unit === 'total'
                    ? 'Ordenado pelo total registado.'
                    : 'Média por trabalhador com pelo menos um registo no período.',
                )}
              </p>
              {!rows.length ? (
                <div className="corporate-report-empty">
                  <BarChart3 size={32} aria-hidden="true" />
                  <p>{t('Sem actividade para estes filtros.')}</p>
                  <Link
                    href={
                      '/corporativo/campanhas?organisation=' +
                      encodeURIComponent(organisation)
                    }
                  >
                    {t('Abrir campanhas')}
                  </Link>
                </div>
              ) : (
                <ol className="corporate-team-bars">
                  {rows.slice(0, 10).map((row, index) => (
                    <li key={row.team}>
                      <button
                        type="button"
                        aria-label={t('Filtrar pela equipa {0}', [
                          row.team || t('Sem equipa'),
                        ])}
                        onClick={() => setTeam('team:' + row.team)}
                      >
                        <span className="corporate-bar-label">
                          <strong>
                            {index + 1}. {row.team || t('Sem equipa')}
                          </strong>
                          <b>{number(teamReportValue(row, metric, unit))}</b>
                        </span>
                        <span
                          className="corporate-bar-track"
                          aria-hidden="true"
                        >
                          <span
                            style={{
                              width:
                                (100 * teamReportValue(row, metric, unit)) /
                                  max +
                                '%',
                            }}
                          />
                        </span>
                        <small>
                          {t('Participantes com actividade: {0}', [
                            row.contributors,
                          ])}
                        </small>
                      </button>
                    </li>
                  ))}
                </ol>
              )}
            </section>
            <section className="corporate-panel corporate-daily">
              <h3>
                {t('Evolução diária')} · {t(labels[metric])}
              </h3>
              <p className="corporate-inline-help">
                {t('Dias em horário de Maputo. O dia actual está em curso.')}
              </p>
              {data.daily.some((row) => row[metric] > 0) ? (
                <svg
                  viewBox="0 0 640 220"
                  role="img"
                  aria-label={t('Evolução diária dos registos seleccionados')}
                >
                  {[0, 0.5, 1].map((f) => (
                    <g key={f}>
                      <line
                        x1="44"
                        x2="614"
                        y1={180 - f * 150}
                        y2={180 - f * 150}
                        stroke="#e9ded5"
                      />
                      <text
                        x="36"
                        y={184 - f * 150}
                        textAnchor="end"
                        fontSize="11"
                        fill="#766457"
                      >
                        {new Intl.NumberFormat(locale,{notation:'compact',maximumFractionDigits:1}).format(peak*f)}
                      </text>
                    </g>
                  ))}
                  <polygon
                    points={
                      '44,180 ' +
                      points.map((p) => p.x + ',' + p.y).join(' ') +
                      ' 614,180'
                    }
                    fill="#f97316"
                    opacity=".12"
                  />
                  <polyline
                    points={points.map((p) => p.x + ',' + p.y).join(' ')}
                    stroke="#ba420d"
                    strokeWidth="3"
                    fill="none"
                  />
                  {points.map((p) => (
                    <circle
                      key={p.row.day}
                      cx={p.x}
                      cy={p.y}
                      r="3"
                      fill="#ba420d"
                    >
                      <title>
                        {date(p.row.day)}: {p.row[metric]}
                      </title>
                    </circle>
                  ))}
                  {[
                    0,
                    Math.floor((points.length - 1) / 2),
                    points.length - 1,
                  ].map((i) => (
                    <text
                      key={i}
                      x={points[i].x}
                      y="205"
                      textAnchor={
                        i === 0
                          ? 'start'
                          : i === points.length - 1
                            ? 'end'
                            : 'middle'
                      }
                      fontSize="12"
                      fill="#766457"
                    >
                      {date(points[i].row.day)}
                    </text>
                  ))}
                </svg>
              ) : (
                <div className="corporate-report-empty">
                  <p>{t('Sem actividade para estes filtros.')}</p>
                </div>
              )}
              <details>
                <summary>{t('Ver valores diários')}</summary>
                <div className="corporate-table">
                  <table>
                    <thead>
                      <tr>
                        <th>{t('Data')}</th>
                        <th>{t(labels[metric])}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.daily.map((row) => (
                        <tr key={row.day}>
                          <td>{date(row.day)}</td>
                          <td>{row[metric]}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </details>
            </section>
          </div>
          <section className="corporate-panel">
            <div className="corporate-section-heading">
              <h3>{t('Comparação de equipas')}</h3>
              <button type="button" onClick={exportReport}>
                <Download size={18} aria-hidden="true" />
                {t('Exportar relatório CSV')}
              </button>
            </div>
            <div className="corporate-table">
              <table>
                <thead>
                  <tr>
                    {[
                      'Equipa',
                      'Contactos recebidos',
                      'Cliques',
                      'Aberturas do perfil',
                      'Participantes com actividade',
                    ].map((label) => (
                      <th key={label}>{t(label)}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.teams.map((row) => (
                    <tr key={row.team}>
                      <td>{row.team || t('Sem equipa')}</td>
                      <td>{row.contacts}</td>
                      <td>{data.analytics ? row.clicks : '—'}</td>
                      <td>{data.analytics ? row.opens : '—'}</td>
                      <td>{row.contributors}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {!data.teams.length && (
              <p>{t('Sem actividade para estes filtros.')}</p>
            )}
          </section>
          <p className="corporate-report-note">
            {t(
              'Aberturas e cliques são acções, não pessoas únicas, contactos guardados ou seguidores confirmados.',
            )}{' '}
            {t(
              'As equipas reflectem a organização actual dos trabalhadores, não um histórico de mudanças de equipa.',
            )}
          </p>
          <small>
            {t('Última actualização')}:{' '}
            {new Date(data.generatedAt).toLocaleString(locale, {
              timeZone: 'Africa/Maputo',
            })}
          </small>
        </>
      )}
    </section>
  );
}
