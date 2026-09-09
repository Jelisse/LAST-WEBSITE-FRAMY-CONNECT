export const plans = [
  {
    id: 'individual',
    name: 'Individual',
    audience: 'Indivíduos',
    dollars: 1,
    links: 3,
    bio: 0,
    description: 'Os seus contactos essenciais.',
  },
  {
    id: 'creator',
    name: 'Criador',
    audience: 'Criadores',
    dollars: 3,
    links: 8,
    bio: 160,
    description: 'O seu conteúdo, num só lugar.',
  },
  {
    id: 'professional',
    name: 'Profissional',
    audience: 'Profissionais',
    dollars: 5,
    links: 15,
    bio: 400,
    description: 'Mais espaço para o seu trabalho.',
  },
  {
    id: 'institution',
    name: 'Instituição',
    audience: 'Instituições',
    dollars: 9,
    links: 30,
    bio: 800,
    description: 'Recursos e informação da instituição.',
  },
  {
    id: 'organisation',
    name: 'Organização',
    audience: 'Organizações',
    dollars: 15,
    links: 50,
    bio: 1200,
    description: 'Uma presença completa para a organização.',
  },
] as const;
export type PlanId = string;
export type ManagedPlan = {
  id: string;
  name: string;
  audience: string;
  dollars: number;
  links: number;
  bio: number;
  description: string;
  active: boolean;
  version: number;
};
export function getPlan(id: unknown) {
  const plan = plans.find((item) => item.id === id);
  if (!plan) throw new Error('Plano inválido.');
  return plan;
}
export type ProfileLink = { label: string; url: string };
export type Profile = {
  name: string;
  username: string;
  title: string;
  email: string;
  phone: string;
  website: string;
  showEmail: boolean;
  showPhone: boolean;
  links?: ProfileLink[];
  bio?: string;
  photoUrl?: string;
  photoPosition?: number;
};
export const blankProfile: Profile = {
  name: '',
  username: '',
  title: '',
  email: '',
  phone: '',
  website: '',
  showEmail: false,
  showPhone: false,
  links: [],
  bio: '',
  photoUrl: '',
  photoPosition: 35,
};
const reserved = new Set([
  'api',
  'dashboard',
  'manager',
  'finance',
  'produtos',
  'sobre',
  'contacto',
  'ajuda',
  'termos',
  'privacidade',
  'login',
  'register',
  'verify',
  'recovery',
  'perfil',
  'preview',
  'settings',
  'checkout',
  'encomendar',
  'tracking',
  'operations',
  'cofounder',
  'agent',
  'aplicar',
  'n',
  'signin-with-chatgpt',
  'signout-with-chatgpt',
  'callback',
]);
export function usernameFromName(name: string): string {
  const base = name
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 40)
    .replace(/_+$/, '');
  if (!base) return '';
  return base.length < 3 || reserved.has(base)
    ? `${base.slice(0, 33)}_perfil`
    : base;
}
export function validateProfile(input: unknown): Profile {
  if (!input || typeof input !== 'object' || Array.isArray(input))
    throw new Error('Perfil inválido.');
  const p = input as Record<string, unknown>;
  const s = (k: string, max: number) => {
    if (typeof p[k] !== 'string' || p[k].length > max)
      throw new Error(`O campo ${k} é inválido.`);
    return p[k].trim();
  };
  const name = s('name', 90),
    username = s('username', 40).toLowerCase(),
    title = s('title', 120),
    email = s('email', 160),
    phone = s('phone', 24),
    website = s('website', 300);
  if (name.length < 2) throw new Error('Indique o seu nome.');
  if (!/^[a-z0-9_]{3,40}$/.test(username) || reserved.has(username))
    throw new Error(
      'Escolha outro nome de utilizador: 3–40 letras minúsculas, números ou _.',
    );
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    throw new Error('Indique um email válido.');
  if (phone && !/^\+?[0-9 ()-]{7,24}$/.test(phone))
    throw new Error('Indique um telefone válido.');
  if (website) {
    let url;
    try {
      url = new URL(website);
    } catch {
      throw new Error('O link deve começar por https://.');
    }
    if (url.protocol !== 'https:' || url.username || url.password)
      throw new Error('Use um endereço https:// sem credenciais.');
  }
  if (typeof p.showEmail !== 'boolean' || typeof p.showPhone !== 'boolean')
    throw new Error('Reveja a visibilidade dos contactos.');
  const rawLinks = p.links ?? [];
  if (!Array.isArray(rawLinks) || rawLinks.length > 50)
    throw new Error('Máximo de 50 links por perfil.');
  const links = rawLinks.map((link): ProfileLink => {
    if (
      !link ||
      typeof link !== 'object' ||
      typeof link.label !== 'string' ||
      typeof link.url !== 'string' ||
      !link.label.trim() ||
      link.label.length > 60 ||
      link.url.length > 300
    )
      throw new Error('Cada link precisa de um título e endereço válidos.');
    let url;
    try {
      url = new URL(link.url.trim());
    } catch {
      throw new Error('Os links devem começar por https://.');
    }
    if (url.protocol !== 'https:' || url.username || url.password)
      throw new Error('Use links https:// sem credenciais.');
    if (url.href.length > 300)
      throw new Error('O endereço do link é demasiado longo.');
    return { label: link.label.trim(), url: url.href };
  });
  if (p.bio !== undefined && (typeof p.bio !== 'string' || p.bio.length > 1200))
    throw new Error('A biografia deve ter até 1200 caracteres.');
  const photoUrl = p.photoUrl ?? '';
  if (
    typeof photoUrl !== 'string' ||
    (photoUrl && !/^\/api\/profile-photo\/[0-9a-f-]{36}$/.test(photoUrl))
  )
    throw new Error('Carregue uma fotografia válida.');
  const photoPosition = p.photoPosition ?? 35;
  if (
    typeof photoPosition !== 'number' ||
    !Number.isFinite(photoPosition) ||
    photoPosition < 0 ||
    photoPosition > 100
  )
    throw new Error('Posição da fotografia inválida.');
  return {
    name,
    username,
    title,
    email,
    phone,
    website,
    showEmail: p.showEmail,
    showPhone: p.showPhone,
    links,
    bio: typeof p.bio === 'string' ? p.bio.trim() : '',
    photoUrl,
    photoPosition,
  };
}
export function validatePlanContent(
  profile: Pick<Profile, 'links' | 'bio'>,
  planId: unknown,
) {
  const plan =
    typeof planId === 'object' && planId
      ? (planId as ManagedPlan)
      : getPlan(planId);
  if ((profile.links?.length ?? 0) > plan.links)
    throw new Error(
      `O plano ${plan.name} permite ${plan.links} links. Remova links ou escolha um plano superior.`,
    );
  if ((profile.bio?.length ?? 0) > plan.bio)
    throw new Error(
      `O plano ${plan.name} permite ${plan.bio} caracteres de biografia. Reduza o texto ou escolha um plano superior.`,
    );
}
export function publicProfile(p: Profile): Profile {
  return {
    ...p,
    email: p.showEmail ? p.email : '',
    phone: p.showPhone ? p.phone : '',
  };
}
export const orderLabels: Record<string, string> = {
  PENDING_PAYMENT: 'A aguardar pagamento',
  QUEUED: 'Na fila de produção',
  IN_PRODUCTION: 'Em produção',
  READY: 'Pronto para entrega',
  DELIVERED: 'Entregue',
  CANCELLED: 'Cancelado',
};
export type Journal = {
  event: string;
  debit: string;
  credit: string;
  amount: number;
};
export type SandboxOrder = {
  deliveryCity?: string;
  deliveryAddress?: string;
  id: string;
  productId: string;
  productName: string;
  amount: number;
  cost: number;
  status: string;
  paid: boolean;
  refunded: boolean;
  qc: boolean;
  agent: string;
  agentId?: string;
  proof: string;
  version: number;
  createdAt: string;
  updatedAt: string;
  journal: Journal[];
};
export function transition(
  order: SandboxOrder,
  action: string,
  input: Record<string, unknown> = {},
): SandboxOrder {
  const next = {
    ...order,
    journal: [...order.journal],
    version: order.version + 1,
    updatedAt: new Date().toISOString(),
  };
  if (action === 'pay' && order.status === 'PENDING_PAYMENT' && !order.paid) {
    next.paid = true;
    next.status = 'QUEUED';
    next.journal.push({
      event: 'capture',
      debit: 'provider_clearing',
      credit: 'customer_advances',
      amount: order.amount,
    });
  } else if (
    action === 'assign' &&
    order.status === 'QUEUED' &&
    order.paid &&
    typeof input.agent === 'string' &&
    input.agent.trim().length >= 2 &&
    input.agent.length <= 90
  ) {
    next.agent = input.agent.trim();
  } else if (
    action === 'start' &&
    order.status === 'QUEUED' &&
    order.paid &&
    order.agent
  ) {
    next.status = 'IN_PRODUCTION';
  } else if (
    action === 'ready' &&
    order.status === 'IN_PRODUCTION' &&
    input.qc === true
  ) {
    next.status = 'READY';
    next.qc = true;
  } else if (
    action === 'deliver' &&
    order.status === 'READY' &&
    order.qc &&
    typeof input.proof === 'string' &&
    input.proof.trim().length >= 5 &&
    input.proof.length <= 250
  ) {
    next.status = 'DELIVERED';
    next.proof = input.proof.trim();
    next.journal.push(
      {
        event: 'revenue',
        debit: 'customer_advances',
        credit: 'product_revenue',
        amount: order.amount,
      },
      { event: 'cost', debit: 'cogs', credit: 'inventory', amount: order.cost },
    );
  } else if (
    action === 'cancel' &&
    ['PENDING_PAYMENT', 'QUEUED'].includes(order.status)
  ) {
    next.status = 'CANCELLED';
  } else if (
    action === 'refund' &&
    order.status === 'CANCELLED' &&
    order.paid &&
    !order.refunded
  ) {
    next.refunded = true;
    next.journal.push({
      event: 'refund',
      debit: 'customer_advances',
      credit: 'provider_clearing',
      amount: order.amount,
    });
  } else
    throw new Error(
      'Esta acção não é permitida no estado actual. Confirme a atribuição, o controlo de qualidade e os dados obrigatórios.',
    );
  return next;
}
export function financials(orders: SandboxOrder[]) {
  const journal = orders.flatMap((o) => o.journal);
  const amount = (event: string) =>
    journal.filter((j) => j.event === event).reduce((s, j) => s + j.amount, 0);
  const captures = amount('capture'),
    revenue = amount('revenue'),
    costs = amount('cost'),
    refunds = amount('refund');
  return {
    captures,
    revenue,
    costs,
    refunds,
    advances: captures - revenue - refunds,
    grossProfit: revenue - costs,
    providerBalance: captures - refunds,
  };
}
