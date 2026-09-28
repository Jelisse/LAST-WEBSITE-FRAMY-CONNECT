'use client';
import { useEffect, useState } from 'react';
import {
  Activity,
  ArrowDownToLine,
  RefreshCw,
  Users,
  Eye,
  ShoppingBag,
  Clock,
  FileText,
  LogIn,
  Globe,
  MonitorSmartphone,
  Megaphone,
  Radio,
  MousePointer2,
} from 'lucide-react';
import { useI18n } from './language-provider';
import { csvCell } from '@/lib/site-analytics';
import '@/app/manager/analytics.css';
type Row = { label: string; value: number };
type Totals = { sessions: number; views: number; checkouts: number };
type Report = {
  funnel: Record<string, number>;
  range: { from: string; to: string; start: number; previousStart: number };
  current: Totals;
  previous: Totals;
  active: { path: string; value: number }[];
  daily: { label: string; views: number; sessions: number }[];
  heat: { day: number; hour: number; value: number }[];
  pages: Row[];
  sources: Row[];
  devices: Row[];
  countries: Row[];
  campaigns: Row[];
  landing: Row[];
  steps: { step: number; value: number }[];
  performance: {
    load: number | null;
    lcp: number | null;
    loadSamples: number;
    lcpSamples: number;
  };
  events: { kind: string; value: number }[];
  orders: { submitted: number; paid: number };
  startedAt: number;
  updatedAt: number;
};
const dayAt = (offset = 0) =>
  new Date(Date.now() + 7200000 - offset * 86400000).toISOString().slice(0, 10);
const stageNames = [
  'Produto',
  'Plano',
  'Conta',
  'Perfil',
  'Entrega',
  'Confirmar',
];
export function WebsiteAnalytics() {
  const { t } = useI18n();
  const [range, setRange] = useState({ from: dayAt(6), to: dayAt() });
  const [draft, setDraft] = useState(range);
  const [data, setData] = useState<Report | null>(null),
    [error, setError] = useState(''),
    [loading, setLoading] = useState(false),
    [refresh, setRefresh] = useState(0);
  const fmt = (n: number | null | undefined) =>
    Number(n || 0).toLocaleString(t.locale);
  const time = (n: number) =>
    new Date(n).toLocaleString(t.locale, { timeZone: 'Africa/Maputo' });
  useEffect(() => {
    let live = true,
      inflight = false;
    const controller = new AbortController();
    const load = async () => {
      if (inflight || document.visibilityState === 'hidden') return;
      inflight = true;
      setLoading(true);
      try {
        const r = await fetch(
          '/api/site-analytics?' + new URLSearchParams(range),
          {
            cache: 'no-store',
            signal: AbortSignal.any([
              controller.signal,
              AbortSignal.timeout(15000),
            ]),
          },
        );
        const b = (await r.json()) as Report & { error?: string };
        if (!r.ok) throw Error(b.error || 'Estatísticas indisponíveis.');
        if (live) {
          setData(b);
          setError('');
        }
      } catch (e) {
        if (live && !controller.signal.aborted) setError((e as Error).message);
      } finally {
        inflight = false;
        if (live) setLoading(false);
      }
    };
    void load();
    const timer = setInterval(() => void load(), 30000);
    const visible = () => void load();
    document.addEventListener('visibilitychange', visible);
    return () => {
      live = false;
      controller.abort();
      clearInterval(timer);
      document.removeEventListener('visibilitychange', visible);
    };
  }, [range, refresh]);
  function preset(days: number, yesterday = false) {
    const next = {
      from: dayAt(yesterday ? 1 : days - 1),
      to: dayAt(yesterday ? 1 : 0),
    };
    setRange(next);
    setDraft(next);
  }
  const compare = (key: keyof Totals) => {
    if (!data) return '—';
    if (
      data.range.previousStart < data.startedAt ||
      data.range.previousStart < data.updatedAt - 90 * 86400000
    )
      return t('Comparação indisponível');
    const before = Number(data.previous[key] || 0),
      now = Number(data.current[key] || 0);
    return before
      ? `${now >= before ? '+' : ''}${Math.round(((now - before) / before) * 100)}% · ${t('período anterior')}`
      : t('Sem base de comparação');
  };
  function exportCSV() {
    if (!data) return;
    const rows: unknown[][] = [
      ['Website analytics', 'Africa/Maputo', data.range.from, data.range.to],
      ['Métrica', 'Valor'],
      ['Sessões', data.current.sessions],
      ['Visualizações', data.current.views],
      ['Checkouts observados', data.current.checkouts],
      ['Pedidos criados', data.orders.submitted],
      ['Destes pedidos, pagos', data.orders.paid],
      ['Recolha iniciada', time(data.startedAt)],
    ];
    for (const [title, list] of [
      ['Páginas', data.pages],
      ['Origens', data.sources],
      ['Dispositivos', data.devices],
      ['Países', data.countries],
      ['Campanhas', data.campaigns],
    ] as [string, Row[]][]) {
      rows.push([title, 'Total'], ...list.map((r) => [r.label, r.value]));
    }
    rows.push(
      ['Dia', 'Visualizações', 'Sessões'],
      ...data.daily.map((r) => [r.label, r.views, r.sessions]),
      ['Dia da semana', 'Hora', 'Visualizações'],
      ...data.heat.map((r) => [r.day, r.hour, r.value]),
    );
    const url = URL.createObjectURL(
      new Blob(
        ['\ufeff' + rows.map((r) => r.map(csvCell).join(',')).join('\r\n')],
        { type: 'text/csv;charset=utf-8' },
      ),
    );
    const a = document.createElement('a');
    a.href = url;
    a.download = `framy-analytics-${data.range.from}-${data.range.to}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }
  function readableLabel(label: string, title: string) {
    const pages: Record<string, string> = {
      '/': 'Página inicial',
      '/produtos': 'Produtos',
      '/sobre': 'Sobre nós',
      '/contacto': 'Contacto',
      '/ajuda': 'Ajuda',
      '/termos': 'Termos de utilização',
      '/privacidade': 'Privacidade',
      '/aplicar': 'Candidatura a agente',
      '/exemplo': 'Perfil de exemplo',
      '/entrar': 'Entrar na conta',
      '/encomendar/keychain': 'Compra de porta-chaves',
      '/produtos/keychain': 'Porta-chaves NFC',
    };
    if (pages[label]) return t(pages[label]);
    if (label.startsWith('/')) {
      const parts = label.split('/').filter(Boolean);
      const prefix =
        parts[0] === 'encomendar'
          ? t('Compra')
          : parts[0] === 'produtos'
            ? t('Produto')
            : '';
      const name = (prefix ? parts.slice(1) : parts)
        .join(' · ')
        .replaceAll('-', ' ');
      return [prefix, name.charAt(0).toUpperCase() + name.slice(1)]
        .filter(Boolean)
        .join(' · ');
    }
    if (title === 'Dispositivos') {
      const devices: Record<string, string> = {
        mobile: 'Telemóvel',
        desktop: 'Computador',
        tablet: 'Tablet',
        unknown: 'Desconhecido',
      };
      return t(devices[label] || label);
    }
    if (title === 'Países' && /^[A-Z]{2}$/.test(label)) {
      try {
        return (
          new Intl.DisplayNames([t.locale], { type: 'region' }).of(label) ||
          label
        );
      } catch {
        return label;
      }
    }
    return t(label || 'Sem campanha');
  }
  function breakdown(title: string, rows: Row[], unit = 'sessões') {
    const sorted = [...rows].sort((a, b) => b.value - a.value);
    const max = Math.max(1, ...sorted.map((r) => r.value));
    const appearance = {
      'Páginas activas agora': { icon: Radio, tone: 'green' },
      'Páginas mais visitadas': { icon: FileText, tone: 'orange' },
      'Páginas de entrada': { icon: LogIn, tone: 'blue' },
      'Origem das visitas': { icon: MousePointer2, tone: 'purple' },
      Dispositivos: { icon: MonitorSmartphone, tone: 'blue' },
      Países: { icon: Globe, tone: 'green' },
      Campanhas: { icon: Megaphone, tone: 'purple' },
    }[title] || { icon: FileText, tone: 'orange' };
    const Icon = appearance.icon;
    return (
      <section className="wa-card wa-breakdown" data-tone={appearance.tone}>
        <div className="wa-card-heading">
          <h3>
            <span className="wa-category-icon">
              <Icon size={16} aria-hidden="true" />
            </span>
            {t(title)}
          </h3>
          <small>{t(unit)}</small>
        </div>
        {!sorted.length ? (
          <div className="wa-empty-state">
            <Icon size={22} aria-hidden="true" />
            <p>{t('Ainda sem dados neste período.')}</p>
          </div>
        ) : (
          <ol className="wa-ranking">
            {sorted.map((r, index) => (
              <li key={r.label}>
                <span className="wa-rank-number" aria-hidden="true">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <div className="wa-rank-content">
                  <div className="wa-rank-label">
                    <span title={r.label}>{readableLabel(r.label, title)}</span>
                    <strong>{fmt(r.value)}</strong>
                  </div>
                  <div className="wa-track" aria-hidden="true">
                    <span style={{ width: (100 * r.value) / max + '%' }} />
                  </div>
                </div>
              </li>
            ))}
          </ol>
        )}
      </section>
    );
  }
  const active = data?.active.reduce((n, r) => n + r.value, 0) || 0;
  const hours = Array.from({ length: 24 }, (_, hour) => ({
    hour,
    value:
      data?.heat
        .filter((r) => r.hour === hour)
        .reduce((n, r) => n + r.value, 0) || 0,
  }));
  const peak = hours.reduce((a, b) => (b.value > a.value ? b : a), hours[0]);
  const maxHeat = Math.max(1, ...(data?.heat.map((r) => r.value) || []));
  const days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  return (
    <div className="website-analytics">
      <div className="wa-toolbar">
        <div className="wa-presets">
          {[
            [1, 'Hoje'],
            [0, 'Ontem'],
            [7, '7 dias'],
            [30, '30 dias'],
          ].map(([n, label]) => (
            <button
              type="button"
              key={label}
              aria-pressed={
                range.from === dayAt(n === 0 ? 1 : Number(n) - 1) &&
                range.to === dayAt(n === 0 ? 1 : 0)
              }
              onClick={() => preset(Number(n) || 1, n === 0)}
            >
              {t(String(label))}
            </button>
          ))}
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setRange(draft);
          }}
        >
          <label>
            {t('De')}
            <input
              aria-label={t('Data inicial')}
              type="date"
              required
              value={draft.from}
              max={draft.to}
              onChange={(e) => setDraft({ ...draft, from: e.target.value })}
            />
          </label>
          <label>
            {t('Até')}
            <input
              aria-label={t('Data final')}
              type="date"
              required
              value={draft.to}
              min={draft.from}
              max={dayAt()}
              onChange={(e) => setDraft({ ...draft, to: e.target.value })}
            />
          </label>
          <button type="submit">{t('Aplicar')}</button>
        </form>
        <button
          type="button"
          className="wa-refresh"
          title={t('Actualizar')}
          aria-label={t('Actualizar')}
          onClick={() => setRefresh((v) => v + 1)}
          disabled={loading}
        >
          <RefreshCw size={15} />
          {t('Actualizar')}
        </button>
        <button type="button" disabled={!data || !!error} onClick={exportCSV}>
          <ArrowDownToLine size={15} />
          {t('Exportar CSV')}
        </button>
      </div>
      {error && (
        <p role="alert" className="manager-error">
          {t(error)}{' '}
          {data &&
            t(
              'Os valores abaixo são da última leitura; podem estar desactualizados.',
            )}
        </p>
      )}
      {!data ? (
        <section className="wa-card">
          <output>
            {t(
              loading
                ? 'A carregar estatísticas…'
                : 'Ainda não foi possível obter dados.',
            )}
          </output>
        </section>
      ) : (
        <>
          <div className="wa-meta">
            <span>
              <Activity size={14} />
              {t('Actualiza a cada 30 s')}
            </span>
            <span>
              {t('Última leitura')}:{' '}
              {new Date(data.updatedAt).toLocaleTimeString(t.locale, {
                timeZone: 'Africa/Maputo',
                hour: '2-digit',
                minute: '2-digit',
              })}{' '}
              · {t('Hora de Maputo')}
            </span>
          </div>
          <div className="wa-metrics">
            <section className="wa-card wa-live">
              <span>
                <span className="wa-dot" />
                {t('Online agora')}
              </span>
              <strong>{fmt(active)}</strong>
              <small>{t('Sessões activas · últimos 5 min')}</small>
            </section>
            <section className="wa-card">
              <span>
                <Users size={16} />
                {t('Sessões')}
              </span>
              <strong>{fmt(data.current.sessions)}</strong>
              <small>{compare('sessions')}</small>
            </section>
            <section className="wa-card">
              <span>
                <Eye size={16} />
                {t('Visualizações')}
              </span>
              <strong>{fmt(data.current.views)}</strong>
              <small>{compare('views')}</small>
            </section>
            <section className="wa-card">
              <span>
                <ShoppingBag size={16} />
                {t('Checkouts')}
              </span>
              <strong>{fmt(data.current.checkouts)}</strong>
              <small>{compare('checkouts')}</small>
            </section>
          </div>
          <details className="wa-note wa-method">
            <summary>
              {t('Como interpretar os dados')}
              <span>
                {t(
                  'Apenas visitas com consentimento · online é uma estimativa',
                )}
              </span>
            </summary>
            <p>
              {t(
                'Apenas visitas com estatísticas permitidas. Uma sessão termina após 30 minutos sem actividade. A equipa e bots identificados são excluídos. Não representa todas as visitas nem pessoas únicas.',
              )}
            </p>
          </details>
          <div className="wa-grid">
            <section className="wa-card wa-wide">
              <h3>{t('Evolução do tráfego')}</h3>
              <p>{t('Visualizações por dia · hora de Maputo')}</p>
              <figure
                className="wa-daily"
                aria-label={t('Visualizações por dia')}
              >
                {Array.from(
                  {
                    length:
                      Math.round(
                        (Date.parse(data.range.to) -
                          Date.parse(data.range.from)) /
                          86400000,
                      ) + 1,
                  },
                  (_, i) => {
                    const label = new Date(
                      Date.parse(data.range.from) + i * 86400000,
                    )
                      .toISOString()
                      .slice(0, 10);
                    const r = data.daily.find((r) => r.label === label);
                    const value = r?.views || 0;
                    return (
                      <div
                        key={label}
                        title={`${label}: ${fmt(value)} ${t('visualizações')}, ${fmt(r?.sessions)} ${t('sessões')}`}
                      >
                        <span
                          style={{
                            height:
                              Math.max(
                                value ? 3 : 0,
                                (value /
                                  Math.max(
                                    1,
                                    ...data.daily.map((r) => r.views),
                                  )) *
                                  100,
                              ) + 'px',
                          }}
                        />
                        <small>{label.slice(8)}</small>
                      </div>
                    );
                  },
                )}
              </figure>
              <details>
                <summary>{t('Ver dados da tabela')}</summary>
                <table>
                  <thead>
                    <tr>
                      <th>{t('Dia')}</th>
                      <th>{t('Visualizações')}</th>
                      <th>{t('Sessões')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.daily.map((r) => (
                      <tr key={r.label}>
                        <td>{r.label}</td>
                        <td>{fmt(r.views)}</td>
                        <td>{fmt(r.sessions)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </details>
            </section>
            {breakdown(
              'Páginas activas agora',
              data.active.map((r) => ({ label: r.path, value: r.value })),
            )}
            <section className="wa-card wa-wide">
              <h3>
                <Clock size={17} />
                {t('Horários de maior acesso')}
              </h3>
              <p>
                {peak.value
                  ? `${t('Hora mais movimentada')}: ${String(peak.hour).padStart(2, '0')}:00–${String(peak.hour).padStart(2, '0')}:59 · ${fmt(peak.value)} ${t('visualizações')}`
                  : t('Ainda sem dados neste período.')}
              </p>
              <small>
                {t(
                  'Totais por dia da semana e hora, não médias. O dia actual pode estar incompleto.',
                )}
              </small>
              <div className="wa-heat-scroll">
                <table className="wa-heat">
                  <thead>
                    <tr>
                      <th scope="col">{t('Dia')}</th>
                      {hours.map((h) => (
                        <th key={h.hour} scope="col">
                          {h.hour}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[1, 2, 3, 4, 5, 6, 0].map((day) => (
                      <tr key={day}>
                        <th scope="row">{t(days[day])}</th>
                        {hours.map((h) => {
                          const value =
                            data.heat.find(
                              (r) => r.day === day && r.hour === h.hour,
                            )?.value || 0;
                          return (
                            <td
                              key={h.hour}
                              tabIndex={0}
                              title={`${t(days[day])} ${h.hour}:00: ${value}`}
                              aria-label={`${t(days[day])} ${h.hour}:00: ${value}`}
                              style={{
                                background: value
                                  ? `rgba(184,59,9,${0.15 + (0.8 * value) / maxHeat})`
                                  : '#f5efea',
                                color:
                                  value / maxHeat > 0.5 ? 'white' : '#69442c',
                              }}
                            >
                              {value || '·'}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
            {breakdown('Páginas mais visitadas', data.pages, 'visualizações')}
            {breakdown('Páginas de entrada', data.landing)}
            {breakdown(
              'Origem das visitas',
              data.sources.map((r) => ({
                ...r,
                label:
                  r.label === 'direct' ? 'Directo / desconhecido' : r.label,
              })),
            )}
            {breakdown('Dispositivos', data.devices)}
            {breakdown(
              'Países',
              data.countries.map((r) => ({
                ...r,
                label: r.label === 'unknown' ? 'Desconhecido' : r.label,
              })),
            )}
            {breakdown('Campanhas', data.campaigns)}
            <section className="wa-card wa-full wa-purchase">
              <h3>{t('Percurso de compra')}</h3>
              <details className="wa-context">
                <summary>{t('Como é calculado')}</summary>
                <p>
                  {t(
                    'Percursos por sessão e produto iniciados no período, com etapas observadas por ordem. Percursos retomados de períodos anteriores e visitas sem consentimento não entram neste funil.',
                  )}
                </p>
              </details>
              <ol className="wa-funnel">
                {stageNames.map((name, i) => {
                  const n = data.funnel['s' + i] || 0;
                  const base = data.funnel.s0 || 0;
                  const prior = i ? data.funnel['s' + (i - 1)] || 0 : 0;
                  return (
                    <li key={name}>
                      <span>
                        {i + 1}. {t(name)}
                      </span>
                      <strong>{fmt(n)}</strong>
                      <small>
                        {base ? Math.round((n / base) * 100) + '%' : '—'}{' '}
                        {t('do início')}
                      </small>
                      {i > 0 && (
                        <small>
                          {fmt(prior - n)} {t('não avançaram')}
                        </small>
                      )}
                    </li>
                  );
                })}
              </ol>
              <p>
                <strong>
                  {data.funnel.s0
                    ? Math.round(
                        (data.funnel.submitted / data.funnel.s0) * 100,
                      ) + '%'
                    : '—'}
                </strong>{' '}
                {t('conclusão observada')} · {fmt(data.funnel.submitted)} /{' '}
                {fmt(data.funnel.s0)}. {t('Não é uma taxa de pagamento.')}
              </p>
              <div className="wa-order-stats">
                <p>
                  <strong>{fmt(data.orders.submitted)}</strong>
                  {t('Pedidos criados no período')}
                </p>
                <p>
                  <strong>{fmt(data.orders.paid)}</strong>
                  {t('Destes pedidos, pagos actualmente')}
                </p>
                <p>
                  <strong>
                    {fmt(
                      data.events.find((r) => r.kind === 'checkout_error')
                        ?.value,
                    )}
                  </strong>
                  {t('Falhas de confirmação observadas')}
                </p>
              </div>
              <small>
                {t(
                  'Pedidos e pagamentos vêm do servidor, incluindo clientes sem consentimento analítico. Não devem ser divididos pelas sessões observadas para calcular conversão. Pagamentos mostram o estado actual dos pedidos criados no período.',
                )}
              </small>
            </section>
            <section className="wa-card wa-full wa-performance">
              <h3>{t('Velocidade e fiabilidade')}</h3>
              <div className="wa-order-stats">
                <p>
                  <strong>
                    {data.performance.load === null
                      ? '—'
                      : (data.performance.load / 1000).toFixed(2) + ' s'}
                  </strong>
                  {t('Carregamento médio')}
                  <small>
                    {fmt(data.performance.loadSamples)} {t('amostras')}
                  </small>
                </p>
                <p>
                  <strong>
                    {data.performance.lcp === null
                      ? '—'
                      : (data.performance.lcp / 1000).toFixed(2) + ' s'}
                  </strong>
                  {t('LCP médio')}
                  <small>
                    {fmt(data.performance.lcpSamples)} {t('amostras')}
                  </small>
                </p>
              </div>
              <p>
                {t(
                  'Medições do navegador após 15 segundos com a página visível; visitas curtas podem não entrar na amostra. Não são testes sintéticos nem percentis Core Web Vitals.',
                )}
              </p>
              <small>
                {t(
                  'INP, CLS e erros HTTP do servidor: indisponíveis neste painel. Consulte a monitorização Cloudflare para erros e disponibilidade.',
                )}
              </small>
            </section>
          </div>
          <details className="wa-note wa-method">
            <summary>{t('Recolha e limitações')}</summary>
            <p>
              {t('Recolha disponível desde')}: {time(data.startedAt)}.{' '}
              {t(
                'Retenção máxima: 90 dias. Dados anteriores ao início da recolha não são reconstruídos. Visitantes recorrentes e tempo de envolvimento: indisponíveis, para evitar identificação persistente ou estimativas enganosas.',
              )}
            </p>
          </details>
        </>
      )}
    </div>
  );
}
