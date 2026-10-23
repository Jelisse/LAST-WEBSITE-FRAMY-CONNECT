'use client';
import { AppSidebarContents } from './app-sidebar';
import { ProfileSetupNavigation, ProfileSetupReview } from './profile-setup';
import {
  profileSetupIssue,
  profileIssueLocation,
  resumeProfileStep,
} from '@/lib/profile-setup';
import { focusDashboardStart } from '@/lib/dashboard-navigation';
import { AmbassadorDashboard } from './ambassador-dashboard';
import { AccountMenu } from './account-menu';
import { PanelBrand } from '@/components/panel-brand';

import { workspacePlan } from '@/lib/workspace-plan';
import { ProfileColourPicker } from './profile-colour-picker';
import { ProfileNameFontPicker } from './profile-name-font-picker';
import { profilePresentation } from '@/lib/entitlement';
import { ProfileExtrasEditor } from './profile-extras-editor';
import { ProfileTranslationsEditor } from './profile-translations-editor';
import { ProfileGrowthHub } from './profile-growth-hub';
import { AgentContact } from '@/components/agent-contact';
import { useI18n, LanguageSelector } from '@/components/language-provider';

import type { CustomerOrder as SandboxOrder } from '@/lib/customer-order';
import { useCallback, useEffect, useRef, useState, useMemo } from 'react';
import Link from '@/components/hard-link';
import {
  ArrowUpRight,
  LayoutDashboard,
  UserRound,
  Package,
  Settings2,
  BriefcaseBusiness,
  ChartNoAxesCombined,
  RefreshCw,
  Plus,
  Save,
  Eye,
  Check,
  LogOut,
  Download,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CustomerOverview } from '@/components/customer-overview';
import { PlanPicker } from '@/components/plan-picker';
import { ProfileBusinessEditor } from './profile-business-editor';
import { ProfileEngagementPanel } from './profile-engagement';
import { ProfileLinksEditor } from '@/components/profile-links-editor';
import { MobileProfile } from '@/components/mobile-profile';
import { EditorLivePreview } from '@/components/editor-live-preview';
import { ProfilePhotoUpload } from '@/components/profile-photo-upload';
import { ProfileHandoff } from '@/components/profile-handoff';

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
  useSidebar,
  SidebarInset,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import {
  blankProfile,
  financials,
  orderLabels,
  type Profile,
  type PlanId,
  validatePlanContent,
  publicProfile,
} from '@/lib/domain';
import { validateDelivery } from '@/lib/delivery';
import { OrderPayment } from './order-payment';
import { CustomerOrders, OrderProgressLine } from './customer-orders';
import { DeliveryEditor } from './delivery-editor';
import { usernameFromName } from '@/lib/domain';
import { normalizeProfileURL } from '@/lib/profile-url';
import { money } from '@/lib/catalog';
import { ProductManager } from './product-manager';
import type { WorkspaceData } from '@/lib/profile-types';

const signOutHref = '/sair';
const menu = [
  { id: 'overview', label: 'Visão geral', icon: LayoutDashboard },
  { id: 'profile', label: 'A minha identidade', icon: UserRound },
  { id: 'orders', label: 'O meu pedido', icon: Package },
  { id: 'analytics', label: 'Resultados do perfil', icon: ChartNoAxesCombined },
  { id: 'growth', label: 'Ferramentas do perfil', icon: BriefcaseBusiness },
  { id: 'ambassadors', label: 'Embaixador', icon: UserRound },
  { id: 'operations', label: 'Operações · teste', icon: Settings2 },
  { id: 'agent', label: 'Agente · teste', icon: BriefcaseBusiness },
  { id: 'ceo', label: 'CEO · teste', icon: ChartNoAxesCombined },
];
const date = (value: string, locale: string) =>
  new Intl.DateTimeFormat(locale, {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Africa/Maputo',
  }).format(new Date(value));
const payment = (o: SandboxOrder) =>
  o.refunded ? 'Reembolsado' : o.paid ? 'Pagamento registado' : 'Por pagar';
export function Workspace({ displayName }: { displayName: string }) {
  const { t } = useI18n();
  const [growthInitialTab, setGrowthInitialTab] = useState<
    'overview' | 'billing'
  >('overview');
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
    [chosenProduct, setChosenProduct] = useState('keychain'),
    [_testToolsOpen, setTestToolsOpen] = useState(false),
    [plansOpen, setPlansOpen] = useState(false),
    [uploadingPhoto, setUploadingPhoto] = useState(false);
  const planView = data ? workspacePlan(data.membership) : null;
  const [editorStep, setEditorStep] = useState<number>(0);
  function goToEditorStep(step: number) {
    setEditorStep(step);
    requestAnimationFrame(() => {
      const start = document.getElementById('profile-setup-start');
      start?.scrollIntoView({ block: 'start' });
      start?.focus({ preventScroll: true });
    });
  }
  const [conflict, setConflict] = useState<string | null>(null);
  const [errorField, setErrorField] = useState('');
  const dirtyRef = useRef(false);
  useEffect(() => {
    dirtyRef.current = dirty;
  }, [dirty]);
  const products = useMemo(() => data?.products ?? [], [data?.products]);
  const pendingCreate = useRef<string | null>(null);
  const load = useCallback(async (resetProfile = false) => {
    const r = await fetch('/api/workspace', { cache: 'no-store' });
    const d = (await r.json()) as WorkspaceData & { error?: string };
    if (!r.ok) throw new Error(d.error ?? 'Não foi possível carregar.');
    if (!resetProfile && dirtyRef.current) {
      // Unsaved edits win: refreshing must neither clear the form nor resync
      // the profile version behind the user's back — a later save would
      // otherwise pass the version check and overwrite newer server data.
      setData((prev) =>
        prev
          ? { ...d, profile: prev.profile, profileVersion: prev.profileVersion }
          : d,
      );
    } else {
      setData(d);
      setProfile(d.profile ?? blankProfile);
    }
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
        setProfile(
          d.profile ?? {
            ...blankProfile,
            name: displayName,
            username: usernameFromName(displayName),
          },
        );
        setEditorStep(d.published ? 0 : resumeProfileStep(d.profile));
        if (!d.published && d.profileVersion > 0) setTab('profile');
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
        if (new URLSearchParams(window.location.search).get('tools') === '1') {
          if (workspacePlan(d.membership).hasTools) setTab('growth');
          else setPlansOpen(true);
        }
        if (
          new URLSearchParams(window.location.search).get('billing') === '1'
        ) {
          setGrowthInitialTab('billing');
          setTab('growth');
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
  }, [displayName]);
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
        errorField?: string;
        ok?: boolean;
        id?: string;
        profileVersion?: number;
        profile?: Profile;
        published?: boolean;
        publishedUsername?: string | null;
      };
      if (!response.ok) {
        const failure = new Error(
          result.error ?? 'Não foi possível guardar.',
        ) as Error & { status?: number; errorField?: string };
        failure.status = response.status;
        failure.errorField = result.errorField;
        throw failure;
      }
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
  }, [create, canEditOrders, products]);
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
  const savedMessage = (action: string) =>
    action === 'publish-profile'
      ? 'Perfil publicado. O seu link está pronto para partilhar.'
      : action === 'unpublish-profile'
        ? 'Perfil retirado da publicação.'
        : 'Rascunho guardado.';
  function applySavedProfile(result: {
    profile?: Profile;
    profileVersion?: number;
    published?: boolean;
    publishedUsername?: string | null;
  }) {
    // Apply the saved state right away so a publish is visible without
    // waiting for the follow-up reload.
    setData((prev) =>
      prev
        ? {
            ...prev,
            profile: result.profile ?? profile,
            profileVersion: result.profileVersion ?? prev.profileVersion,
            published: result.published ?? prev.published,
            publishedUsername:
              result.publishedUsername !== undefined
                ? result.publishedUsername
                : prev.publishedUsername,
          }
        : prev,
    );
    setProfile(result.profile ?? profile);
    dirtyRef.current = false;
    setDirty(false);
    setConflict(null);
  }
  async function save(action: string) {
    if (!data || uploadingPhoto || busy) return false;
    // Human names pasted into a new username field must produce a valid URL,
    // just like usernames generated from the full-name field. Existing URLs
    // remain immutable and the server still validates and reserves the result.
    const submittedProfile =
      data.profileVersion === 0
        ? {
            ...profile,
            username: usernameFromName(profile.username || profile.name),
          }
        : profile;
    setProfile(submittedProfile);
    const issue =
      action === 'unpublish-profile'
        ? null
        : profileSetupIssue(submittedProfile);
    if (issue) {
      setError(issue.message);
      setErrorField(issue.field);
      setNotice('');
      if (tab.startsWith('professional-')) setTab('profile');
      setEditorStep(issue.step);
      requestAnimationFrame(() => {
        const target = document.getElementById(
          issue.field ? `profile-${issue.field}` : 'profile-setup-start',
        );
        target?.focus();
      });
      return false;
    }
    setBusy(true);
    setErrorField('');
    setError('');
    setNotice('');
    try {
      const result = await send({
        action,
        profile: submittedProfile,
        version: data.profileVersion,
        autoUsername:
          data.profileVersion === 0 &&
          submittedProfile.username === usernameFromName(submittedProfile.name),
      });
      applySavedProfile({
        ...result,
        profile: result.profile ?? submittedProfile,
      });
      setNotice(savedMessage(action));
      // Best-effort revalidation; the save itself already succeeded.
      await load().catch(() => {});
      if (action === 'publish-profile') setEditorStep(3);
      return true;
    } catch (e) {
      if ((e as { status?: number }).status === 409) {
        // Never auto-merge: ask the user which side wins.
        setConflict(action);
      } else {
        setError(e instanceof Error ? e.message : 'Tente novamente.');
        const location = profileIssueLocation(
          e instanceof Error ? e.message : '',
        );
        setErrorField(
          (e as { errorField?: string }).errorField || location.field,
        );
        if (location.field || location.step !== 2) {
          if (tab.startsWith('professional-')) setTab('profile');
          setEditorStep(location.step);
        }
        requestAnimationFrame(() =>
          document
            .getElementById(
              location.field
                ? `profile-${location.field}`
                : 'profile-setup-start',
            )
            ?.focus(),
        );
      }
      return false;
    } finally {
      setBusy(false);
    }
  }
  async function resolveConflict(reload: boolean) {
    if (!conflict) return;
    const action = conflict;
    setConflict(null);
    if (reload) {
      await run(async () => {
        await load(true);
        setDirty(false);
      }, 'Dados do servidor carregados.');
      return;
    }
    // Keep my edits: resync the version explicitly, then retry the same action.
    if (!data) return;
    await run(async () => {
      const r = await fetch('/api/workspace', { cache: 'no-store' });
      const fresh = (await r.json()) as WorkspaceData & { error?: string };
      if (!r.ok) throw new Error(fresh.error ?? 'Não foi possível carregar.');
      const result = await send({
        action,
        profile,
        version: fresh.profileVersion,
        autoUsername:
          fresh.profileVersion === 0 &&
          profile.username === usernameFromName(profile.name),
      });
      applySavedProfile(result);
      await load().catch(() => {});
    }, savedMessage(action));
  }
  function openPlans() {
    setError('');
    setPlansOpen(true);
  }
  async function selectPlan(planId: PlanId) {
    if (!data) return;
    if (planId !== 'personal') {
      setPlansOpen(false);
      setGrowthInitialTab('billing');
      setTab('growth');
      return;
    }
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
            <TableHead>{t('Pedido / produto')}</TableHead>
            <TableHead>{t('Local de entrega')}</TableHead>
            <TableHead>{t('Estado')}</TableHead>
            <TableHead>{t('Pagamento')}</TableHead>
            <TableHead>{t('Valor de teste')}</TableHead>
            <TableHead>{t('Agente')}</TableHead>
            <TableHead>
              <span className="sr-only">{t('Abrir')}</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {orders.map((o) => (
            <TableRow key={o.id}>
              <TableCell>
                <strong>{t(o.productName)}</strong>
                <small>
                  #{o.id.slice(0, 8).toUpperCase()} ·{' '}
                  {date(o.createdAt, t.locale)}
                </small>
              </TableCell>
              <TableCell>
                <Button variant="ghost" onClick={() => inspect(o)}>
                  {o.deliveryCity ||
                    (['DELIVERED', 'CANCELLED'].includes(o.status)
                      ? t('Não indicado')
                      : t('Indicar local de entrega'))}
                </Button>
              </TableCell>
              <TableCell>
                <span className="status-badge">{t(orderLabels[o.status])}</span>
              </TableCell>
              <TableCell>{t(payment(o))}</TableCell>
              <TableCell>{money(o.amount, t.locale)}</TableCell>
              <TableCell>{o.agent || t('Por atribuir')}</TableCell>
              <TableCell>
                <Button
                  variant="ghost"
                  aria-label={t('Abrir pedido {0}', [o.id.slice(0, 8)])}
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
          <h3>{t('Ainda não há pedidos')}</h3>
          <p>
            {canEditOrders
              ? t('Crie um pedido de teste para explorar o percurso completo.')
              : t(
                  'Quando o seu pedido for registado, pode acompanhar aqui todas as etapas.',
                )}
          </p>
        </div>
      )}
    </div>
  );
  return (
    <SidebarProvider className="refined-workspace">
      {plansOpen && data && (
        <PlanPicker
          paidAvailable={data.membership.billingAvailable}
          plans={data.plans}
          current={data.membership.planId}
          busy={busy}
          error={error}
          onClose={() => setPlansOpen(false)}
          onSelect={selectPlan}
        />
      )}
      <Sidebar className="workspace-sidebar app-sidebar">
        <CustomerSidebar
          badge={
            planView
              ? planView.personal
                ? 'Personal · Gratuito'
                : planView.name
              : '…'
          }
          groups={[
            {
              label: 'O seu espaço',
              items: menu
                .filter((m) => ['overview', 'orders'].includes(m.id))
                .map((m) => ({
                  id: m.id,
                  label: m.label,
                  icon: <m.icon size={21} />,
                  active: tab === m.id,
                  onSelect: () => {
                    setTab(m.id);
                    focusDashboardStart();
                    setNotice('');
                  },
                })),
            },
            {
              label: 'Criar e partilhar',
              items: menu
                .filter((m) => ['profile', 'growth'].includes(m.id))
                .map((m) => ({
                  id: m.id,
                  label:
                    m.id === 'growth'
                      ? planView?.hasTools
                        ? 'Ferramentas profissionais'
                        : 'Explorar Profissional'
                      : m.label,
                  icon: <m.icon size={21} />,
                  active:
                    (tab === m.id ||
                      (m.id === 'growth' && tab.startsWith('professional-'))) &&
                    (m.id !== 'growth' || growthInitialTab !== 'billing'),
                  onSelect: () => {
                    if (m.id === 'growth' && !planView?.hasTools) {
                      openPlans();
                      return;
                    }
                    if (m.id === 'growth') setGrowthInitialTab('overview');
                    setTab(m.id);
                    focusDashboardStart();
                    setNotice('');
                  },
                })),
            },
            {
              label: 'Acompanhar',
              items: menu
                .filter((m) => ['analytics', 'ambassadors'].includes(m.id))
                .map((m) => ({
                  id: m.id,
                  label: m.label,
                  icon: <m.icon size={21} />,
                  active: tab === m.id,
                  onSelect: () => {
                    setTab(m.id);
                    focusDashboardStart();
                    setNotice('');
                  },
                })),
            },
            {
              label: 'Para a sua equipa',
              items: [
                {
                  id: 'company',
                  label: 'Equipa corporativa',
                  href: '/corporativo',
                  icon: <BriefcaseBusiness size={21} />,
                },
              ],
            },
          ]}
          onUpgrade={openPlans}
          footer={
            <a className="signout" href={signOutHref} target="_top">
              <LogOut size={20} />
              <span>{t('Terminar sessão')}</span>
            </a>
          }
        />
      </Sidebar>
      <SidebarInset>
        <header className="workspace-header">
          <PanelBrand />
          <div className="workspace-mobile-navigation">
            <SidebarTrigger />
          </div>
          <div className="workspace-account-tools">
            <LanguageSelector />
            <AccountMenu identity />
          </div>
        </header>
        <main
          id="main"
          className={`workspace-main ${['overview', 'profile', 'orders'].includes(tab) ? 'customer-main' : ''}`}
        >
          {tab !== 'profile' && (
            <div className="workspace-title">
              <div>
                <h1>
                  {tab === 'overview'
                    ? t('Olá, {0}.', [
                        displayName.trim().split(/\s+/)[0] || t('bem-vindo'),
                      ])
                    : tab === 'growth'
                      ? t(
                          growthInitialTab === 'billing'
                            ? 'Plano e facturação'
                            : planView?.hasTools
                              ? 'Ferramentas profissionais'
                              : 'Explorar Profissional',
                        )
                      : t(
                          menu
                            .find((m) => m.id === tab)
                            ?.label.replace(' · teste', '') ??
                            'Ferramentas profissionais',
                        )}
                </h1>
              </div>
              <Button
                variant="outline"
                className="control-btn"
                aria-label={t('Actualizar dados')}
                disabled={busy || loading || uploadingPhoto}
                onClick={() =>
                  run(
                    () => load(false),
                    dirty
                      ? 'Dados actualizados. As alterações por guardar foram mantidas.'
                      : 'Dados actualizados.',
                  )
                }
              >
                <RefreshCw size={17} />
                {t(' Actualizar')}
              </Button>
            </div>
          )}
          {error && (tab !== 'profile' || !data) && (
            <div role="alert" className="message error-message">
              <strong>{t('Não foi possível concluir.')}</strong>
              <p>{t(error)}</p>
              <span>
                {t(
                  data
                    ? 'As alterações continuam neste formulário. Corrija os dados ou tente novamente.'
                    : 'Tente carregar o seu espaço novamente. Se o problema continuar, contacte a equipa.',
                )}
              </span>
              <Link href="/ajuda">{t('Centro de ajuda')}</Link>
            </div>
          )}
          {conflict && (
            <div role="alert" className="message error-message">
              <p>
                {t('Os dados foram alterados noutro separador ou dispositivo.')}
              </p>
              <div className="form-actions">
                <Button
                  variant="outline"
                  className="control-btn"
                  disabled={busy}
                  onClick={() => resolveConflict(true)}
                >
                  {t('Carregar dados do servidor')}
                </Button>
                <Button
                  variant="outline"
                  className="control-btn"
                  disabled={busy}
                  onClick={() => resolveConflict(false)}
                >
                  {t('Manter as minhas alterações')}
                </Button>
              </div>
            </div>
          )}
          {notice && tab !== 'profile' && (
            <output className="message">{t(notice)}</output>
          )}
          {loading ? (
            <output className="empty-panel">
              {t('A carregar o seu espaço…')}
            </output>
          ) : !data ? (
            <div className="empty-panel">
              <p>{t('O seu espaço está temporariamente indisponível.')}</p>
              <Button
                className="control-btn"
                onClick={() => run(() => load(true))}
              >
                {t('Tentar novamente')}
              </Button>
            </div>
          ) : (
            <>
              {tab === 'ambassadors' && <AmbassadorDashboard />}
              {tab === 'overview' && (
                <CustomerOverview
                  data={data}
                  displayName={displayName}
                  onNavigate={setTab}
                  onInspect={inspect}
                  onUpgrade={openPlans}
                  onPlanDetails={() => {
                    setGrowthInitialTab('billing');
                    setTab('growth');
                  }}
                />
              )}
              {tab === 'profile' && (
                <div
                  className="editor-grid profile-editor-layout guided-profile-editor"
                  data-editor-step={editorStep}
                >
                  <section
                    className="panel"
                    id="profile-setup-start"
                    tabIndex={-1}
                  >
                    <ProfileSetupNavigation
                      status={t(
                        dirty
                          ? 'Alterações por guardar'
                          : data.profileVersion > 0
                            ? 'Rascunho guardado'
                            : 'Rascunho',
                      )}
                      step={editorStep}
                      busy={busy || uploadingPhoto}
                      onStep={goToEditorStep}
                    />
                    <form
                      noValidate
                      onSubmit={(e) => {
                        e.preventDefault();
                        void save('save-profile');
                      }}
                    >
                      <fieldset
                        className="profile-editor-fields"
                        disabled={busy || uploadingPhoto}
                      >
                        <div className="setup-part setup-presentation">
                          <ProfilePhotoUpload
                            profile={profile}
                            disabled={busy}
                            onUploading={setUploadingPhoto}
                            onChange={(next) => {
                              setProfile(next);
                              setDirty(true);
                            }}
                          />
                          <ProfileColourPicker
                            profile={profile}
                            onChange={(next) => {
                              setProfile(next);
                              setDirty(true);
                            }}
                          />
                          <ProfileNameFontPicker
                            value={profile.nameFont}
                            name={profile.name}
                            onChange={(font) => {
                              setProfile({ ...profile, nameFont: font });
                              setDirty(true);
                            }}
                          />
                        </div>
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
                                label: 'Endereço do perfil',
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
                                placeholder: 'www.exemplo.com',
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
                            <div
                              className={`field setup-part ${['name', 'username', 'title'].includes(f.key) ? 'setup-identity' : 'setup-contacts'}`}
                              key={f.key}
                            >
                              <label htmlFor={`profile-${f.key}`}>
                                {t(f.label)}
                              </label>
                              <Input
                                id={`profile-${f.key}`}
                                value={profile[f.key]}
                                aria-invalid={f.key === errorField || undefined}
                                aria-describedby={
                                  f.key === 'website' &&
                                  errorField === 'website'
                                    ? 'profile-website-help'
                                    : undefined
                                }
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
                                inputMode={
                                  f.key === 'website' ? 'url' : undefined
                                }
                                autoCapitalize={
                                  f.key === 'username' || f.key === 'website'
                                    ? 'none'
                                    : undefined
                                }
                                spellCheck={
                                  f.key === 'username' || f.key === 'website'
                                    ? false
                                    : undefined
                                }
                                onBlur={
                                  f.key === 'username' &&
                                  data.profileVersion === 0
                                    ? () => {
                                        const username = usernameFromName(
                                          profile.username || profile.name,
                                        );
                                        if (username !== profile.username) {
                                          setProfile({ ...profile, username });
                                          setDirty(true);
                                        }
                                      }
                                    : f.key === 'website'
                                      ? () => {
                                          const website = normalizeProfileURL(
                                            profile.website,
                                          );
                                          if (website !== profile.website) {
                                            setProfile({ ...profile, website });
                                            setDirty(true);
                                          }
                                        }
                                      : undefined
                                }
                                onChange={(e) => {
                                  if (f.key === errorField) {
                                    setErrorField('');
                                    setError('');
                                  }
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
                                placeholder={t(f.placeholder)}
                              />
                              {f.key === 'username' && (
                                <small>
                                  framyconnect.co.mz/{profile.username || '…'}
                                </small>
                              )}
                              {f.key === 'website' &&
                                errorField === 'website' && (
                                  <small id="profile-website-help" role="alert">
                                    {t(error)}
                                  </small>
                                )}
                              {(f.key === 'email' || f.key === 'phone') && (
                                <span className="contact-visibility-inline">
                                  <span id={`visibility-${f.key}-label`}>
                                    {t(
                                      f.key === 'email'
                                        ? 'Mostrar email ao público'
                                        : 'Mostrar telefone ao público',
                                    )}
                                  </span>
                                  <Switch
                                    id={`show-${f.key}`}
                                    aria-labelledby={`visibility-${f.key}-label`}
                                    checked={
                                      f.key === 'email'
                                        ? profile.showEmail
                                        : profile.showPhone
                                    }
                                    onCheckedChange={(value) => {
                                      setProfile({
                                        ...profile,
                                        [f.key === 'email'
                                          ? 'showEmail'
                                          : 'showPhone']: value,
                                      });
                                      setDirty(true);
                                    }}
                                  />
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                        <div className="setup-part setup-identity">
                          <label className="field" htmlFor="profile-bio">
                            {t('Sobre si (opcional)')}
                            <textarea
                              id="profile-bio"
                              rows={4}
                              value={profile.bio || ''}
                              maxLength={Math.max(
                                data.membership.terms.bio,
                                profile.bio?.length || 0,
                              )}
                              onChange={(event) => {
                                setProfile({
                                  ...profile,
                                  bio: event.target.value,
                                });
                                setDirty(true);
                              }}
                            />
                            <small>
                              {profile.bio?.length || 0} /{' '}
                              {data.membership.terms.bio} {t('caracteres')}
                            </small>
                          </label>
                        </div>
                        <div className="setup-part setup-contacts">
                          <ProfileLinksEditor
                            showBio={false}
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
                        </div>
                        <details className="setup-part setup-presentation setup-advanced">
                          <summary>{t('Idiomas do perfil (opcional)')}</summary>
                          <ProfileTranslationsEditor
                            profile={profile}
                            onChange={(next) => {
                              setProfile(next);
                              setDirty(true);
                            }}
                          />
                        </details>
                        {(editorStep === 3 || editorStep === null) && (
                          <ProfileSetupReview
                            profile={profile}
                            published={data.published}
                            dirty={dirty}
                            onStep={goToEditorStep}
                          />
                        )}
                        <div className="editor-feedback" aria-live="polite">
                          {notice && <output>{t(notice)}</output>}
                          {error && <p role="alert">{t(error)}</p>}
                        </div>
                        <div
                          className="form-actions setup-save-actions"
                          aria-label={t('Acções do perfil')}
                        >
                          {editorStep !== null && editorStep > 0 && (
                            <Button
                              type="button"
                              variant="outline"
                              disabled={busy}
                              onClick={() => goToEditorStep(editorStep - 1)}
                            >
                              {t('Voltar')}
                            </Button>
                          )}
                          <Button
                            className="control-btn"
                            variant="outline"
                            disabled={busy}
                            type="submit"
                          >
                            <Save size={17} />
                            {t(' Guardar rascunho')}
                          </Button>
                          {editorStep !== null && editorStep < 3 && (
                            <Button
                              type="button"
                              disabled={busy || uploadingPhoto}
                              onClick={async () => {
                                if (await save('save-profile'))
                                  goToEditorStep(editorStep + 1);
                              }}
                            >
                              {t('Guardar e continuar')}
                              <ArrowUpRight size={17} />
                            </Button>
                          )}
                          <Button
                            className="btn btn-primary"
                            type="button"
                            disabled={busy}
                            hidden={editorStep !== null && editorStep !== 3}
                            onClick={() => save('publish-profile')}
                          >
                            {t(
                              data.published
                                ? 'Actualizar perfil publicado'
                                : 'Publicar perfil ',
                            )}
                            <ArrowUpRight size={20} />
                          </Button>
                        </div>
                      </fieldset>
                    </form>

                    {(editorStep === 3 || editorStep === null) &&
                      data.published && (
                        <div className="published-actions">
                          <a
                            href={`/${data.publishedUsername}`}
                            target="_blank"
                            rel="noreferrer"
                          >
                            <Eye size={17} />
                            {t(' Abrir perfil publicado')}
                          </a>
                          <details className="publication-options">
                            <summary>{t('Mais opções')}</summary>
                            <Button
                              variant="ghost"
                              disabled={busy}
                              onClick={() => save('unpublish-profile')}
                            >
                              {t('Retirar publicação')}
                            </Button>
                          </details>
                        </div>
                      )}
                  </section>
                  <aside
                    className="profile-preview-column"
                    id="profile-live-preview"
                  >
                    <span className="preview-label">
                      {t('O SEU PERFIL · PRÉ-VISUALIZAÇÃO')}
                    </span>
                    <p className="setup-preview-note">
                      {t(
                        'Pré-visualização do rascunho. A versão pública só muda ao publicar.',
                      )}
                    </p>
                    <EditorLivePreview>
                      <MobileProfile
                        profile={profilePresentation(
                          publicProfile(profile),
                          data.membership.accessState ?? 'trial',
                          {
                            plan_id: data.membership.planId,
                            terms_json: JSON.stringify(data.membership.terms),
                          },
                        )}
                        published={data.published}
                        preview
                      />
                    </EditorLivePreview>
                  </aside>
                </div>
              )}
              {tab === 'analytics' && (
                <ProfileEngagementPanel
                  onEdit={() => setTab('profile')}
                  onTools={() => setTab('growth')}
                />
              )}
              {tab === 'growth' && (
                <ProfileGrowthHub
                  key={growthInitialTab}
                  initialTab={growthInitialTab}
                  features={planView!.features}
                  onEdit={(section) => {
                    setTab('professional-' + section);
                  }}
                  onAnalytics={() => setTab('analytics')}
                  onUpgrade={openPlans}
                />
              )}
              {['professional-business', 'professional-extras'].includes(
                tab,
              ) && (
                <section className="panel professional-configuration">
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setGrowthInitialTab('overview');
                      setTab('growth');
                    }}
                  >
                    {t('Voltar às ferramentas')}
                  </Button>
                  {planView?.hasTools ? (
                    <form
                      noValidate
                      onSubmit={(event) => {
                        event.preventDefault();
                        void save('save-profile');
                      }}
                    >
                      <fieldset disabled={busy || uploadingPhoto}>
                        {tab === 'professional-business' ? (
                          <ProfileBusinessEditor
                            features={planView.features}
                            profile={profile}
                            onChange={(next) => {
                              setProfile(next);
                              setDirty(true);
                            }}
                          />
                        ) : (
                          <ProfileExtrasEditor
                            features={planView.features}
                            profile={profile}
                            limit={data.membership.terms.links}
                            onChange={(next) => {
                              setProfile(next);
                              setDirty(true);
                            }}
                          />
                        )}
                      </fieldset>
                      {error && <p role="alert">{t(error)}</p>}
                      {notice && <output>{t(notice)}</output>}
                      <div className="setup-save-actions">
                        <Button type="submit" disabled={busy}>
                          {t('Guardar rascunho')}
                        </Button>
                        <Button
                          type="button"
                          disabled={busy}
                          onClick={() => {
                            setTab('profile');
                            goToEditorStep(3);
                          }}
                        >
                          {t('Rever e publicar')}
                        </Button>
                      </div>
                    </form>
                  ) : (
                    <Button onClick={openPlans}>{t('Comparar planos')}</Button>
                  )}
                </section>
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
                          ? t('Acompanhe o seu pedido.')
                          : tab === 'operations'
                            ? t('Cada pedido, no sítio certo.')
                            : t('O próximo toque passa por si.')}
                      </h2>
                      <p className="muted">
                        {tab === 'orders'
                          ? t(
                              'Veja em que etapa está cada pedido e consulte o histórico, do pagamento à entrega.',
                            )
                          : tab === 'operations'
                            ? t(
                                'Atribua um agente e acompanhe os pedidos de teste até à entrega.',
                              )
                            : t(
                                'Abra um pedido atribuído, inicie a produção e conclua o controlo de qualidade.',
                              )}
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
                        <Plus />
                        {t(' Novo pedido de teste')}
                      </Button>
                    )}
                  </div>
                  {canEditOrders && (
                    <label
                      htmlFor="field-componentsworkspacetsx-0"
                      className="field"
                    >
                      {t('Local de entrega obrigatório')}
                      <Input
                        id="field-componentsworkspacetsx-0"
                        value={orderCity}
                        minLength={2}
                        maxLength={90}
                        required
                        placeholder={t('Ex.: Maputo ou Beira')}
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
                      aria-label={t('Produto para o novo pedido')}
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
                            {t(p.name)}
                          </Button>
                        ))}
                    </fieldset>
                  )}
                  {tab === 'orders' ? (
                    <>
                      <p>
                        <Link
                          className="btn btn-primary"
                          href="/checkout/retorno"
                        >
                          {t('Consultar compras e pagamentos PaySuite')}
                        </Link>
                      </p>
                      <CustomerOrders
                        orders={orders}
                        events={data?.events ?? []}
                        onOpen={inspect}
                      />
                    </>
                  ) : (
                    orderTable
                  )}
                </>
              )}
              {['finance', 'ceo'].includes(tab) && (
                <>
                  <div className="metric-grid">
                    <Metric
                      label={t('Capturas simuladas')}
                      value={money(stats.captures, t.locale)}
                      note="Pagamentos confirmados no teste"
                    />
                    <Metric
                      label={t('Receita reconhecida')}
                      value={money(stats.revenue, t.locale)}
                      note="Apenas entregas simuladas"
                    />
                    <Metric
                      label={t('Resultado bruto')}
                      value={money(stats.grossProfit, t.locale)}
                      note="Receita menos custo dos produtos"
                    />
                    <Metric
                      label={t('Adiantamentos')}
                      value={money(stats.advances, t.locale)}
                      note="Recebido, ainda não reconhecido"
                    />
                  </div>
                  <div className="workspace-split">
                    <article className="panel">
                      <h2>{t('Do pagamento à entrega')}</h2>
                      <p className="muted">
                        {t('Distribuição dos pedidos de teste por etapa.')}
                      </p>
                      <div className="bar-chart">
                        {Object.entries(orderLabels).map(([state, label]) => {
                          const n = orders.filter(
                            (o) => o.status === state,
                          ).length;
                          return (
                            <div key={state}>
                              <span>{t(label)}</span>
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
                      <h2>{t('Conciliação de teste')}</h2>
                      <dl className="totals">
                        <div>
                          <dt>{t('Capturas')}</dt>
                          <dd>{money(stats.captures, t.locale)}</dd>
                        </div>
                        <div>
                          <dt>{t('Reembolsos')}</dt>
                          <dd>{money(stats.refunds, t.locale)}</dd>
                        </div>
                        <div>
                          <dt>{t('Saldo no prestador')}</dt>
                          <dd>{money(stats.providerBalance, t.locale)}</dd>
                        </div>
                        <div>
                          <dt>{t('Custo reconhecido')}</dt>
                          <dd>{money(stats.costs, t.locale)}</dd>
                        </div>
                      </dl>
                      <p className="quiet-note">
                        {t(
                          'Sem taxas, impostos ou liquidações bancárias. Estes resultados não são demonstrações financeiras oficiais.',
                        )}
                      </p>
                      <Button
                        variant="outline"
                        className="control-btn"
                        onClick={exportCsv}
                      >
                        <Download size={17} />
                        {t(' Exportar pedidos CSV')}
                      </Button>
                    </article>
                  </div>
                  <section className="panel audit-panel">
                    <h2>{t('Histórico de operações')}</h2>
                    {data.events.length ? (
                      data.events.slice(0, 12).map((e) => (
                        <div className="audit-row" key={e.id}>
                          <span className="tiny-dot" />
                          <strong>
                            {t(
                              (
                                {
                                  created: 'Pedido criado',
                                  'delivery-address':
                                    'Local de entrega indicado',
                                  pay: 'Pagamento simulado',
                                  assign: 'Agente atribuído',
                                  start: 'Produção iniciada',
                                  ready: 'QC concluído',
                                  deliver: 'Entrega simulada',
                                  cancel: 'Pedido cancelado',
                                  refund: 'Reembolso simulado',
                                } as Record<string, string>
                              )[e.action] ?? e.action,
                            )}
                          </strong>
                          <span>#{e.orderId.slice(0, 8).toUpperCase()}</span>
                          <time>{date(e.createdAt, t.locale)}</time>
                        </div>
                      ))
                    ) : (
                      <p className="muted">
                        {t('As operações de teste aparecerão aqui.')}
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
          <DialogTitle>{selected ? t(selected.productName) : null}</DialogTitle>
          <DialogDescription>
            {t('Pedido #')}
            {selected?.id.slice(0, 8).toUpperCase()}
          </DialogDescription>
          {selected && (
            <>
              <div className="dialog-status">
                <span className="status-badge">
                  {t(orderLabels[selected.status])}
                </span>
                <strong>{money(selected.amount, t.locale)}</strong>
              </div>
              <p>{t(payment(selected))}</p>
              <OrderPayment orderId={selected.id} />
              <AgentContact order={selected} />
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
                {t('Agente: ')}
                {selected.agent || t('Por atribuir')}
                {t(' · Controlo de qualidade: ')}
                {selected.qc ? t('Concluído') : t('Pendente')}
              </p>
              <p className="muted">
                {t('Última actualização:')}{' '}
                {new Date(selected.updatedAt).toLocaleString(t.locale)}
              </p>
              {error && (
                <p role="alert" className="message">
                  {t(error)}
                </p>
              )}
              <OrderProgressLine order={selected} />
              <section aria-label={t('Histórico do pedido')}>
                <h3>{t('Histórico do pedido')}</h3>
                <ol>
                  {(data?.events ?? [])
                    .filter((e) => e.orderId === selected.id)
                    .slice()
                    .reverse()
                    .map((e) => (
                      <li key={e.id}>
                        <time dateTime={e.createdAt}>
                          {new Date(e.createdAt).toLocaleString(t.locale)}
                        </time>{' '}
                        —{' '}
                        {t(
                          (
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
                          )[e.action] ?? e.action,
                        )}
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
                  {t('Simular pagamento confirmado')}
                </Button>
              )}
              {canEditOrders && selected.status === 'QUEUED' && (
                <>
                  <label className="field" htmlFor="agent-name">
                    {t('Agente de teste')}
                    <Input
                      id="agent-name"
                      value={agent}
                      maxLength={90}
                      onChange={(e) => setAgent(e.target.value)}
                      placeholder={t('Nome do agente')}
                    />
                  </label>
                  <Button
                    disabled={busy || agent.trim().length < 2}
                    variant="outline"
                    className="control-btn"
                    onClick={() => action(selected, 'assign', { agent })}
                  >
                    {t('Guardar atribuição')}
                  </Button>
                  <Button
                    disabled={busy || !selected.agent}
                    className="control-btn"
                    onClick={() => action(selected, 'start')}
                  >
                    {t('Iniciar produção')}
                  </Button>
                </>
              )}
              {canEditOrders && selected.status === 'IN_PRODUCTION' && (
                <>
                  <h3>{t('Controlo de qualidade')}</h3>
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
                      {t(label)}
                    </label>
                  ))}
                  <Button
                    disabled={busy || !checks.every(Boolean)}
                    className="control-btn"
                    onClick={() =>
                      action(selected, 'ready', { qc: checks.every(Boolean) })
                    }
                  >
                    {t('Confirmar QC e marcar pronto')}
                  </Button>
                </>
              )}
              {canEditOrders && selected.status === 'READY' && (
                <>
                  <label className="field" htmlFor="delivery-proof">
                    {t('Evidência de entrega de teste')}
                    <Input
                      id="delivery-proof"
                      maxLength={250}
                      value={proof}
                      onChange={(e) => setProof(e.target.value)}
                      placeholder={t('Ex.: confirmação de recolha DEMO-001')}
                    />
                  </label>
                  <Button
                    disabled={busy || proof.trim().length < 5}
                    className="control-btn"
                    onClick={() => action(selected, 'deliver', { proof })}
                  >
                    {t('Confirmar entrega simulada')}
                  </Button>
                </>
              )}
              {selected.status === 'DELIVERED' && (
                <p className="message">
                  <Check size={18} />
                  {t(' Entrega de teste concluída. Evidência:')}{' '}
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
                    {t('Cancelar pedido de teste')}
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
                    {t('Simular reembolso integral')}
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
  const { t } = useI18n();
  return (
    <article className="metric">
      <span>{t(label)}</span>
      <strong>{value}</strong>
      <small>{t(note)}</small>
    </article>
  );
}

function CustomerSidebar(
  props: React.ComponentProps<typeof AppSidebarContents>,
) {
  const { setOpenMobile, isMobile } = useSidebar();
  return (
    <AppSidebarContents
      {...props}
      mobile={isMobile}
      onNavigate={() => setOpenMobile(false)}
    />
  );
}
