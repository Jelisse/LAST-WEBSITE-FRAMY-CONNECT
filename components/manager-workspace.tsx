'use client';
import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
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
  X,
} from 'lucide-react';
import { ProfileHandoff } from './profile-handoff';
import { AccountMenu } from './account-menu';
import { ProductManager } from './product-manager';
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
  { id: 'finance', label: 'Financeiro', icon: Wallet },
];
const date = (v: string) => new Date(v).toLocaleString('pt-PT');
export function ManagerWorkspace({ displayName }: { displayName: string }) {
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
    [proof, setProof] = useState(''),
    [qc, setQc] = useState(false);
  const load = useCallback(async () => {
    const r = await fetch('/api/manager', { cache: 'no-store' });
    const d = (await r.json()) as Data & { error?: string };
    if (!r.ok) throw Error(d.error ?? 'Não foi possível carregar.');
    setData(d);
    return d as Data;
  }, []);
  useEffect(() => {
    void load().catch((e) => setError(e.message));
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
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Não foi possível guardar.');
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
      Date.now() - new Date(o.createdAt).getTime() <= Number(days) * 86400000,
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
    setProof('');
    setQc(false);
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
        submissionTime(o.createdAt),
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
            <th>Pedido / cliente</th>
            <th>Submetido (Maputo)</th>
            <th>Local de entrega</th>
            <th>Progresso</th>
            <th>Estado</th>
            <th>Pagamento</th>
            <th>Valor</th>
            <th>Agente</th>
            <th>
              <span className="sr-only">Detalhes</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {orderRows
            .slice(0, section === 'overview' ? 6 : undefined)
            .map((o) => (
              <tr key={o.id}>
                <td>
                  <strong>{o.productName}</strong>
                  <small>
                    #{o.id.slice(0, 8)} · {o.profile?.name ?? o.ownerId}
                  </small>
                </td>
                <td>
                  <time dateTime={o.createdAt}>
                    {submissionTime(o.createdAt)}
                  </time>
                </td>
                <td>
                  <strong>{o.deliveryCity || 'Não indicado'}</strong>
                </td>
                <td>
                  <span
                    className={`manager-progress manager-progress-${orderProgress(o, now, progressHours).tone}`}
                  >
                    {orderProgress(o, now, progressHours).label}
                  </span>
                  {orderProgress(o, now, progressHours).elapsed && (
                    <small>
                      Há {orderProgress(o, now, progressHours).elapsed}
                    </small>
                  )}
                </td>
                <td>
                  <span className="manager-badge">{orderLabels[o.status]}</span>
                </td>
                <td>
                  {o.refunded ? 'Reembolsado' : o.paid ? 'Pago' : 'Por pagar'}
                </td>
                <td>{money(o.amount)}</td>
                <td>{o.agent || 'Por atribuir'}</td>
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
        <p className="manager-empty">Nenhum pedido corresponde à selecção.</p>
      )}
    </div>
  );
  return (
    <div className="manager-shell">
      <aside className="manager-sidebar">
        <Link href="/" aria-label="Página inicial">
          <img src="/brand/logo.svg" alt="Framy Connect" />
        </Link>
        <span className="manager-eyebrow">MANAGER</span>
        <nav aria-label="Gestão">
          {sections.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              aria-current={section === id ? 'page' : undefined}
              onClick={() => navigate(id)}
            >
              <Icon size={20} />
              {label}
              <ChevronRight size={15} />
            </button>
          ))}
        </nav>
        <div className="manager-sidebar-bottom">
          <strong>{displayName}</strong>
          <small>Gestão Framy Connect</small>
          <Link href="/">
            Ver website <ArrowUpRight size={15} />
          </Link>
        </div>
      </aside>
      <div className="manager-body">
        <header className="manager-top">
          <span>
            Manager{' '}
            <span>/ {sections.find((s) => s.id === section)?.label}</span>
          </span>
          <AccountMenu />
        </header>
        <main id="main" className="manager-main">
          <div className="manager-heading">
            <div>
              <span className="manager-eyebrow">CENTRO DE GESTÃO</span>
              <h1>{sections.find((s) => s.id === section)?.label}</h1>
              <p>
                {section === 'overview'
                  ? 'O que acontece no seu negócio, num só lugar.'
                  : section === 'operations'
                    ? 'Ligue os pedidos, a equipa e o stock.'
                    : section === 'catalog'
                      ? 'Os produtos e as subscrições que oferece aos seus clientes.'
                      : 'Acompanhe os valores recebidos, pendentes e reconhecidos.'}
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
              <RefreshCw size={16} /> Actualizar
            </button>
          </div>
          <p className="manager-sandbox">
            Ambiente de desenvolvimento · Pedidos e pagamentos simulados.
            Valores de produtos em MZN; planos mensais em USD.
          </p>
          {error && (
            <p role="alert" className="manager-error">
              {error}
            </p>
          )}
          {notice && (
            <p role="status" className="manager-notice">
              {notice}
            </p>
          )}
          {!data ? (
            <section className="manager-card">
              <p>
                {error
                  ? 'O Manager requer uma conta autorizada.'
                  : 'A carregar o seu espaço de gestão…'}
              </p>
            </section>
          ) : (
            <>
              {(section === 'overview' || section === 'finance') && (
                <div className="manager-toolbar">
                  <label>
                    Período{' '}
                    <select
                      value={days}
                      onChange={(e) => setDays(e.target.value)}
                    >
                      <option value="all">Todo o período</option>
                      <option value="7">Últimos 7 dias</option>
                      <option value="30">Últimos 30 dias</option>
                      <option value="90">Últimos 90 dias</option>
                    </select>
                  </label>
                  <button className="manager-secondary" onClick={exportReport}>
                    <Download size={16} /> Exportar relatório
                  </button>
                </div>
              )}
              {section === 'overview' && (
                <>
                  <div className="manager-metrics">
                    <Metric
                      label="Pedidos"
                      value={String(orders.length)}
                      hint="No período seleccionado"
                    />
                    <Metric
                      label="Recebido líquido"
                      value={money(
                        orders
                          .filter((o) => o.paid && !o.refunded)
                          .reduce((n, o) => n + o.amount, 0),
                      )}
                      hint="Pagamentos menos reembolsos"
                    />
                    <Metric
                      label="Em produção"
                      value={String(
                        orders.filter((o) => o.status === 'IN_PRODUCTION')
                          .length,
                      )}
                      hint="Pedidos em preparação"
                    />
                    <Metric
                      label="Agentes activos"
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
                          pedidos por concluir
                        </strong>
                        <small>Acompanhar as próximas etapas</small>
                      </span>
                      <ArrowUpRight />
                    </button>
                    <button
                      onClick={() => navigate('operations', 'stock', 'low')}
                    >
                      <Boxes />
                      <span>
                        <strong>{low} produtos com stock baixo</strong>
                        <small>Verificar disponibilidade e entradas</small>
                      </span>
                      <ArrowUpRight />
                    </button>
                  </div>
                  <section className="manager-card">
                    <div className="manager-section-title">
                      <h2>Pedidos recentes</h2>
                      <button onClick={() => navigate('operations')}>
                        Ver pedidos <ArrowUpRight size={16} />
                      </button>
                    </div>
                    {table}
                  </section>
                  <section className="manager-card">
                    <h2>Actividade recente</h2>
                    {data.audit.length ? (
                      <ul className="manager-activity">
                        {data.audit.slice(0, 8).map((a) => (
                          <li key={a.id}>
                            <strong>{a.action}</strong>
                            <span>{a.subject}</span>
                            <small>
                              {date(a.created_at)} · {a.actor}
                            </small>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="manager-empty">
                        As alterações da equipa aparecerão aqui.
                      </p>
                    )}
                  </section>
                </>
              )}
              {section === 'operations' && (
                <>
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
                        aria-label="Pesquisar"
                        placeholder="Pesquisar…"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                      />
                    </label>
                    {tab === 'orders' ? (
                      <select
                        aria-label="Estado do pedido"
                        value={filter}
                        onChange={(e) => setFilter(e.target.value)}
                      >
                        <option value="all">Todos os estados</option>
                        <option value="pending">Por concluir</option>
                        {Object.entries(orderLabels).map(([k, v]) => (
                          <option key={k} value={k}>
                            {v}
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
                        <Plus size={16} /> Novo agente
                      </button>
                    ) : (
                      <select
                        aria-label="Disponibilidade de stock"
                        value={filter}
                        onChange={(e) => setFilter(e.target.value)}
                      >
                        <option value="all">Todos os produtos</option>
                        <option value="low">Stock baixo (≤ 5)</option>
                      </select>
                    )}
                  </div>
                  {tab === 'orders' && (
                    <div className="manager-toolbar">
                      <p className="manager-muted">
                        Em atraso: pedido por concluir há mais de{' '}
                        {progressHours} horas desde a submissão. Referência de
                        acompanhamento, não prazo de entrega contratado.
                      </p>
                      <label>
                        Prazo de referência
                        <select
                          value={progressHours}
                          onChange={(e) =>
                            setProgressHours(Number(e.target.value))
                          }
                        >
                          {[24, 48, 72, 120, 168].map((h) => (
                            <option key={h} value={h}>
                              {h} horas
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
                              <th>Agente</th>
                              <th>Contacto</th>
                              <th>Pedidos atribuídos</th>
                              <th>Estado</th>
                              <th />
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
                                  <td>{a.active ? 'Activo' : 'Inactivo'}</td>
                                  <td>
                                    <button
                                      onClick={() => {
                                        setEditKind('agent');
                                        setEditing(a);
                                      }}
                                    >
                                      Editar
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
                                      {a.active ? 'Desactivar' : 'Reactivar'}
                                    </button>
                                  </td>
                                </tr>
                              ))}
                          </tbody>
                        </table>
                        {!data.agents.length && (
                          <p className="manager-empty">
                            Adicione o primeiro agente para atribuir pedidos à
                            sua equipa.
                          </p>
                        )}
                      </div>
                    ) : (
                      <>
                        <p className="manager-muted">
                          Disponível = físico − reservado. Pedidos pagos
                          reservam uma unidade; a entrega regista a saída.
                          Registe o stock inicial antes de confirmar novos
                          pagamentos.
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
                          <Plus size={16} /> Adicionar stock
                        </button>
                        <div className="manager-table-scroll">
                          <table>
                            <thead>
                              <tr>
                                <th>Produto</th>
                                <th>Físico</th>
                                <th>Reservado</th>
                                <th>Disponível</th>
                                <th />
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
                                      <strong>{p.name}</strong>
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
                                        Adicionar / atribuir
                                      </button>
                                    </td>
                                  </tr>
                                ))}
                            </tbody>
                          </table>
                        </div>
                        <h3>Stock por agente</h3>
                        <p className="manager-muted">
                          As reservas de pedidos sem agente estão incluídas no
                          total do produto. Ao atribuir um pedido, a unidade
                          passa para o agente.
                        </p>
                        <div className="manager-table-scroll">
                          <table>
                            <thead>
                              <tr>
                                <th>Local / agente</th>
                                <th>Produto</th>
                                <th>Físico</th>
                                <th>Reservado</th>
                                <th>Disponível</th>
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
                                        {!a.active ? ' · Inactivo' : ''}
                                      </td>
                                      <td>{p.name}</td>
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
                        <h3>Últimos movimentos</h3>
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
                                    : 'Stock central'}
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
                          Alterações aplicam-se às novas adesões. Os clientes
                          existentes mantêm as condições acordadas.
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
                              dollars: 1,
                              links: 3,
                              bio: 0,
                              active: true,
                              version: 0,
                            });
                          }}
                        >
                          <Plus size={16} /> Novo plano
                        </button>
                      </div>
                      <div className="manager-plan-grid">
                        {data.plans.map((p) => (
                          <article className="manager-card" key={p.id}>
                            <span className="manager-eyebrow">
                              {p.active ? 'DISPONÍVEL' : 'INACTIVO'}
                            </span>
                            <h2>{p.name}</h2>
                            <p className="manager-plan-price">
                              ${p.dollars}
                              <small> USD / mês</small>
                            </p>
                            <p>{p.description}</p>
                            <p>
                              <strong>{p.links} links</strong> · {p.bio}{' '}
                              caracteres de biografia
                            </p>
                            <button
                              className="manager-secondary"
                              onClick={() => {
                                setEditKind('plan');
                                setEditing(p);
                              }}
                            >
                              Editar plano
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
                      label="Por receber"
                      value={money(
                        orders
                          .filter((o) => !o.paid && o.status !== 'CANCELLED')
                          .reduce((n, o) => n + o.amount, 0),
                      )}
                    />
                    <Metric
                      label="Receita reconhecida"
                      value={money(
                        orders
                          .filter((o) => o.status === 'DELIVERED')
                          .reduce((n, o) => n + o.amount, 0),
                      )}
                    />
                    <Metric
                      label="Custos reconhecidos"
                      value={money(
                        orders
                          .filter((o) => o.status === 'DELIVERED')
                          .reduce((n, o) => n + o.cost, 0),
                      )}
                    />
                    <Metric
                      label="Margem bruta"
                      value={money(
                        orders
                          .filter((o) => o.status === 'DELIVERED')
                          .reduce((n, o) => n + o.amount - o.cost, 0),
                      )}
                    />
                  </div>
                  <section className="manager-card">
                    <h2>Pagamentos e reembolsos</h2>
                    <p className="manager-muted">
                      A receita e o custo são reconhecidos na entrega. Os
                      relatórios usam a data de criação do pedido. Não são
                      demonstrações financeiras oficiais.
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
            Pedido #{selected?.id.slice(0, 8)} · Fluxo simulado
          </DialogDescription>
          {selected && (
            <>
              <p>
                <span className="manager-badge">
                  {orderLabels[selected.status]}
                </span>{' '}
                · {money(selected.amount)}
              </p>
              <p>
                Submetido:{' '}
                <time dateTime={selected.createdAt}>
                  {submissionTime(selected.createdAt)}
                </time>{' '}
                (Maputo)
              </p>
              <p>
                Progresso: {orderProgress(selected, now, progressHours).label} ·
                Referência: {progressHours} horas
              </p>
              <p>
                <strong>Local de entrega:</strong>{' '}
                {selected.deliveryCity || 'A aguardar informação do cliente'}
              </p>
              {selected.deliveryAddress && <p>{selected.deliveryAddress}</p>}
              {selected.deliveryContact && (
                <p>Contacto de entrega: {selected.deliveryContact}</p>
              )}
              {selected.checkoutPlan && (
                <p>
                  Plano associado: {selected.checkoutPlan.name} · US${' '}
                  {selected.checkoutPlan.dollars}/mês · até{' '}
                  {selected.checkoutPlan.links} links
                </p>
              )}
              <p>Agente: {selected.agent || 'Por atribuir'}</p>
              <ProfileHandoff
                key={selected.id}
                username={
                  selected.profileUsername ?? selected.profile?.username
                }
                published={!!selected.profile}
                operations
              />
              {error && (
                <p role="alert" className="manager-error">
                  {error}
                </p>
              )}
              <div className="manager-order-actions">
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
                      })
                    }
                  >
                    Confirmar pagamento simulado e reservar stock
                  </button>
                )}
                {selected.status === 'QUEUED' && (
                  <>
                    <label>
                      Agente
                      <select
                        value={agentId}
                        onChange={(e) => setAgentId(e.target.value)}
                      >
                        <option value="">Seleccionar agente activo</option>
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
                      Guardar atribuição
                    </button>
                    <button
                      disabled={busy || !selected.agent}
                      className="manager-primary"
                      onClick={() =>
                        void save({
                          action: 'order',
                          orderId: selected.id,
                          version: selected.version,
                          step: 'start',
                        })
                      }
                    >
                      Iniciar produção
                    </button>
                  </>
                )}
                {selected.status === 'IN_PRODUCTION' && (
                  <>
                    <label className="manager-check">
                      <input
                        type="checkbox"
                        checked={qc}
                        onChange={(e) => setQc(e.target.checked)}
                      />{' '}
                      Confirmei o NFC, o perfil, a identificação e o estado
                      físico do produto.
                    </label>
                    <button
                      disabled={busy || !qc}
                      className="manager-primary"
                      onClick={() =>
                        void save({
                          action: 'order',
                          orderId: selected.id,
                          version: selected.version,
                          step: 'ready',
                          qc,
                        })
                      }
                    >
                      Confirmar qualidade · Pronto para entrega
                    </button>
                  </>
                )}
                {selected.status === 'READY' && (
                  <>
                    <label>
                      Evidência de entrega
                      <input
                        value={proof}
                        maxLength={250}
                        onChange={(e) => setProof(e.target.value)}
                        placeholder="Confirmação de recepção ou referência"
                      />
                    </label>
                    <button
                      disabled={busy || proof.trim().length < 5}
                      className="manager-primary"
                      onClick={() =>
                        void save({
                          action: 'order',
                          orderId: selected.id,
                          version: selected.version,
                          step: 'deliver',
                          proof,
                        })
                      }
                    >
                      Confirmar entrega simulada
                    </button>
                  </>
                )}
                {selected.status === 'DELIVERED' && (
                  <p>Entrega concluída: {selected.proof}</p>
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
                    Cancelar pedido
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
                        })
                      }
                    >
                      Confirmar reembolso simulado
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
            {editKind === 'agent' ? 'Agente' : 'Plano mensal'}
          </DialogTitle>
          <DialogDescription>
            {editKind === 'agent'
              ? 'Dados da equipa e disponibilidade.'
              : 'Condições para novas adesões, em USD por mês.'}
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
                        dollars: Number(values.dollars),
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
                    {error}
                  </p>
                )}
                <label>
                  Nome
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
                      Email
                      <input
                        name="email"
                        type="email"
                        maxLength={160}
                        defaultValue={(editing as Agent).email}
                      />
                    </label>
                    <label>
                      Telefone
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
                      Público
                      <input
                        name="audience"
                        required
                        maxLength={90}
                        defaultValue={(editing as ManagedPlan).audience}
                      />
                    </label>
                    <label>
                      Descrição
                      <textarea
                        name="description"
                        required
                        maxLength={2000}
                        defaultValue={(editing as ManagedPlan).description}
                      />
                    </label>
                    <label>
                      USD / mês
                      <input
                        type="number"
                        name="dollars"
                        min="1"
                        max="10000"
                        step="0.01"
                        required
                        defaultValue={(editing as ManagedPlan).dollars}
                      />
                    </label>
                    <label>
                      Número de links
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
                      Caracteres da biografia
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
                  Activo
                </label>
                <button className="manager-primary" type="submit">
                  {busy ? 'A guardar…' : 'Guardar'}
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
          <DialogTitle>Adicionar ou atribuir stock</DialogTitle>
          <DialogDescription>
            Registe novas unidades ou transfira stock existente sem alterar o
            total.
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
                    {error}
                  </p>
                )}
                <label>
                  Produto
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
                        {p.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Operação
                  <select
                    value={stockMode}
                    onChange={(e) => {
                      setStockMode(e.target.value);
                      setStockAgent('');
                    }}
                  >
                    <option value="entry">Entrada de novo stock</option>
                    <option value="assign">
                      Atribuir stock central a um agente
                    </option>
                    <option value="return">
                      Devolver stock de agente ao central
                    </option>
                  </select>
                </label>
                <label>
                  {stockMode === 'return' ? 'Agente de origem' : 'Destino'}
                  <select
                    required={stockMode !== 'entry'}
                    value={stockAgent}
                    onChange={(e) => setStockAgent(e.target.value)}
                  >
                    <option value="">
                      {stockMode === 'entry'
                        ? 'Stock central'
                        : 'Seleccionar agente'}
                    </option>
                    {data?.agents
                      .filter((a) => a.active || stockMode === 'return')
                      .map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.name}
                          {!a.active ? ' · Inactivo' : ''}
                        </option>
                      ))}
                  </select>
                </label>
                <label>
                  Quantidade
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
                  Motivo
                  <input
                    required
                    name="reason"
                    maxLength={250}
                    placeholder="Stock inicial, reposição ou ajuste"
                  />
                </label>
                <button className="manager-primary">Registar movimento</button>
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
  return (
    <article className="manager-card manager-metric">
      <span>{label}</span>
      <strong>{value}</strong>
      {hint && <small>{hint}</small>}
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
  return (
    <nav className="manager-tabs" aria-label="Secções">
      {items.map(([id, label]) => (
        <button
          key={id}
          aria-current={value === id ? 'page' : undefined}
          onClick={() => onChange(id)}
        >
          {label}
        </button>
      ))}
    </nav>
  );
}
