export type FinanceOperation = {
  id: string;
  kind: 'product' | 'subscription';
  customer: string;
  email: string;
  amount: number;
  status: string;
  method: string;
  cycle: string;
  createdAt: string;
  paidAt: string | null;
  fulfilledAt: string | null;
  periodStart: string | null;
  periodEnd: string | null;
  reference: string;
  description: string;
  cost: number;
};
export type FinanceEntry = {
  id: string;
  operation_id: string | null;
  kind: 'fee' | 'refund' | 'settlement' | 'expense' | 'reversal';
  amount: number;
  reference: string;
  occurred_on: string;
  notes: string;
  reversal_of: string | null;
  actor?: string;
  created_at?: string;
};
export const entryLabels: Record<FinanceEntry['kind'], string> = {
  fee: 'Taxa do prestador',
  refund: 'Reembolso verificado',
  settlement: 'Liquidação recebida',
  expense: 'Despesa',
  reversal: 'Estorno de registo',
};
export function maputoDay(value: string) {
  const n = Date.parse(value);
  return Number.isFinite(n)
    ? new Date(n + 2 * 3600000).toISOString().slice(0, 10)
    : '';
}
export function validDay(v: unknown): v is string {
  return (
    typeof v === 'string' &&
    /^\d{4}-\d{2}-\d{2}$/.test(v) &&
    Number.isFinite(Date.parse(v + 'T00:00:00Z')) &&
    new Date(v + 'T00:00:00Z').toISOString().slice(0, 10) === v
  );
}
export function recognized(op: FinanceOperation, from: string, to: string) {
  if (!op.paidAt) return 0;
  if (op.kind === 'product')
    return op.fulfilledAt &&
      maputoDay(op.fulfilledAt) >= from &&
      maputoDay(op.fulfilledAt) <= to
      ? op.amount
      : 0;
  const start = Date.parse(op.periodStart ?? ''),
    end = Date.parse(op.periodEnd ?? '');
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start)
    return 0;
  const a = Date.parse(from + 'T00:00:00+02:00'),
    b = Date.parse(to + 'T23:59:59.999+02:00') + 1;
  // Cumulative rounding ensures adjacent accounting periods sum exactly to the invoice.
  const accrued = (t: number) =>
    Math.round(
      op.amount * Math.max(0, Math.min(1, (t - start) / (end - start))),
    );
  return accrued(b) - accrued(a);
}
export function csvCell(v: unknown) {
  let s =
    typeof v === 'string'
      ? v
      : typeof v === 'number' || typeof v === 'boolean'
        ? String(v)
        : '';
  if (/^[\s]*[=+@-]/.test(s)) s = "'" + s;
  return '"' + s.replaceAll('"', '""') + '"';
}
export function csv(rows: unknown[][]) {
  return '\uFEFF' + rows.map((row) => row.map(csvCell).join(';')).join('\r\n');
}
export function effectiveEntries(entries: FinanceEntry[]) {
  const reversed = new Set(
    entries.filter((e) => e.kind === 'reversal').map((e) => e.reversal_of),
  );
  return entries.filter((e) => e.kind !== 'reversal' && !reversed.has(e.id));
}
export function financeSummary(
  ops: FinanceOperation[],
  entries: FinanceEntry[],
  from: string,
  to: string,
) {
  const within = (d: string) => d >= from && d <= to;
  const selected = ops.filter((o) => o.paidAt && within(maputoDay(o.paidAt)));
  const totals = {
    received: selected.reduce((s, o) => s + o.amount, 0),
    recognized: ops.reduce((s, o) => s + recognized(o, from, to), 0),
    fees: 0,
    refunds: 0,
    settlements: 0,
    expenses: 0,
    productReceived: selected
      .filter((o) => o.kind === 'product')
      .reduce((s, o) => s + o.amount, 0),
    subscriptionReceived: selected
      .filter((o) => o.kind === 'subscription')
      .reduce((s, o) => s + o.amount, 0),
  };
  const byId = new Map(entries.map((e) => [e.id, e]));
  for (const e of entries.filter((e) => within(e.occurred_on))) {
    const original = e.kind === 'reversal' ? byId.get(e.reversal_of ?? '') : e;
    if (!original) continue;
    const amount = e.amount * (e.kind === 'reversal' ? -1 : 1);
    if (original.kind === 'fee') totals.fees += amount;
    if (original.kind === 'refund') totals.refunds += amount;
    if (original.kind === 'settlement') totals.settlements += amount;
    if (original.kind === 'expense') totals.expenses += amount;
  }
  return totals;
}
// Operational double-entry journal; account mapping is configurable in the external accounting system.
export function financeJournal(
  ops: FinanceOperation[],
  entries: FinanceEntry[],
  from: string,
  to: string,
) {
  const lines: {
    date: string;
    reference: string;
    account: string;
    debit: number;
    credit: number;
    description: string;
  }[] = [];
  const pair = (
    date: string,
    reference: string,
    description: string,
    debit: string,
    credit: string,
    amount: number,
  ) => {
    if (amount <= 0 || date < from || date > to) return;
    lines.push(
      {
        date,
        reference,
        description,
        account: debit,
        debit: amount,
        credit: 0,
      },
      {
        date,
        reference,
        description,
        account: credit,
        debit: 0,
        credit: amount,
      },
    );
  };
  for (const o of ops) {
    if (o.paidAt)
      pair(
        maputoDay(o.paidAt),
        o.id,
        'Pagamento confirmado',
        'Valores recebidos no prestador',
        'Adiantamentos de clientes',
        o.amount,
      );
    const amount = recognized(o, from, to);
    pair(
      o.kind === 'product' ? maputoDay(o.fulfilledAt ?? '') : to,
      o.id,
      'Reconhecimento bruto do período',
      'Adiantamentos de clientes',
      o.kind === 'product' ? 'Receita de produtos' : 'Receita de subscrições',
      amount,
    );
    if (o.kind === 'product' && amount && o.cost)
      pair(
        maputoDay(o.fulfilledAt!),
        o.id,
        'Custo do produto entregue',
        'Custo dos produtos',
        'Inventário',
        o.cost,
      );
  }
  const byId = new Map(entries.map((e) => [e.id, e]));
  for (const e of entries) {
    const orig = e.kind === 'reversal' ? byId.get(e.reversal_of ?? '') : e;
    if (!orig) continue;
    const accounts = (
      {
        fee: ['Comissões de pagamento', 'Valores recebidos no prestador'],
        settlement: ['Banco / carteira', 'Valores recebidos no prestador'],
        refund: ['Reembolsos a classificar', 'Valores recebidos no prestador'],
        expense: ['Despesas a classificar', 'Banco / carteira'],
      } as Record<string, string[]>
    )[orig.kind];
    if (accounts)
      pair(
        e.occurred_on,
        e.reference,
        e.notes,
        accounts[e.kind === 'reversal' ? 1 : 0],
        accounts[e.kind === 'reversal' ? 0 : 1],
        e.amount,
      );
  }
  return lines.sort((a, b) => a.date.localeCompare(b.date));
}
