import { transition, type SandboxOrder } from './domain.ts';

export const qualityChecks = {
  nfc: 'NFC detectado e link correcto',
  customer: 'Produto e identificação do cliente correctos',
  print: 'Nome, logótipo e impressão aprovados',
  condition: 'Produto limpo, sem danos nem defeitos',
} as const;
export type Fulfilment = {
  programmedAt?: string;
  programmedBy?: string;
  verifiedUrl?: string;
  quality?: Record<keyof typeof qualityChecks, boolean>;
  checkedAt?: string;
  packagedAt?: string;
  dispatchedAt?: string;
  courier?: string;
  tracking?: string;
  deliveredAt?: string;
  note?: string;
};
export const agentActionLabels = {
  start: 'Iniciar produção',
  program: 'Confirmar programação e teste NFC',
  ready: 'Aprovar qualidade',
  package: 'Confirmar embalagem',
  dispatch: 'Registar expedição',
  deliver: 'Confirmar entrega',
  note: 'Guardar nota',
} as const;
export type AgentActionName = keyof typeof agentActionLabels;
export type AgentOrder = Pick<
  SandboxOrder,
  | 'id'
  | 'productId'
  | 'productName'
  | 'status'
  | 'paid'
  | 'qc'
  | 'proof'
  | 'version'
  | 'createdAt'
  | 'updatedAt'
  | 'deliveryCity'
  | 'deliveryAddress'
  | 'deliveryContact'
  | 'design'
  | 'profileUsername'
  | 'fulfilment'
  | 'paymentReference'
> & { approvedUrl: string; customerName: string; quantity: number };

export function approvedAgentUrl(order: SandboxOrder, origin: string) {
  const raw =
    order.design?.profileUrl ||
    (order.profileUsername
      ? new URL('/' + order.profileUsername, origin).href
      : '');
  if (!raw) return '';
  try {
    const url = new URL(raw);
    return ['https:', 'http:'].includes(url.protocol) &&
      !url.username &&
      !url.password
      ? url.href
      : '';
  } catch {
    return '';
  }
}
export function agentOrderView(
  order: SandboxOrder,
  origin: string,
): AgentOrder {
  // Explicit allowlist: never send prices, costs, ledger, plan pricing or payment controls.
  return {
    id: order.id,
    productId: order.productId,
    productName: order.productName,
    status: order.status,
    paid: order.paid,
    qc: order.qc,
    proof: order.proof,
    version: order.version,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
    deliveryCity: order.deliveryCity,
    deliveryAddress: order.deliveryAddress,
    deliveryContact: order.deliveryContact,
    design: order.paid ? order.design : undefined,
    profileUsername: order.profileUsername,
    fulfilment: order.fulfilment,
    paymentReference: order.paymentReference,
    approvedUrl: order.paid ? approvedAgentUrl(order, origin) : '',
    customerName:
      order.design?.holderName || order.profileUsername || 'Cliente',
    quantity: 1,
  };
}
export function availableAgentActions(
  order: Pick<
    AgentOrder,
    'paid' | 'status' | 'approvedUrl' | 'fulfilment' | 'qc'
  >,
): AgentActionName[] {
  if (
    !order.paid ||
    !order.approvedUrl ||
    ['CANCELLED', 'PENDING_PAYMENT', 'DELIVERED'].includes(order.status)
  )
    return [];
  const f = order.fulfilment;
  if (order.status === 'QUEUED') return ['start', 'note'];
  if (order.status === 'IN_PRODUCTION')
    return [f?.programmedAt ? 'ready' : 'program', 'note'];
  if (order.status === 'READY' && order.qc)
    return [
      !f?.packagedAt ? 'package' : !f.dispatchedAt ? 'dispatch' : 'deliver',
      'note',
    ];
  return [];
}
export function agentTransition(
  order: SandboxOrder,
  agentId: string,
  action: string,
  input: Record<string, unknown>,
  origin: string,
): SandboxOrder {
  if (order.agentId !== agentId)
    throw Error('Pedido não atribuído a esta conta.');
  const url = approvedAgentUrl(order, origin);
  if (
    !availableAgentActions({ ...order, approvedUrl: url }).includes(
      action as AgentActionName,
    )
  )
    throw Error(
      'Acção indisponível. Confirme o pagamento, o link aprovado e a etapa anterior com Operações.',
    );
  const now = new Date().toISOString();
  const f: Fulfilment = { ...order.fulfilment };
  const required = (key: string, max: number) => {
    if (
      typeof input[key] !== 'string' ||
      !input[key].trim() ||
      input[key].trim().length > max
    )
      throw Error('Preencha correctamente: ' + key);
    return input[key].trim();
  };
  if (action === 'program') {
    if (input.verifiedUrl !== url || input.tested !== true)
      throw Error('Teste o NFC e confirme exactamente o link aprovado.');
    Object.assign(f, {
      programmedAt: now,
      programmedBy: agentId,
      verifiedUrl: url,
    });
  }
  if (action === 'ready') {
    const quality = input.quality as Fulfilment['quality'];
    if (
      !quality ||
      !Object.keys(qualityChecks).every(
        (key) => quality[key as keyof typeof qualityChecks] === true,
      )
    )
      throw Error('Conclua todas as verificações de qualidade.');
    f.quality = Object.fromEntries(
      Object.keys(qualityChecks).map((key) => [key, true]),
    ) as NonNullable<Fulfilment['quality']>;
    f.checkedAt = now;
  }
  if (action === 'package') {
    if (input.packaged !== true) throw Error('Confirme a embalagem.');
    f.packagedAt = now;
  }
  if (action === 'dispatch')
    Object.assign(f, {
      courier: required('courier', 100),
      tracking: required('tracking', 150),
      dispatchedAt: now,
    });
  if (action === 'deliver') {
    if (input.customerConfirmed !== true)
      throw Error('Confirme a recepção pelo cliente.');
    required('proof', 250);
    f.deliveredAt = now;
  }
  if (action === 'note') f.note = required('note', 1500);
  const next = ['start', 'ready', 'deliver'].includes(action)
    ? transition(order, action, {
        ...input,
        qc: action === 'ready' ? true : input.qc,
      })
    : { ...order, version: order.version + 1, updatedAt: now };
  return { ...next, fulfilment: f };
}

export const reportTypes = {
  incident: 'Problema operacional',
  direct_payment: 'Tentativa de pagamento directo',
  feedback: 'Feedback do cliente',
  low_stock: 'Stock baixo',
  damage: 'Produto danificado',
  stock_count: 'Contagem de stock',
  receipt: 'Confirmar recepção de stock',
  daily: 'Relatório diário',
  weekly: 'Relatório semanal',
} as const;
export type AgentReport = {
  id: string;
  agentId: string;
  agentName: string;
  type: keyof typeof reportTypes;
  message: string;
  orderId: string;
  productId: string;
  quantity?: number;
  status: 'open' | 'resolved';
  createdAt: string;
  response?: string;
  resolvedAt?: string;
  version: number;
  summary?: Record<string, number>;
};
