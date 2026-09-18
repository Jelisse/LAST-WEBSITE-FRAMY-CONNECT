'use client';
import { useI18n, LanguageSelector } from '@/components/language-provider';

import { planMeticais, planPrice } from '@/lib/plan-pricing';

import { SourceImage } from '@/components/source-image';
import { useEffect, useState, useCallback } from 'react';
import Link from '@/components/hard-link';
import { orderProgress, submissionTime } from '@/lib/order-progress';
import {
  LayoutDashboard,
  Boxes,
  ShoppingBag,
  Wallet,
  ArrowUpRight,
  RefreshCw,
  Search,
  Plus,
  Download,
  Users,
  Package,
  ChevronRight,
} from 'lucide-react';
import { AgentAction } from './agent-action';
import { agentOrderView } from '@/lib/agent-workflow';
import { OrderArtwork } from './order-artwork';
import { ProfileHandoff } from './profile-handoff';
import { ApplicationManager } from './application-manager';
import { AccountManager } from './account-manager';
import { AccountMenu } from './account-menu';
import { ProductManager } from './product-manager';
import { OperationsAgentReports } from './operations-agent-reports';
import { money, type Product } from '@/lib/catalog';
import {
  orderLabels,
  type SandboxOrder,
  type ManagedPlan,
  type Profile,
} from '@/lib/domain';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from './ui/dialog';

type Agent = {
  id: string;
  name: string;
  email: string;
  phone: string;
  active: boolean;
  version: number;
};
type Order = SandboxOrder & {
  approvedUrl?: string;
  ownerId: string;
  profileUsername?: string | null;
  profile: Profile | null;
};
type Movement = {
  agent_id: string;
  id: string;
  product_id: string;
  quantity: number;
  reason: string;
  actor: string;
  created_at: string;
};
type Audit = {
  id: string;
  actor: string;
  action: string;
  subject: string;
  created_at: string;
};
type Data = {
  orders: Order[];
  agents: Agent[];
  movements: Movement[];
  audit: Audit[];
  products: Product[];
  plans: ManagedPlan[];
};
const sections = [
  { id: 'overview', label: 'Visão geral', icon: LayoutDashboard },
  { id: 'operations', label: 'Operações', icon: Boxes },
  { id: 'catalog', label: 'Produtos e planos', icon: ShoppingBag },
  { id: 'accounts', label: 'Contas e acessos', icon: Users },
  { id: 'applications', label: 'Candidaturas', icon: Users },
  { id: 'finance', label: 'Financeiro', icon: Wallet },
];
export function ManagerWorkspace({ displayName }: { displayName: string }) {
  const { t } = useI18n();
  const date = (value: string) =>
    new Date(value).toLocaleString(t.locale, { timeZone: 'Africa/Maputo' });
  const [data, setData] = useState<Data | null>(null),
    [section, setSection] = useState('overview'),
    [tab, setTab] = useState('orders'),
    [search, setSearch] = useState(''),
    [filter, setFilter] = useState('all'),
    [days, setDays] = useState('all');
  const [error, setError] = useState(''),
    [notice, setNotice] = useState(''),
    [busy, setBusy] = useState(false),
    [selected, setSelected] = useState<Order | null>(null),
    [editing, setEditing] = useState<Agent | ManagedPlan | null>(null),
    [editKind, setEditKind] = useState('agent'),
    [stock, setStock] = useState<Product | null>(null);
  const [progressHours, setProgressHours] = useState(48);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(timer);
  }, []);
  const [stockMode, setStockMode] = useState('entry');
  const [stockAgent, setStockAgent] = useState('');
  const [agentId, setAgentId] = useState(''),
    [paymentReference, setPaymentReference] = useState(''),
    [verifiedInProvider, setVerifiedInProvider] = useState(false);
  const load = useCallback(async () => {
    const r = await fetch('/api/manager', { cache: 'no-store' });
    const d = (await r.json()) as Data & { error?: string };
    if (!r.ok) throw Error(d.error ?? 'Não foi possível carregar.');
    setData(d);
    return d as Data;
  }, []);
  useEffect(() => {
    if (new URLSearchParams(location.search).get('section') === 'finance')
      queueMicrotask(() => setSection('finance'));
    void Promise.resolve()
      .then(load)
      .catch((e) => setError(e.message));
  }, [load]);
  const save = async (payload: Record<string, unknown>) => {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const r = await fetch('/api/manager', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const d = (await r.json()) as Data & { error?: string };
      if (!r.ok) throw Error(d.error ?? 'Não foi possível carregar.');
      await load();
      setSelected(null);
      setEditing(null);
      setStock(null);
      setNotice('Alteração guardada.');
      setPaymentReference('');
      setVerifiedInProvider(false);
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Não foi possível guardar.');
      return false;
    } finally {
      setBusy(false);
    }
  };
  const navigate = (next: string, nextTab?: string, nextFilter = 'all') => {
    setSection(next);
    if (next === 'operations') setDays('all');
    setTab(nextTab ?? (next === 'catalog' ? 'products' : 'orders'));
    setFilter(nextFilter);
    setSearch('');
    setNotice('');
  };
  const matches = (v: string) =>
    v.toLocaleLowerCase().includes(search.toLocaleLowerCase());
  const orders = (data?.orders ?? []).filter(
    (o) =>
      days === 'all' ||
      now - new Date(o.createdAt).getTime() <= Number(days) * 86400000,
  );
  const stockRows = (data?.products ?? []).map((p) => {
    const onHand = (data?.movements ?? [])
      .filter((m) => m.product_id === p.id)
      .reduce((n, m) => n + m.quantity, 0);
    const reserved = (data?.orders ?? []).filter(
      (o) =>
        o.productId === p.id &&
        ['QUEUED', 'IN_PRODUCTION', 'READY'].includes(o.status),
    ).length;
    return { ...p, onHand, reserved, free: onHand - reserved };
  });
  const low = stockRows.filter((p) => p.free <= 5).length;
  const orderRows = orders.filter(
    (o) =>
      (filter === 'all' ||
        (filter === 'pending'
          ? !['DELIVERED', 'CANCELLED'].includes(o.status)
          : o.status === filter)) &&
      matches(
        o.productName +
          ' ' +
          o.id +
          ' ' +
          o.agent +
          ' ' +
          (o.profile?.name ?? o.ownerId) +
          ' ' +
          (o.deliveryCity ?? ''),
      ),
  );
  const inspect = (o: Order) => {
    setSelected(o);
    setError('');
    setAgentId('');
  };
  const exportReport = () => {
    const rows = [
      [
        'Pedido',
        'Produto',
        'Estado',
        'Valor MZN',
        'Custo MZN',
        'Agente',
        'Data (UTC)',
        'Submetido (Maputo)',
        'Local de entrega',
        'Detalhes de entrega',
        'Progresso',
        'Tempo decorrido',
        'Prazo de referência (horas)',
      ],
      ...orderRows.map((o) => [
        o.id,
        o.productName,
        orderLabels[o.status],
        String(o.amount / 100),
        String(o.cost / 100),
        o.agent,
        o.createdAt,
        submissionTime(o.createdAt, t.locale),
        o.deliveryCity ?? 'Não indicado',
        o.deliveryAddress ?? '',
        orderProgress(o, now, progressHours).label,
        orderProgress(o, now, progressHours).elapsed,
        String(progressHours),
      ]),
    ];
    const csv = rows
      .map((row) =>
        row
          .map(
            (v) =>
              '"' +
              (/^[=+@-]/.test(v) ? "'" : '') +
              v.replaceAll('"', '""') +
              '"',
          )
          .join(';'),
      )
      .join('\r\n');
    const url = URL.createObjectURL(
      new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' }),
    );
    const a = document.createElement('a');
    a.href = url;
    a.download = 'framy-relatorio.csv';
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  const table = (
    <div className="manager-table-scroll">
      <table>
        <thead>
          <tr>
            <th>{t('Pedido / cliente')}</th>
            <th>{t('Submetido (Maputo)')}</th>
            <th>{t('Local de entrega')}</th>
            <th>{t('Progresso')}</th>
            <th>{t('Estado')}</th>
            <th>{t('Pagamento')}</th>
            <th>{t('Valor')}</th>
            <th>{t('Agente')}</th>
            <th>
              <span className="sr-only">{t('Detalhes')}</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {orderRows
            .slice(0, section === 'overview' ? 6 : undefined)
            .map((o) => (
              <tr key={o.id}>
                <td>
                  <strong>{t(o.productName)}</strong>
                  <small>
                    #{o.id.slice(0, 8)} · {o.profile?.name ?? o.ownerId}
                  </small>
                </td>
                <td>
                  <time dateTime={o.createdAt}>
                    {submissionTime(o.createdAt, t.locale)}
                  </time>
                </td>
                <td>
                  <strong>{o.deliveryCity || t('Não indicado')}</strong>
                </td>
                <td>
                  <span
                    className={`manager-progress manager-progress-${orderProgress(o, now, progressHours).tone}`}
                  >
                    {t(orderProgress(o, now, progressHours).label)}
                  </span>
                  {orderProgress(o, now, progressHours).elapsed && (
                    <small>
                      {t('Há ')}
                      {orderProgress(o, now, progressHours).elapsed}
                    </small>
                  )}
                </td>
                <td>
                  <span className="manager-badge">
                    {t(orderLabels[o.status])}
                  </span>
                </td>
                <td>
                  {o.refunded
                    ? t('Reembolsado')
                    : o.paid
                      ? t('Pago')
                      : t('Por pagar')}
                </td>
                <td>{money(o.amount, t.locale)}</td>
                <td>{o.agent || t('Por atribuir')}</td>
                <td>
                  <button
                    className="manager-icon"
                    aria-label={'Abrir pedido ' + o.id.slice(0, 8)}
                    onClick={() => inspect(o)}
                  >
                    <ArrowUpRight size={18} />
                  </button>
                </td>
              </tr>
            ))}
        </tbody>
      </table>
      {!orderRows.length && (
        <p className="manager-empty">
          {t('Nenhum pedido corresponde à selecção.')}
        </p>
      )}
    </div>
  );
  return (
    <div className="manager-shell">
      <aside className="manager-sidebar">
        <Link href="/" aria-label={t('Página inicial')}>
          <SourceImage src="/brand/logo.svg" alt={t('Framy Connect')} />
        </Link>
        <span className="manager-eyebrow">{t('MANAGER')}</span>
        <nav aria-label={t('Gestão')}>
          {sections.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              aria-current={section === id ? 'page' : undefined}
              onClick={() => navigate(id)}
            >
              <Icon size={20} />
              {t(label)}
              <ChevronRight size={15} />
            </button>
          ))}
        </nav>
        <div className="manager-sidebar-bottom">
          <strong>{displayName}</strong>
          <small>{t('Gestão Framy Connect')}</small>
          <Link href="/">
            {t('Ver website ')}
            <ArrowUpRight size={15} />
          </Link>
        </div>
      </aside>
      <div className="manager-body">
        <header className="manager-top">
          <LanguageSelector />
          <span>
            {t('Gestor')}{' '}
            <span>/ {t(sections.find((s) => s.id === section)?.label)}</span>
          </span>
          <AccountMenu />
        </header>
        <main id="main" className="manager-main">
          <div className="manager-heading">
            <div>
              <span className="manager-eyebrow">{t('CENTRO DE GESTÃO')}</span>
              <h1>{t(sections.find((s) => s.id === section)?.label)}</h1>
              <p>
                {section === 'overview'
                  ? t('O que acontece no seu negócio, num só lugar.')
                  : section === 'operations'
                    ? t('Ligue os pedidos, a equipa e o stock.')
                    : section === 'catalog'
                      ? t(
                          'Os produtos e as subscrições que oferece aos seus clientes.',
                        )
                      : section === 'applications'
                        ? t('Analise e acompanhe as candidaturas a agente.')
                        : section === 'accounts'
                          ? t(
                              'Crie acessos, recupere contas e controle a disponibilidade da equipa.',
                            )
                          : t(
                              'Acompanhe os valores recebidos, pendentes e reconhecidos.',
                            )}
              </p>
            </div>
            <button
              className="manager-secondary"
              disabled={busy}
              onClick={() =>
                void load()
                  .then(() => setError(''))
                  .catch((e) => setError(e.message))
              }
            >
              <RefreshCw size={16} />
              {t(' Actualizar')}
            </button>
          </div>
          <p className="manager-sandbox">
            {t(
              'Gestão de encomendas · Confirme cada transacção no prestador antes de a registar. Valores de produtos em MZN; planos mensais em meticais.',
            )}
          </p>
          {error && (
            <p role="alert" className="manager-error">
              {t(error)}
            </p>
          )}
          {notice && <output className="manager-notice">{t(notice)}</output>}
          {!data ? (
            <section className="manager-card">
              <p>
                {error
                  ? t(
                      'Não foi possível carregar a gestão. Consulte a mensagem acima e tente actualizar.',
                    )
                  : t('A carregar o seu espaço de gestão…')}
              </p>
            </section>
          ) : (
            <>
              {(section === 'overview' || section === 'finance') && (
                <div className="manager-toolbar">
                  <label>
                    {t('Período')}{' '}
                    <select
                      value={days}
                      onChange={(e) => setDays(e.target.value)}
                    >
                      <option value="all">{t('Todo o período')}</option>
                      <option value="7">{t('Últimos 7 dias')}</option>
                      <option value="30">{t('Últimos 30 dias')}</option>
                      <option value="90">{t('Últimos 90 dias')}</option>
                    </select>
                  </label>
                  <button className="manager-secondary" onClick={exportReport}>
                    <Download size={16} />
                    {t(' Exportar relatório')}
                  </button>
                </div>
              )}
              {section === 'accounts' && <AccountManager />}
              {section === 'applications' && <ApplicationManager />}
              {section === 'overview' && (
                <>
                  <div className="manager-metrics">
                    <Metric
                      label={t('Pedidos')}
                      value={String(orders.length)}
                      hint="No período seleccionado"
                    />
                    <Metric
                      label={t('Recebido líquido')}
                      value={money(
                        orders
                          .filter((o) => o.paid && !o.refunded)
                          .reduce((n, o) => n + o.amount, 0),
                        t.locale,
                      )}
                      hint="Pagamentos menos reembolsos"
                    />
                    <Metric
                      label={t('Em produção')}
                      value={String(
                        orders.filter((o) => o.status === 'IN_PRODUCTION')
                          .length,
                      )}
                      hint="Pedidos em preparação"
                    />
                    <Metric
                      label={t('Agentes activos')}
                      value={String(data.agents.filter((a) => a.active).length)}
                      hint="Equipa disponível"
                    />
                  </div>
                  <div className="manager-attention">
                    <button
                      onClick={() =>
                        navigate('operations', 'orders', 'pending')
                      }
                    >
                      <Package />
                      <span>
                        <strong>
                          {
                            data.orders.filter(
                              (o) =>
                                !['DELIVERED', 'CANCELLED'].includes(o.status),
                            ).length
                          }{' '}
                          {t('pedidos por concluir')}
                        </strong>
                        <small>{t('Acompanhar as próximas etapas')}</small>
                      </span>
                      <ArrowUpRight />
                    </button>
                    <button
                      onClick={() => navigate('operations', 'stock', 'low')}
                    >
                      <Boxes />
                      <span>
                        <strong>
                          {low}
                          {t(' produtos com stock baixo')}
                        </strong>
                        <small>
                          {t('Verificar disponibilidade e entradas')}
                        </small>
                      </span>
                      <ArrowUpRight />
                    </button>
                  </div>
                  <section className="manager-card">
                    <div className="manager-section-title">
                      <h2>{t('Pedidos recentes')}</h2>
                      <button onClick={() => navigate('operations')}>
                        {t('Ver pedidos ')}
                        <ArrowUpRight size={16} />
                      </button>
                    </div>
                    {table}
                  </section>
                  <section className="manager-card">
                    <h2>{t('Actividade recente')}</h2>
                    {data.audit.length ? (
                      <ul className="manager-activity">
                        {data.audit.slice(0, 8).map((a) => (
                          <li key={a.id}>
                            <strong>{t(a.action)}</strong>
                            <span>{a.subject}</span>
                            <small>
                              {date(a.created_at)} · {a.actor}
                            </small>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="manager-empty">
                        {t('As alterações da equipa aparecerão aqui.')}
                      </p>
                    )}
                  </section>
                </>
              )}
              {section === 'operations' && (
                <>
                  <OperationsAgentReports />
                  <Tabs
                    value={tab}
                    onChange={(v) => {
                      setTab(v);
                      setFilter('all');
                      setSearch('');
                    }}
                    items={[
                      ['orders', 'Pedidos'],
                      ['agents', 'Agentes'],
                      ['stock', 'Stock'],
                    ]}
                  />
                  <div className="manager-toolbar">
                    <label className="manager-search">
                      <Search size={16} />
                      <input
                        aria-label={t('Pesquisar')}
                        placeholder={t('Pesquisar…')}
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                      />
                    </label>
                    {tab === 'orders' ? (
                      <select
                        aria-label={t('Estado do pedido')}
                        value={filter}
                        onChange={(e) => setFilter(e.target.value)}
                      >
                        <option value="all">{t('Todos os estados')}</option>
                        <option value="pending">{t('Por concluir')}</option>
                        {Object.entries(orderLabels).map(([k, v]) => (
                          <option key={k} value={k}>
                            {t(v)}
                          </option>
                        ))}
                      </select>
                    ) : tab === 'agents' ? (
                      <button
                        className="manager-primary"
                        onClick={() => {
                          setEditKind('agent');
                          setEditing({
                            id: crypto.randomUUID(),
                            name: '',
                            email: '',
                            phone: '',
                            active: true,
                            version: 0,
                          });
                        }}
                      >
                        <Plus size={16} />
                        {t(' Novo agente')}
                      </button>
                    ) : (
                      <select
                        aria-label={t('Disponibilidade de stock')}
                        value={filter}
                        onChange={(e) => setFilter(e.target.value)}
                      >
                        <option value="all">{t('Todos os produtos')}</option>
                        <option value="low">{t('Stock baixo (≤ 5)')}</option>
                      </select>
                    )}
                  </div>
                  {tab === 'orders' && (
                    <div className="manager-toolbar">
                      <p className="manager-muted">
                        {t('Em atraso: pedido por concluir há mais de')}{' '}
                        {progressHours}
                        {t(
                          ' horas desde a submissão. Referência de acompanhamento, não prazo de entrega contratado.',
                        )}
                      </p>
                      <label>
                        {t('Prazo de referência')}
                        <select
                          value={progressHours}
                          onChange={(e) =>
                            setProgressHours(Number(e.target.value))
                          }
                        >
                          {[24, 48, 72, 120, 168].map((h) => (
                            <option key={h} value={h}>
                              {h}
                              {t(' horas')}
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>
                  )}
                  <section className="manager-card">
                    {tab === 'orders' ? (
                      table
                    ) : tab === 'agents' ? (
                      <div className="manager-table-scroll">
                        <table>
                          <thead>
                            <tr>
                              <th>{t('Agente')}</th>
                              <th>{t('Contacto')}</th>
                              <th>{t('Pedidos atribuídos')}</th>
                              <th>{t('Estado')}</th>
                              <th>{t('Acções')}</th>
                            </tr>
                          </thead>
                          <tbody>
                            {data.agents
                              .filter((a) => matches(a.name + ' ' + a.email))
                              .map((a) => (
                                <tr key={a.id}>
                                  <td>
                                    <strong>{a.name}</strong>
                                  </td>
                                  <td>
                                    {a.email}
                                    <small>{a.phone}</small>
                                  </td>
                                  <td>
                                    {
                                      data.orders.filter(
                                        (o) =>
                                          (o.agentId === a.id ||
                                            (!o.agentId &&
                                              o.agent === a.name)) &&
                                          !['DELIVERED', 'CANCELLED'].includes(
                                            o.status,
                                          ),
                                      ).length
                                    }
                                  </td>
                                  <td>
                                    {a.active ? t('Activo') : t('Inactivo')}
                                  </td>
                                  <td>
                                    <button
                                      onClick={() => {
                                        setEditKind('agent');
                                        setEditing(a);
                                      }}
                                    >
                                      {t('Editar')}
                                    </button>
                                    <button
                                      className="manager-secondary"
                                      style={{ marginLeft: 12 }}
                                      disabled={busy}
                                      onClick={() =>
                                        void save({
                                          ...a,
                                          action: 'agent',
                                          active: !a.active,
                                        })
                                      }
                                    >
                                      {a.active
                                        ? t('Desactivar')
                                        : t('Reactivar')}
                                    </button>
                                  </td>
                                </tr>
                              ))}
                          </tbody>
                        </table>
                        {!data.agents.length && (
                          <p className="manager-empty">
                            {t(
                              'Adicione o primeiro agente para atribuir pedidos à sua equipa.',
                            )}
                          </p>
                        )}
                      </div>
                    ) : (
                      <>
                        <p className="manager-muted">
                          {t(
                            'Disponível = físico − reservado. Pedidos pagos reservam uma unidade; a entrega regista a saída. Registe o stock inicial antes de confirmar novos pagamentos.',
                          )}
                        </p>
                        <button
                          className="manager-primary"
                          disabled={!data.products.length}
                          onClick={() => {
                            setStockMode('entry');
                            setStockAgent('');
                            setStock(data.products[0]);
                          }}
                        >
                          <Plus size={16} />
                          {t(' Adicionar stock')}
                        </button>
                        <div className="manager-table-scroll">
                          <table>
                            <thead>
                              <tr>
                                <th>{t('Produto')}</th>
                                <th>{t('Físico')}</th>
                                <th>{t('Reservado')}</th>
                                <th>{t('Disponível')}</th>
                                <th>{t('Acções')}</th>
                              </tr>
                            </thead>
                            <tbody>
                              {stockRows
                                .filter(
                                  (p) =>
                                    matches(p.name) &&
                                    (filter !== 'low' || p.free <= 5),
                                )
                                .map((p) => (
                                  <tr key={p.id}>
                                    <td>
                                      <strong>{t(p.name)}</strong>
                                    </td>
                                    <td>{p.onHand}</td>
                                    <td>{p.reserved}</td>
                                    <td>
                                      <span
                                        className={
                                          p.free <= 5 ? 'manager-badge' : ''
                                        }
                                      >
                                        {p.free}
                                      </span>
                                    </td>
                                    <td>
                                      <button
                                        onClick={() => {
                                          setStockMode('entry');
                                          setStockAgent('');
                                          setStock(p);
                                        }}
                                      >
                                        {t('Adicionar / atribuir')}
                                      </button>
                                    </td>
                                  </tr>
                                ))}
                            </tbody>
                          </table>
                        </div>
                        <h3>{t('Stock por agente')}</h3>
                        <p className="manager-muted">
                          {t(
                            'As reservas de pedidos sem agente estão incluídas no total do produto. Ao atribuir um pedido, a unidade passa para o agente.',
                          )}
                        </p>
                        <div className="manager-table-scroll">
                          <table>
                            <thead>
                              <tr>
                                <th>{t('Local / agente')}</th>
                                <th>{t('Produto')}</th>
                                <th>{t('Físico')}</th>
                                <th>{t('Reservado')}</th>
                                <th>{t('Disponível')}</th>
                              </tr>
                            </thead>
                            <tbody>
                              {[
                                { id: '', name: 'Stock central', active: true },
                                ...data.agents,
                              ].flatMap((a) =>
                                data.products.map((p) => {
                                  const physical = data.movements
                                    .filter(
                                      (m) =>
                                        m.product_id === p.id &&
                                        (m.agent_id ?? '') === a.id,
                                    )
                                    .reduce((n, m) => n + m.quantity, 0);
                                  const reserved = data.orders.filter(
                                    (o) =>
                                      o.productId === p.id &&
                                      !!o.agentId &&
                                      (o.agentId ?? '') === a.id &&
                                      [
                                        'QUEUED',
                                        'IN_PRODUCTION',
                                        'READY',
                                      ].includes(o.status),
                                  ).length;
                                  return physical || reserved ? (
                                    <tr key={a.id + p.id}>
                                      <td>
                                        {a.name}
                                        {!a.active ? t(' · Inactivo') : ''}
                                      </td>
                                      <td>{t(p.name)}</td>
                                      <td>{physical}</td>
                                      <td>{reserved}</td>
                                      <td>{physical - reserved}</td>
                                    </tr>
                                  ) : null;
                                }),
                              )}
                            </tbody>
                          </table>
                        </div>
                        <h3>{t('Últimos movimentos')}</h3>
                        <ul className="manager-activity">
                          {data.movements.slice(0, 10).map((m) => (
                            <li key={m.id}>
                              <strong>
                                {m.quantity > 0 ? '+' : ''}
                                {m.quantity} ·{' '}
                                {data.products.find(
                                  (p) => p.id === m.product_id,
                                )?.name ?? m.product_id}
                              </strong>
                              <span>
                                {m.reason}
                                <small>
                                  {m.agent_id
                                    ? (data.agents.find(
                                        (a) => a.id === m.agent_id,
                                      )?.name ?? m.agent_id)
                                    : t('Stock central')}
                                </small>
                              </span>
                              <small>
                                {date(m.created_at)} · {m.actor}
                              </small>
                            </li>
                          ))}
                        </ul>
                      </>
                    )}
                  </section>
                </>
              )}
              {section === 'catalog' && (
                <>
                  <Tabs
                    value={tab}
                    onChange={setTab}
                    items={[
                      ['products', 'Produtos'],
                      ['plans', 'Planos mensais'],
                    ]}
                  />
                  {tab === 'products' ? (
                    <ProductManager onSaved={() => void load()} />
                  ) : (
                    <>
                      <div className="manager-toolbar">
                        <p className="manager-muted">
                          {t(
                            'Alterações aplicam-se às novas adesões. Os clientes existentes mantêm as condições acordadas.',
                          )}
                        </p>
                        <button
                          className="manager-primary"
                          onClick={() => {
                            setEditKind('plan');
                            setEditing({
                              id: 'plan-' + crypto.randomUUID(),
                              name: '',
                              audience: '',
                              description: '',
                              meticais: 63.91,
                              links: 3,
                              bio: 0,
                              active: true,
                              version: 0,
                            });
                          }}
                        >
                          <Plus size={16} />
                          {t(' Novo plano')}
                        </button>
                      </div>
                      <div className="manager-plan-grid">
                        {data.plans.map((p) => (
                          <article className="manager-card" key={p.id}>
                            <span className="manager-eyebrow">
                              {p.active ? t('DISPONÍVEL') : t('INACTIVO')}
                            </span>
                            <h2>{t(p.name)}</h2>
                            <p className="manager-plan-price">
                              {planPrice(p, t.locale)}
                              <small>{t(' / mês')}</small>
                            </p>
                            <p>{t(p.description)}</p>
                            <p>
                              <strong>
                                {p.links}
                                {t(' links')}
                              </strong>{' '}
                              · {p.bio} {t('caracteres de biografia')}
                            </p>
                            <button
                              className="manager-secondary"
                              onClick={() => {
                                setEditKind('plan');
                                setEditing(p);
                              }}
                            >
                              {t('Editar plano')}
                            </button>
                          </article>
                        ))}
                      </div>
                    </>
                  )}
                </>
              )}
              {section === 'finance' && (
                <>
                  <div className="manager-metrics">
                    <Metric
                      label={t('Por receber')}
                      value={money(
                        orders
                          .filter((o) => !o.paid && o.status !== 'CANCELLED')
                          .reduce((n, o) => n + o.amount, 0),
                        t.locale,
                      )}
                    />
                    <Metric
                      label={t('Receita reconhecida')}
                      value={money(
                        orders
                          .filter((o) => o.status === 'DELIVERED')
                          .reduce((n, o) => n + o.amount, 0),
                        t.locale,
                      )}
                    />
                    <Metric
                      label={t('Custos reconhecidos')}
                      value={money(
                        orders
                          .filter((o) => o.status === 'DELIVERED')
                          .reduce((n, o) => n + o.cost, 0),
                        t.locale,
                      )}
                    />
                    <Metric
                      label={t('Margem bruta')}
                      value={money(
                        orders
                          .filter((o) => o.status === 'DELIVERED')
                          .reduce((n, o) => n + o.amount - o.cost, 0),
                        t.locale,
                      )}
                    />
                  </div>
                  <section className="manager-card">
                    <h2>{t('Pagamentos e reembolsos')}</h2>
                    <p className="manager-muted">
                      {t(
                        'A receita e o custo são reconhecidos na entrega. Os relatórios usam a data de criação do pedido. Não são demonstrações financeiras oficiais.',
                      )}
                    </p>
                    {table}
                  </section>
                </>
              )}
            </>
          )}
        </main>
      </div>
      <Dialog
        open={!!selected}
        onOpenChange={(open) => {
          if (!open && !busy) setSelected(null);
        }}
      >
        <DialogContent className="manager-dialog">
          <DialogTitle>{selected?.productName}</DialogTitle>
          <DialogDescription>
            {t('Pedido #')}
            {selected?.id.slice(0, 8)}
            {t(' · Acompanhamento da encomenda')}
          </DialogDescription>
          {selected && (
            <>
              <p>
                <span className="manager-badge">
                  {t(orderLabels[selected.status])}
                </span>{' '}
                · {money(selected.amount, t.locale)}
              </p>
              <p>
                {t('Submetido:')}{' '}
                <time dateTime={selected.createdAt}>
                  {submissionTime(selected.createdAt, t.locale)}
                </time>{' '}
                {t('(Maputo)')}
              </p>
              <p>
                {t('Progresso: ')}
                {t(orderProgress(selected, now, progressHours).label)}
                {t(' · Referência: ')}
                {progressHours}
                {t(' horas')}
              </p>
              <p>
                <strong>{t('Local de entrega:')}</strong>{' '}
                {selected.deliveryCity || t('A aguardar informação do cliente')}
              </p>
              {selected.deliveryAddress && <p>{selected.deliveryAddress}</p>}
              {selected.deliveryContact && (
                <p>
                  {t('Contacto de entrega: ')}
                  {selected.deliveryContact}
                </p>
              )}
              {selected.checkoutPlan && (
                <p>
                  {t('Plano associado: ')}
                  {t(selected.checkoutPlan.name)} ·{' '}
                  {planPrice(selected.checkoutPlan, t.locale)}
                  {t('/mês · até')} {selected.checkoutPlan.links}
                  {t(' links')}
                </p>
              )}
              <p>
                {t('Agente: ')}
                {selected.agent || t('Por atribuir')}
              </p>
              {selected.fulfilment && (
                <section>
                  <h3>{t('Execução do agente')}</h3>
                  <p>
                    {t('Programação:')}{' '}
                    {selected.fulfilment.programmedAt
                      ? date(selected.fulfilment.programmedAt)
                      : t('Pendente')}{' '}
                    {t('· Qualidade:')}{' '}
                    {selected.fulfilment.checkedAt
                      ? date(selected.fulfilment.checkedAt)
                      : t('Pendente')}{' '}
                    {t('· Embalagem:')}{' '}
                    {selected.fulfilment.packagedAt
                      ? date(selected.fulfilment.packagedAt)
                      : t('Pendente')}
                  </p>
                  <p>
                    {t('Expedição:')}{' '}
                    {selected.fulfilment.dispatchedAt
                      ? date(selected.fulfilment.dispatchedAt)
                      : t('Pendente')}{' '}
                    · {selected.fulfilment.courier} ·{' '}
                    {selected.fulfilment.tracking}
                  </p>
                  {selected.fulfilment.note && (
                    <p>
                      {t('Nota: ')}
                      {selected.fulfilment.note}
                    </p>
                  )}
                </section>
              )}
              {selected.design && <OrderArtwork order={selected} />}
              <ProfileHandoff
                key={selected.id}
                approvedUrl={selected.approvedUrl}
                username={
                  selected.profileUsername ?? selected.profile?.username
                }
                published={!!selected.profile}
                operations
              />
              {error && (
                <p role="alert" className="manager-error">
                  {t(error)}
                </p>
              )}
              <div className="manager-order-actions">
                {['PENDING_PAYMENT', 'CANCELLED'].includes(selected.status) && (
                  <fieldset disabled={busy}>
                    <legend>{t('Verificação da transacção')}</legend>
                    <label>
                      {t('Referência única no prestador')}
                      <input
                        value={paymentReference}
                        onChange={(e) => setPaymentReference(e.target.value)}
                        maxLength={120}
                      />
                    </label>
                    <label>
                      <input
                        type="checkbox"
                        checked={verifiedInProvider}
                        onChange={(e) =>
                          setVerifiedInProvider(e.target.checked)
                        }
                      />
                      {t('Verifiquei no prestador o valor de')}{' '}
                      {money(selected.amount, t.locale)}
                      {t(', a moeda MZN e a referência desta encomenda.')}
                    </label>
                    <p>
                      {t(
                        'Registar aqui não cobra nem devolve dinheiro. Confirme a operação no prestador antes de continuar.',
                      )}
                    </p>
                  </fieldset>
                )}

                {selected.status === 'PENDING_PAYMENT' && (
                  <button
                    disabled={busy}
                    className="manager-primary"
                    onClick={() =>
                      void save({
                        action: 'order',
                        orderId: selected.id,
                        version: selected.version,
                        step: 'pay',
                        paymentReference,
                        verifiedInProvider,
                        verifiedAmount: selected.amount,
                        currency: 'MZN',
                      })
                    }
                  >
                    {t('Registar pagamento verificado')}
                  </button>
                )}
                {selected.status === 'QUEUED' && (
                  <>
                    <label>
                      {t('Agente')}
                      <select
                        value={agentId}
                        onChange={(e) => setAgentId(e.target.value)}
                      >
                        <option value="">
                          {t('Seleccionar agente activo')}
                        </option>
                        {data?.agents
                          .filter((a) => a.active)
                          .map((a) => (
                            <option key={a.id} value={a.id}>
                              {a.name}
                            </option>
                          ))}
                      </select>
                    </label>
                    <button
                      disabled={busy || !agentId}
                      className="manager-secondary"
                      onClick={() =>
                        void save({
                          action: 'order',
                          orderId: selected.id,
                          version: selected.version,
                          step: 'assign',
                          agentId,
                        })
                      }
                    >
                      {t('Guardar atribuição')}
                    </button>
                  </>
                )}
                {selected.paid && selected.agentId && (
                  <AgentAction
                    order={agentOrderView(
                      selected,
                      typeof window === 'undefined'
                        ? 'https://framyconnect.co.mz'
                        : window.location.origin,
                    )}
                    busy={busy}
                    onSave={save}
                  />
                )}
                {selected.status === 'DELIVERED' && (
                  <p>
                    {t('Entrega concluída: ')}
                    {selected.proof}
                  </p>
                )}
                {['PENDING_PAYMENT', 'QUEUED'].includes(selected.status) && (
                  <button
                    disabled={busy}
                    className="manager-secondary"
                    onClick={() =>
                      void save({
                        action: 'order',
                        orderId: selected.id,
                        version: selected.version,
                        step: 'cancel',
                      })
                    }
                  >
                    {t('Cancelar pedido')}
                  </button>
                )}
                {selected.status === 'CANCELLED' &&
                  selected.paid &&
                  !selected.refunded && (
                    <button
                      disabled={busy}
                      className="manager-secondary"
                      onClick={() =>
                        void save({
                          action: 'order',
                          orderId: selected.id,
                          version: selected.version,
                          step: 'refund',
                          paymentReference,
                          verifiedInProvider,
                          verifiedAmount: selected.amount,
                          currency: 'MZN',
                        })
                      }
                    >
                      {t('Registar reembolso verificado')}
                    </button>
                  )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
      <Dialog
        open={!!editing}
        onOpenChange={(open) => {
          if (!open && !busy) setEditing(null);
        }}
      >
        <DialogContent className="manager-dialog">
          <DialogTitle>
            {editKind === 'agent' ? t('Agente') : t('Plano mensal')}
          </DialogTitle>
          <DialogDescription>
            {editKind === 'agent'
              ? t('Dados da equipa e disponibilidade.')
              : t('Condições para novas adesões, em meticais por mês.')}
          </DialogDescription>
          {editing && (
            <form
              key={editing.id}
              onSubmit={(e) => {
                e.preventDefault();
                const form = new FormData(e.currentTarget);
                const values = Object.fromEntries(form);
                void save({
                  ...values,
                  action: editKind,
                  id: editing.id,
                  version: editing.version,
                  active: form.has('active'),
                  ...(editKind === 'plan'
                    ? {
                        meticais: Number(values.meticais),
                        links: Number(values.links),
                        bio: Number(values.bio),
                      }
                    : {}),
                });
              }}
            >
              <fieldset disabled={busy}>
                {error && (
                  <p role="alert" className="manager-error">
                    {t(error)}
                  </p>
                )}
                <label>
                  {t('Nome')}
                  <input
                    name="name"
                    required
                    maxLength={90}
                    defaultValue={editing.name}
                  />
                </label>
                {editKind === 'agent' ? (
                  <>
                    <label>
                      {t('Email')}
                      <input
                        name="email"
                        type="email"
                        maxLength={160}
                        defaultValue={(editing as Agent).email}
                      />
                    </label>
                    <label>
                      {t('Telefone')}
                      <input
                        name="phone"
                        maxLength={50}
                        defaultValue={(editing as Agent).phone}
                      />
                    </label>
                  </>
                ) : (
                  <>
                    <label>
                      {t('Público')}
                      <input
                        name="audience"
                        required
                        maxLength={90}
                        defaultValue={(editing as ManagedPlan).audience}
                      />
                    </label>
                    <label>
                      {t('Descrição')}
                      <textarea
                        name="description"
                        required
                        maxLength={2000}
                        defaultValue={(editing as ManagedPlan).description}
                      />
                    </label>
                    <label>
                      {t('MT / mês')}
                      <input
                        type="number"
                        name="meticais"
                        min={
                          (editing as ManagedPlan).id === 'free-30' ? '0' : '1'
                        }
                        max="10000"
                        step="0.01"
                        required
                        defaultValue={planMeticais(editing as ManagedPlan)}
                      />
                    </label>
                    <label>
                      {t('Número de links')}
                      <input
                        type="number"
                        name="links"
                        min="1"
                        max="50"
                        required
                        defaultValue={(editing as ManagedPlan).links}
                      />
                    </label>
                    <label>
                      {t('Caracteres da biografia')}
                      <input
                        type="number"
                        name="bio"
                        min="0"
                        max="1200"
                        required
                        defaultValue={(editing as ManagedPlan).bio}
                      />
                    </label>
                  </>
                )}
                <label className="manager-check">
                  <input
                    name="active"
                    type="checkbox"
                    defaultChecked={editing.active}
                  />{' '}
                  {t('Activo')}
                </label>
                <button className="manager-primary" type="submit">
                  {busy ? t('A guardar…') : t('Guardar')}
                </button>
              </fieldset>
            </form>
          )}
        </DialogContent>
      </Dialog>
      <Dialog
        open={!!stock}
        onOpenChange={(open) => {
          if (!open && !busy) setStock(null);
        }}
      >
        <DialogContent className="manager-dialog">
          <DialogTitle>{t('Adicionar ou atribuir stock')}</DialogTitle>
          <DialogDescription>
            {t(
              'Registe novas unidades ou transfira stock existente sem alterar o total.',
            )}
          </DialogDescription>
          {stock && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const f = new FormData(e.currentTarget);
                void save({
                  action: stockMode === 'entry' ? 'stock' : 'stock-transfer',
                  agentId: stockMode === 'return' ? '' : stockAgent,
                  fromAgentId: stockMode === 'return' ? stockAgent : '',
                  id: crypto.randomUUID(),
                  productId: stock.id,
                  quantity: Number(f.get('quantity')),
                  reason: f.get('reason'),
                });
              }}
            >
              <fieldset disabled={busy}>
                {error && (
                  <p role="alert" className="manager-error">
                    {t(error)}
                  </p>
                )}
                <label>
                  {t('Produto')}
                  <select
                    value={stock.id}
                    onChange={(e) =>
                      setStock(
                        data!.products.find((p) => p.id === e.target.value)!,
                      )
                    }
                  >
                    {data?.products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {t(p.name)}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  {t('Operação')}
                  <select
                    value={stockMode}
                    onChange={(e) => {
                      setStockMode(e.target.value);
                      setStockAgent('');
                    }}
                  >
                    <option value="entry">{t('Entrada de novo stock')}</option>
                    <option value="assign">
                      {t('Atribuir stock central a um agente')}
                    </option>
                    <option value="return">
                      {t('Devolver stock de agente ao central')}
                    </option>
                  </select>
                </label>
                <label>
                  {stockMode === 'return'
                    ? t('Agente de origem')
                    : t('Destino')}
                  <select
                    required={stockMode !== 'entry'}
                    value={stockAgent}
                    onChange={(e) => setStockAgent(e.target.value)}
                  >
                    <option value="">
                      {stockMode === 'entry'
                        ? t('Stock central')
                        : t('Seleccionar agente')}
                    </option>
                    {data?.agents
                      .filter((a) => a.active || stockMode === 'return')
                      .map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.name}
                          {!a.active ? t(' · Inactivo') : ''}
                        </option>
                      ))}
                  </select>
                </label>
                <label>
                  {t('Quantidade')}
                  <input
                    required
                    name="quantity"
                    type="number"
                    min="1"
                    max="100000"
                    step="1"
                  />
                </label>
                <label>
                  {t('Motivo')}
                  <input
                    required
                    name="reason"
                    maxLength={250}
                    placeholder={t('Stock inicial, reposição ou ajuste')}
                  />
                </label>
                <button className="manager-primary">
                  {t('Registar movimento')}
                </button>
              </fieldset>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
function Metric({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  const { t } = useI18n();
  return (
    <article className="manager-card manager-metric">
      <span>{t(label)}</span>
      <strong>{value}</strong>
      {hint && <small>{t(hint)}</small>}
    </article>
  );
}
function Tabs({
  items,
  value,
  onChange,
}: {
  items: string[][];
  value: string;
  onChange: (v: string) => void;
}) {
  const { t } = useI18n();
  return (
    <nav className="manager-tabs" aria-label={t('Secções')}>
      {items.map(([id, label]) => (
        <button
          key={id}
          aria-current={value === id ? 'page' : undefined}
          onClick={() => onChange(id)}
        >
          {t(label)}
        </button>
      ))}
    </nav>
  );
}
