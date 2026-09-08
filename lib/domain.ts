export type Profile = {
  name: string;
  username: string;
  title: string;
  email: string;
  phone: string;
  website: string;
  showEmail: boolean;
  showPhone: boolean;
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
};
const reserved = new Set([
  'api',
  'dashboard',
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
  return {
    name,
    username,
    title,
    email,
    phone,
    website,
    showEmail: p.showEmail,
    showPhone: p.showPhone,
  };
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
