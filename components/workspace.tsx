'use client';
import Image from 'next/image';
import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  ArrowUpRight,
  ChevronDown,
  LayoutDashboard,
  UserRound,
  Package,
  Settings2,
  BriefcaseBusiness,
  ChartNoAxesCombined,
  Wallet,
  RefreshCw,
  Plus,
  Save,
  Eye,
  Check,
  LogOut,
  Download,
  ShieldCheck,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CustomerOverview } from '@/components/customer-overview';
import { PlanPicker } from '@/components/plan-picker';
import { ProfileLinksEditor } from '@/components/profile-links-editor';
import { MobileProfile } from '@/components/mobile-profile';
import { IPhonePreview } from '@/components/iphone-preview';
import { ProfilePhotoUpload } from '@/components/profile-photo-upload';
import { ProfileHandoff } from '@/components/profile-handoff';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarInset,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import {
  blankProfile,
  financials,
  orderLabels,
  type Profile,
  type SandboxOrder,
  type PlanId,
  validatePlanContent,
  publicProfile,
} from '@/lib/domain';
import { validateDelivery } from '@/lib/delivery';
import { CustomerOrders, OrderProgressLine } from './customer-orders';
import { DeliveryEditor } from './delivery-editor';
import { usernameFromName } from '@/lib/domain';
import { money } from '@/lib/catalog';
import { ProductManager } from './product-manager';
import type { WorkspaceData } from '@/lib/profile-types';

const signOutHref = '/sair';
const menu = [
  { id: 'overview', label: 'Visão geral', icon: LayoutDashboard },
  { id: 'profile', label: 'A minha identidade', icon: UserRound },
  { id: 'orders', label: 'O meu pedido', icon: Package },
  { id: 'operations', label: 'Operações · teste', icon: Settings2 },
  { id: 'agent', label: 'Agente · teste', icon: BriefcaseBusiness },
  { id: 'ceo', label: 'CEO · teste', icon: ChartNoAxesCombined },
];
const date = (value: string) =>
  new Intl.DateTimeFormat('pt-MZ', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Africa/Maputo',
  }).format(new Date(value));
const payment = (o: SandboxOrder) =>
  o.refunded ? 'Reembolsado' : o.paid ? 'Pago (simulado)' : 'Por pagar';
function initials(name: string) {
  return (
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((s) => s[0])
      .join('')
      .toUpperCase() || 'FC'
  );
}
export function Workspace({ displayName }: { displayName: string }) {
  const [tab, setTab] = useState('overview'),
    [data, setData] = useState<WorkspaceData | null>(null),
    [profile, setProfile] = useState<Profile>(blankProfile),
    [loading, setLoading] = useState(true),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [notice, setNotice] = useState(''),
    [dirty, setDirty] = useState(false),
    [selected, setSelected] = useState<SandboxOrder | null>(null),
    [agent, setAgent] = useState(''),
    [proof, setProof] = useState(''),
    [checks, setChecks] = useState<boolean[]>([false, false, false, false]),
    [chosenProduct, setChosenProduct] = useState('metal'),
    [testToolsOpen, setTestToolsOpen] = useState(false),
    [plansOpen, setPlansOpen] = useState(false),
    [uploadingPhoto, setUploadingPhoto] = useState(false);
  const products = data?.products ?? [];
  const pendingCreate = useRef<string | null>(null);
  const load = useCallback(async (resetProfile = false) => {
    const r = await fetch('/api/workspace', { cache: 'no-store' });
    const d = (await r.json()) as WorkspaceData & { error?: string };
    if (!r.ok) throw new Error(d.error ?? 'Não foi possível carregar.');
    setData(d);
    if (resetProfile) setProfile(d.profile ?? blankProfile);
    return d as WorkspaceData;
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    void fetch('/api/workspace', {
      cache: 'no-store',
      signal: controller.signal,
    })
      .then(async (r) => {
        const d = (await r.json()) as WorkspaceData & { error?: string };
        if (!r.ok) throw new Error(d.error ?? 'Não foi possível carregar.');
        return d;
      })
      .then((d) => {
        setData(d);
        setProfile(d.profile ?? blankProfile);
        const routeTab: Record<string, string> = {
          '/perfil': 'profile',
          '/preview': 'profile',
          '/operations': 'operations',
          '/cofounder': 'ceo',
          '/agent': 'agent',
          '/finance': 'finance',
        };
        if (routeTab[window.location.pathname]) {
          setTab(routeTab[window.location.pathname]);
          setTestToolsOpen(
            ['operations', 'ceo', 'agent', 'finance'].includes(
              routeTab[window.location.pathname],
            ),
          );
        }
        if (new URLSearchParams(window.location.search).get('plans') === '1')
          setPlansOpen(true);
        const submittedId = new URLSearchParams(window.location.search).get(
          'order',
        );
        if (submittedId) {
          setTab('orders');
          setSelected(d.orders.find((o) => o.id === submittedId) ?? null);
        }
        const product = new URLSearchParams(window.location.search).get(
          'product',
        );
        if (
          product &&
          d.products.some((p) => p.id === product && p.available)
        ) {
          setChosenProduct(product);
          setTab('orders');
        }
      })
      .catch((e) => {
        if (!controller.signal.aborted) setError(e.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, []);
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (dirty) {
        e.preventDefault();
      }
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [dirty]);
  const canEditOrders =
    !!data?.canManageOrders && ['operations', 'agent'].includes(tab);
  const send = useCallback(
    async (payload: Record<string, unknown>) => {
      const response = await fetch('/api/workspace', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(canEditOrders ? { 'X-Framy-Order-Management': 'true' } : {}),
        },
        body: JSON.stringify(payload),
      });
      const result = (await response.json()) as {
        error?: string;
        ok?: boolean;
        id?: string;
      };
      if (!response.ok)
        throw new Error(result.error ?? 'Não foi possível guardar.');
      return result;
    },
    [canEditOrders],
  );
  const [orderCity, setOrderCity] = useState('');
  const create = useCallback(
    async (productId: string) => {
      if (!products.some((p) => p.id === productId && p.available))
        throw new Error('Produto de teste inválido.');
      const id = pendingCreate.current ?? crypto.randomUUID();
      pendingCreate.current = id;
      await send({
        action: 'create-order',
        id,
        productId,
        ...validateDelivery({ deliveryCity: orderCity }),
      });
      pendingCreate.current = null;
      const updated = await load();
      setNotice('Pedido de teste criado. Nenhum pagamento foi efectuado.');
      return updated.orders.find((o) => o.id === id);
    },
    [load, send, products, orderCity],
  );
  useEffect(() => {
    type Tool = {
      name: string;
      description: string;
      inputSchema: object;
      annotations: object;
      execute: (input: unknown) => Promise<unknown>;
    };
    const context = (
      document as unknown as {
        modelContext?: {
          registerTool: (
            tool: Tool,
            options: { signal: AbortSignal },
          ) => Promise<void> | void;
        };
      }
    ).modelContext;
    if (!context || !canEditOrders) return;
    const lifecycle = new AbortController();
    try {
      Promise.resolve(
        context.registerTool(
          {
            name: 'create_sandbox_order',
            description:
              'Cria um pedido de teste Framy Connect sem cobrança e actualiza a lista visível. Não cria uma compra real.',
            inputSchema: {
              type: 'object',
              properties: {
                productId: {
                  type: 'string',
                  enum: products.filter((p) => p.available).map((p) => p.id),
                },
              },
              required: ['productId'],
              additionalProperties: false,
            },
            annotations: { readOnlyHint: false, untrustedContentHint: false },
            execute: async (input) => {
              if (
                !input ||
                typeof input !== 'object' ||
                Object.keys(input).length !== 1 ||
                !('productId' in input) ||
                typeof input.productId !== 'string'
              )
                throw new Error('Indique productId.');
              const o = await create(input.productId);
              return { id: o?.id, status: o?.status, simulation: true };
            },
          },
          { signal: lifecycle.signal },
        ),
      ).catch(() => {});
    } catch {}
    return () => lifecycle.abort();
  }, [create, canEditOrders]);
  async function run(
    fn: () => Promise<unknown>,
    message = 'Alteração guardada.',
  ) {
    if (busy) return;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await fn();
      if (message) setNotice(message);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Tente novamente.');
    } finally {
      setBusy(false);
    }
  }
  async function save(action: string) {
    if (!data || uploadingPhoto) return;
    await run(
      async () => {
        await send({
          action,
          profile,
          version: data.profileVersion,
          autoUsername:
            data.profileVersion === 0 &&
            profile.username === usernameFromName(profile.name),
        });
        await load(true);
        setDirty(false);
      },
      action === 'publish-profile'
        ? 'Perfil publicado nesta prévia privada.'
        : action === 'unpublish-profile'
          ? 'Perfil retirado da publicação.'
          : 'Rascunho guardado.',
    );
  }
  function openPlans() {
    setError('');
    setPlansOpen(true);
  }
  async function selectPlan(planId: PlanId) {
    if (!data) return;
    await run(async () => {
      validatePlanContent(
        profile,
        data.plans.find((p) => p.id === planId),
      );
      await send({
        action: 'activate-sandbox-plan',
        planId,
        planVersion: data.plans.find((p) => p.id === planId)?.version,
        version: data.membership.version,
      });
      await load(false);
      setPlansOpen(false);
      setTab('profile');
    }, 'Plano de teste activado. As caixas estão disponíveis. Nenhuma cobrança foi efectuada.');
  }
  async function action(
    o: SandboxOrder,
    kind: string,
    extra: Record<string, unknown> = {},
  ) {
    await run(async () => {
      await send({ action: kind, orderId: o.id, version: o.version, ...extra });
      const updated = await load();
      setSelected(updated.orders.find((v) => v.id === o.id) ?? null);
    });
  }
  function inspect(o: SandboxOrder) {
    setSelected(o);
    setAgent(o.agent);
    setProof(o.proof);
    setChecks([false, false, false, false]);
  }
  const stats = financials(data?.orders ?? []),
    orders = data?.orders ?? [];
  function exportCsv() {
    const rows = [
      ['Pedido', 'Produto', 'Estado', 'Pagamento', 'Valor MZN'],
      ...orders.map((o) => [
        o.id,
        o.productName,
        orderLabels[o.status],
        payment(o),
        (o.amount / 100).toFixed(2),
      ]),
    ];
    const content =
      '\uFEFF' +
      rows
        .map((row) =>
          row.map((s) => '"' + String(s).replace(/"/g, '""') + '"').join(';'),
        )
        .join('\r\n');
    const url = URL.createObjectURL(
      new Blob([content], { type: 'text/csv;charset=utf-8' }),
    );
    const a = document.createElement('a');
    a.href = url;
    a.download = 'framy-pedidos-de-teste.csv';
    a.click();
    URL.revokeObjectURL(url);
  }
  const orderTable = (
    <div className="table-panel">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Pedido / produto</TableHead>
            <TableHead>Local de entrega</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead>Pagamento</TableHead>
            <TableHead>Valor de teste</TableHead>
            <TableHead>Agente</TableHead>
            <TableHead>
              <span className="sr-only">Abrir</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {orders.map((o) => (
            <TableRow key={o.id}>
              <TableCell>
                <strong>{o.productName}</strong>
                <small>
                  #{o.id.slice(0, 8).toUpperCase()} · {date(o.createdAt)}
                </small>
              </TableCell>
              <TableCell>
                <Button variant="ghost" onClick={() => inspect(o)}>
                  {o.deliveryCity ||
                    (['DELIVERED', 'CANCELLED'].includes(o.status)
                      ? 'Não indicado'
                      : 'Indicar local de entrega')}
                </Button>
              </TableCell>
              <TableCell>
                <span className="status-badge">{orderLabels[o.status]}</span>
              </TableCell>
              <TableCell>{payment(o)}</TableCell>
              <TableCell>{money(o.amount)}</TableCell>
              <TableCell>{o.agent || 'Por atribuir'}</TableCell>
              <TableCell>
                <Button
                  variant="ghost"
                  aria-label={`Abrir pedido ${o.id.slice(0, 8)}`}
                  onClick={() => inspect(o)}
                >
                  <ArrowUpRight />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {!orders.length && (
        <div className="empty-panel">
          <Package size={30} />
          <h3>Ainda não há pedidos</h3>
          <p>
            {canEditOrders
              ? 'Crie um pedido de teste para explorar o percurso completo.'
              : 'Quando o seu pedido for registado, pode acompanhar aqui todas as etapas.'}
          </p>
        </div>
      )}
    </div>
  );
  return (
    <SidebarProvider className="refined-workspace">
      {plansOpen && data && (
        <PlanPicker
          plans={data.plans}
          current={data.membership.planId}
          busy={busy}
          error={error}
          onClose={() => setPlansOpen(false)}
          onSelect={selectPlan}
        />
      )}
      <Sidebar className="workspace-sidebar">
        <SidebarHeader className="p-6">
          <Link className="brand" href="/">
            <Image
              width={220}
              height={100}
              unoptimized
              src="/brand/logo.svg"
              alt="Framy Connect"
            />
          </Link>
          <span className="workspace-label">O SEU ESPAÇO</span>
        </SidebarHeader>
        <SidebarContent className="px-4">
          <SidebarMenu>
            {menu.slice(0, 3).map((m) => (
              <SidebarMenuItem key={m.id}>
                <SidebarMenuButton
                  className="workspace-menu-item"
                  isActive={tab === m.id}
                  onClick={() => {
                    setTab(m.id);
                    setNotice('');
                  }}
                >
                  <m.icon />
                  <span>{m.label}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
          {['operations', 'agent', 'finance', 'ceo'].includes(tab) && (
            <Collapsible
              className="workspace-test-tools"
              open={testToolsOpen}
              onOpenChange={setTestToolsOpen}
            >
              <CollapsibleTrigger className="workspace-test-trigger">
                <Settings2 size={17} /> Ferramentas de teste{' '}
                <ChevronDown size={16} />
              </CollapsibleTrigger>
              <CollapsibleContent>
                <p>Vistas de demonstração, sem permissões reais.</p>
                <SidebarMenu>
                  {menu.slice(3).map((m) => (
                    <SidebarMenuItem key={m.id}>
                      <SidebarMenuButton
                        className="workspace-menu-item"
                        isActive={tab === m.id}
                        onClick={() => {
                          setTab(m.id);
                          setNotice('');
                        }}
                      >
                        <m.icon />
                        <span>{m.label}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </CollapsibleContent>
            </Collapsible>
          )}
        </SidebarContent>
        <SidebarFooter className="p-6">
          <Link className="catalog-link" href="/produtos">
            Explorar produtos <ArrowUpRight size={18} />
          </Link>
          <div className="user-mini">
            <span>{initials(displayName)}</span>
            <div>
              <strong>{displayName}</strong>
              <small>Prévia de desenvolvimento</small>
            </div>
          </div>
          <a className="signout" href={signOutHref} target="_top">
            <LogOut size={16} /> Terminar sessão
          </a>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <header className="workspace-header">
          <div>
            <SidebarTrigger />
            <span>
              Minha Conta{' '}
              <span className="breadcrumb">
                / {menu.find((m) => m.id === tab)?.label}
              </span>
            </span>
          </div>
          <Button
            className="plan-upgrade header-upgrade"
            disabled={loading || busy || uploadingPhoto || !data}
            onClick={openPlans}
          >
            Upgrade plan <ArrowUpRight size={17} />
          </Button>
        </header>
        <main
          id="main"
          className={`workspace-main ${['overview', 'profile', 'orders'].includes(tab) ? 'customer-main' : ''}`}
        >
          <div className="sandbox-banner">
            <ShieldCheck size={19} />
            <span>
              <strong>Prévia privada</strong> · Pedidos, pagamentos e entregas
              são simulados. Sem cobranças.
            </span>
          </div>
          <div className="workspace-title">
            <div>
              <span className="eyebrow">
                FRAMY CONNECT /{' '}
                {tab === 'profile' ? 'IDENTIDADE' : 'MINHA CONTA'}
              </span>
              <h1>
                {tab === 'overview'
                  ? `Olá, ${displayName.trim().split(/\s+/)[0] || 'bem-vindo'}.`
                  : menu
                      .find((m) => m.id === tab)
                      ?.label.replace(' · teste', '')}
              </h1>
            </div>
            <Button
              variant="outline"
              className="control-btn"
              aria-label="Actualizar dados"
              disabled={busy || loading || uploadingPhoto}
              onClick={() => run(() => load(false), 'Dados actualizados.')}
            >
              <RefreshCw size={17} /> Actualizar
            </Button>
          </div>
          {error && (
            <div role="alert" className="message error-message">
              {error}
            </div>
          )}
          {notice && <output className="message">{notice}</output>}
          {loading ? (
            <output className="empty-panel">A carregar o seu espaço…</output>
          ) : !data ? (
            <div className="empty-panel">
              <p>O seu espaço está temporariamente indisponível.</p>
              <Button
                className="control-btn"
                onClick={() => run(() => load(true))}
              >
                Tentar novamente
              </Button>
            </div>
          ) : (
            <>
              {tab === 'overview' && (
                <CustomerOverview
                  data={data}
                  displayName={displayName}
                  onNavigate={setTab}
                  onInspect={inspect}
                  onUpgrade={openPlans}
                />
              )}
              {tab === 'profile' && (
                <div className="editor-grid profile-editor-layout">
                  <section className="panel">
                    <div className="section-heading">
                      <h2>A sua identidade</h2>
                      <span className="status-badge">
                        {dirty
                          ? 'Alterações por guardar'
                          : data.published
                            ? 'Publicada'
                            : 'Rascunho'}
                      </span>
                    </div>
                    <p className="muted">
                      Escolha os dados que quer partilhar. O nome de utilizador
                      fica reservado na primeira gravação.
                    </p>
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        void save('save-profile');
                      }}
                    >
                      <fieldset
                        className="profile-editor-fields"
                        disabled={busy || uploadingPhoto}
                      >
                        <ProfilePhotoUpload
                          profile={profile}
                          disabled={busy}
                          onUploading={setUploadingPhoto}
                          onChange={(next) => {
                            setProfile(next);
                            setDirty(true);
                          }}
                        />
                        <div className="form-grid">
                          {(
                            [
                              {
                                key: 'name',
                                label: 'Nome completo',
                                placeholder: 'Como quer ser conhecido?',
                              },
                              {
                                key: 'username',
                                label: 'Nome de utilizador',
                                placeholder: 'o_seu_nome',
                              },
                              {
                                key: 'title',
                                label: 'Título ou profissão',
                                placeholder: 'O que faz?',
                              },
                              {
                                key: 'website',
                                label: 'Website ou portefólio',
                                placeholder: 'https://…',
                              },
                              {
                                key: 'email',
                                label: 'Email de contacto',
                                placeholder: 'nome@exemplo.com',
                              },
                              {
                                key: 'phone',
                                label: 'Telefone',
                                placeholder: '+258 …',
                              },
                            ] as const
                          ).map((f) => (
                            <label
                              className="field"
                              key={f.key}
                              htmlFor={`profile-${f.key}`}
                            >
                              {f.label}
                              <Input
                                id={`profile-${f.key}`}
                                value={profile[f.key]}
                                maxLength={
                                  f.key === 'username'
                                    ? 40
                                    : f.key === 'name'
                                      ? 90
                                      : f.key === 'title'
                                        ? 120
                                        : f.key === 'phone'
                                          ? 24
                                          : f.key === 'email'
                                            ? 160
                                            : 300
                                }
                                required={
                                  f.key === 'name' || f.key === 'username'
                                }
                                readOnly={
                                  f.key === 'username' &&
                                  data.profileVersion > 0
                                }
                                onChange={(e) => {
                                  setProfile({
                                    ...profile,
                                    [f.key]: e.target.value,
                                    ...(f.key === 'name' &&
                                    data.profileVersion === 0 &&
                                    (!profile.username ||
                                      profile.username ===
                                        usernameFromName(profile.name))
                                      ? {
                                          username: usernameFromName(
                                            e.target.value,
                                          ),
                                        }
                                      : {}),
                                  });
                                  setDirty(true);
                                }}
                                placeholder={f.placeholder}
                              />
                            </label>
                          ))}
                        </div>
                        <div className="visibility">
                          <h3>O que aparece no seu perfil?</h3>
                          <label htmlFor="show-email">
                            <span>Mostrar email ao público</span>
                            <Switch
                              id="show-email"
                              checked={profile.showEmail}
                              onCheckedChange={(v) => {
                                setProfile({ ...profile, showEmail: v });
                                setDirty(true);
                              }}
                            />
                          </label>
                          <label htmlFor="show-phone">
                            <span>Mostrar telefone ao público</span>
                            <Switch
                              id="show-phone"
                              checked={profile.showPhone}
                              onCheckedChange={(v) => {
                                setProfile({ ...profile, showPhone: v });
                                setDirty(true);
                              }}
                            />
                          </label>
                        </div>
                        <ProfileLinksEditor
                          profile={profile}
                          planId={data.membership.planId}
                          terms={data.membership.terms}
                          disabled={busy}
                          onChange={(next) => {
                            setProfile(next);
                            setDirty(true);
                          }}
                          onUpgrade={openPlans}
                        />
                        <div className="form-actions">
                          <Button
                            className="control-btn"
                            variant="outline"
                            disabled={busy}
                            type="submit"
                          >
                            <Save size={17} /> Guardar rascunho
                          </Button>
                          <Button
                            className="btn btn-primary"
                            type="button"
                            disabled={busy}
                            onClick={() => save('publish-profile')}
                          >
                            Publicar perfil <ArrowUpRight size={20} />
                          </Button>
                        </div>
                      </fieldset>
                    </form>
                    {data.published && (
                      <div className="published-actions">
                        <a
                          href={`/${data.publishedUsername}`}
                          target="_blank"
                          rel="noreferrer"
                        >
                          <Eye size={17} /> Abrir perfil publicado
                        </a>
                        <Button
                          variant="ghost"
                          disabled={busy}
                          onClick={() => save('unpublish-profile')}
                        >
                          Retirar publicação
                        </Button>
                      </div>
                    )}
                    <p className="quiet-note">
                      A publicação fica acessível apenas dentro desta prévia
                      privada. Não é enviada para motores de pesquisa.
                    </p>
                  </section>
                  <aside className="profile-preview-column">
                    <span className="preview-label">
                      O SEU PERFIL · PRÉ-VISUALIZAÇÃO
                    </span>
                    <IPhonePreview>
                      <MobileProfile
                        profile={publicProfile(profile)}
                        published={data.published}
                        preview
                      />
                    </IPhonePreview>
                    <ProfileHandoff
                      username={
                        data.publishedUsername || data.profile?.username
                      }
                      published={data.published}
                    />
                  </aside>
                </div>
              )}
              {tab === 'operations' && data.canManageProducts && (
                <ProductManager
                  onSaved={() => {
                    void load();
                  }}
                />
              )}
              {tab === 'operations' && (
                <ProfileHandoff
                  username={data.publishedUsername || data.profile?.username}
                  published={data.published}
                  operations
                />
              )}
              {['orders', 'operations', 'agent'].includes(tab) && (
                <>
                  <div className="panel order-create">
                    <div>
                      <h2>
                        {tab === 'orders'
                          ? 'Acompanhe o seu pedido.'
                          : tab === 'operations'
                            ? 'Cada pedido, no sítio certo.'
                            : 'O próximo toque passa por si.'}
                      </h2>
                      <p className="muted">
                        {tab === 'orders'
                          ? 'Veja em que etapa está cada pedido e consulte o histórico, do pagamento à entrega.'
                          : tab === 'operations'
                            ? 'Atribua um agente e acompanhe os pedidos de teste até à entrega.'
                            : 'Abra um pedido atribuído, inicie a produção e conclua o controlo de qualidade.'}
                      </p>
                    </div>
                    {canEditOrders && (
                      <Button
                        className="btn btn-primary"
                        disabled={busy}
                        onClick={() =>
                          run(
                            () => create(chosenProduct),
                            'Pedido de teste criado, sem cobrança.',
                          )
                        }
                      >
                        <Plus /> Novo pedido de teste
                      </Button>
                    )}
                  </div>
                  {canEditOrders && (
                    <label className="field">
                      Local de entrega obrigatório
                      <Input
                        value={orderCity}
                        minLength={2}
                        maxLength={90}
                        required
                        placeholder="Ex.: Maputo ou Beira"
                        onChange={(e) => {
                          setOrderCity(e.target.value);
                          pendingCreate.current = null;
                        }}
                      />
                    </label>
                  )}
                  {canEditOrders && (
                    <fieldset
                      className="product-choice"
                      aria-label="Produto para o novo pedido"
                    >
                      {products
                        .filter((p) => p.available)
                        .map((p) => (
                          <Button
                            key={p.id}
                            variant={
                              chosenProduct === p.id ? 'secondary' : 'outline'
                            }
                            aria-pressed={chosenProduct === p.id}
                            className="control-btn"
                            disabled={busy}
                            onClick={() => {
                              setChosenProduct(p.id);
                              pendingCreate.current = null;
                            }}
                          >
                            {p.name}
                          </Button>
                        ))}
                    </fieldset>
                  )}
                  {tab === 'orders' ? (
                    <CustomerOrders
                      orders={orders}
                      events={data?.events ?? []}
                      onOpen={inspect}
                    />
                  ) : (
                    orderTable
                  )}
                </>
              )}
              {['finance', 'ceo'].includes(tab) && (
                <>
                  <div className="metric-grid">
                    <Metric
                      label="Capturas simuladas"
                      value={money(stats.captures)}
                      note="Pagamentos confirmados no teste"
                    />
                    <Metric
                      label="Receita reconhecida"
                      value={money(stats.revenue)}
                      note="Apenas entregas simuladas"
                    />
                    <Metric
                      label="Resultado bruto"
                      value={money(stats.grossProfit)}
                      note="Receita menos custo dos produtos"
                    />
                    <Metric
                      label="Adiantamentos"
                      value={money(stats.advances)}
                      note="Recebido, ainda não reconhecido"
                    />
                  </div>
                  <div className="workspace-split">
                    <article className="panel">
                      <h2>Do pagamento à entrega</h2>
                      <p className="muted">
                        Distribuição dos pedidos de teste por etapa.
                      </p>
                      <div className="bar-chart">
                        {Object.entries(orderLabels).map(([state, label]) => {
                          const n = orders.filter(
                            (o) => o.status === state,
                          ).length;
                          return (
                            <div key={state}>
                              <span>{label}</span>
                              <div>
                                <i
                                  style={{
                                    width: `${orders.length ? (n / orders.length) * 100 : 0}%`,
                                  }}
                                />
                              </div>
                              <strong>{n}</strong>
                            </div>
                          );
                        })}
                      </div>
                    </article>
                    <article className="panel">
                      <h2>Conciliação de teste</h2>
                      <dl className="totals">
                        <div>
                          <dt>Capturas</dt>
                          <dd>{money(stats.captures)}</dd>
                        </div>
                        <div>
                          <dt>Reembolsos</dt>
                          <dd>{money(stats.refunds)}</dd>
                        </div>
                        <div>
                          <dt>Saldo no prestador</dt>
                          <dd>{money(stats.providerBalance)}</dd>
                        </div>
                        <div>
                          <dt>Custo reconhecido</dt>
                          <dd>{money(stats.costs)}</dd>
                        </div>
                      </dl>
                      <p className="quiet-note">
                        Sem taxas, impostos ou liquidações bancárias. Estes
                        resultados não são demonstrações financeiras oficiais.
                      </p>
                      <Button
                        variant="outline"
                        className="control-btn"
                        onClick={exportCsv}
                      >
                        <Download size={17} /> Exportar pedidos CSV
                      </Button>
                    </article>
                  </div>
                  <section className="panel audit-panel">
                    <h2>Histórico de operações</h2>
                    {data.events.length ? (
                      data.events.slice(0, 12).map((e) => (
                        <div className="audit-row" key={e.id}>
                          <span className="tiny-dot" />
                          <strong>
                            {(
                              {
                                created: 'Pedido criado',
                                'delivery-address': 'Local de entrega indicado',
                                pay: 'Pagamento simulado',
                                assign: 'Agente atribuído',
                                start: 'Produção iniciada',
                                ready: 'QC concluído',
                                deliver: 'Entrega simulada',
                                cancel: 'Pedido cancelado',
                                refund: 'Reembolso simulado',
                              } as Record<string, string>
                            )[e.action] ?? e.action}
                          </strong>
                          <span>#{e.orderId.slice(0, 8).toUpperCase()}</span>
                          <time>{date(e.createdAt)}</time>
                        </div>
                      ))
                    ) : (
                      <p className="muted">
                        As operações de teste aparecerão aqui.
                      </p>
                    )}
                  </section>
                </>
              )}
            </>
          )}
        </main>
      </SidebarInset>
      <Dialog
        open={!!selected}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
      >
        <DialogContent className="order-dialog">
          <DialogTitle>{selected?.productName}</DialogTitle>
          <DialogDescription>
            Pedido de teste #{selected?.id.slice(0, 8).toUpperCase()} · Nenhuma
            cobrança ou entrega real.
          </DialogDescription>
          {selected && (
            <>
              <div className="dialog-status">
                <span className="status-badge">
                  {orderLabels[selected.status]}
                </span>
                <strong>{money(selected.amount)}</strong>
              </div>
              <p>{payment(selected)}</p>
              <DeliveryEditor
                key={selected.id}
                order={selected}
                onSaved={async () => {
                  const updated = await load();
                  setSelected(
                    updated.orders.find((o) => o.id === selected.id) ?? null,
                  );
                }}
              />
              <p className="muted">
                Agente: {selected.agent || 'Por atribuir'} · Controlo de
                qualidade: {selected.qc ? 'Concluído' : 'Pendente'}
              </p>
              <p className="muted">
                Última actualização:{' '}
                {new Date(selected.updatedAt).toLocaleString('pt-PT')}
              </p>
              {error && (
                <p role="alert" className="message">
                  {error}
                </p>
              )}
              <OrderProgressLine order={selected} />
              <section aria-label="Histórico do pedido">
                <h3>Histórico do pedido</h3>
                <ol>
                  {(data?.events ?? [])
                    .filter((e) => e.orderId === selected.id)
                    .slice()
                    .reverse()
                    .map((e) => (
                      <li key={e.id}>
                        <time dateTime={e.createdAt}>
                          {new Date(e.createdAt).toLocaleString('pt-PT')}
                        </time>{' '}
                        —{' '}
                        {(
                          {
                            created: 'Pedido criado',
                            'delivery-address': 'Local de entrega indicado',
                            pay: 'Pagamento confirmado',
                            assign: 'Agente atribuído',
                            start: 'Produção iniciada',
                            ready:
                              'Controlo de qualidade concluído · Pronto para entrega',
                            deliver: 'Entrega concluída',
                            cancel: 'Pedido cancelado',
                            refund: 'Pagamento reembolsado',
                          } as Record<string, string>
                        )[e.action] ?? e.action}
                      </li>
                    ))}
                </ol>
              </section>
              {canEditOrders && selected.status === 'PENDING_PAYMENT' && (
                <Button
                  disabled={busy}
                  className="control-btn"
                  onClick={() => action(selected, 'pay')}
                >
                  Simular pagamento confirmado
                </Button>
              )}
              {canEditOrders && selected.status === 'QUEUED' && (
                <>
                  <label className="field" htmlFor="agent-name">
                    Agente de teste
                    <Input
                      id="agent-name"
                      value={agent}
                      maxLength={90}
                      onChange={(e) => setAgent(e.target.value)}
                      placeholder="Nome do agente"
                    />
                  </label>
                  <Button
                    disabled={busy || agent.trim().length < 2}
                    variant="outline"
                    className="control-btn"
                    onClick={() => action(selected, 'assign', { agent })}
                  >
                    Guardar atribuição
                  </Button>
                  <Button
                    disabled={busy || !selected.agent}
                    className="control-btn"
                    onClick={() => action(selected, 'start')}
                  >
                    Iniciar produção
                  </Button>
                </>
              )}
              {canEditOrders && selected.status === 'IN_PRODUCTION' && (
                <>
                  <h3>Controlo de qualidade</h3>
                  {[
                    'NFC detectado e programado',
                    'Link abre a identidade correcta',
                    'Nome e produto correspondem ao pedido',
                    'Produto sem defeitos e completo',
                  ].map((label, i) => (
                    <label className="qc-check" key={label} htmlFor={`qc-${i}`}>
                      <Checkbox
                        id={`qc-${i}`}
                        checked={checks[i]}
                        onCheckedChange={(v) =>
                          setChecks(
                            checks.map((c, j) => (i === j ? v === true : c)),
                          )
                        }
                      />
                      {label}
                    </label>
                  ))}
                  <Button
                    disabled={busy || !checks.every(Boolean)}
                    className="control-btn"
                    onClick={() =>
                      action(selected, 'ready', { qc: checks.every(Boolean) })
                    }
                  >
                    Confirmar QC e marcar pronto
                  </Button>
                </>
              )}
              {canEditOrders && selected.status === 'READY' && (
                <>
                  <label className="field" htmlFor="delivery-proof">
                    Evidência de entrega de teste
                    <Input
                      id="delivery-proof"
                      maxLength={250}
                      value={proof}
                      onChange={(e) => setProof(e.target.value)}
                      placeholder="Ex.: confirmação de recolha DEMO-001"
                    />
                  </label>
                  <Button
                    disabled={busy || proof.trim().length < 5}
                    className="control-btn"
                    onClick={() => action(selected, 'deliver', { proof })}
                  >
                    Confirmar entrega simulada
                  </Button>
                </>
              )}
              {selected.status === 'DELIVERED' && (
                <p className="message">
                  <Check size={18} /> Entrega de teste concluída. Evidência:{' '}
                  {selected.proof}
                </p>
              )}
              {canEditOrders &&
                ['PENDING_PAYMENT', 'QUEUED'].includes(selected.status) && (
                  <Button
                    variant="outline"
                    disabled={busy}
                    className="control-btn"
                    onClick={() => action(selected, 'cancel')}
                  >
                    Cancelar pedido de teste
                  </Button>
                )}
              {canEditOrders &&
                selected.status === 'CANCELLED' &&
                selected.paid &&
                !selected.refunded && (
                  <Button
                    className="control-btn"
                    disabled={busy}
                    onClick={() => action(selected, 'refund')}
                  >
                    Simular reembolso integral
                  </Button>
                )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </SidebarProvider>
  );
}
function Metric({
  label,
  value,
  note,
}: {
  label: string;
  value: string;
  note: string;
}) {
  return (
    <article className="metric">
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{note}</small>
    </article>
  );
}
