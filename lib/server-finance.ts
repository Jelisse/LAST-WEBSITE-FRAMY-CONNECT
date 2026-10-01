import { database } from './server-db';
import type { FinanceOperation, FinanceEntry } from './finance-report';
export async function financeData() {
  const db = database();
  const lock = await db
    .prepare(
      'SELECT MAX(through_date) AS through_date FROM finance_period_locks',
    )
    .first<{ through_date: string | null }>();
  const [gateway, manual, legacy, entries, documents] = await Promise.all([
    db
      .prepare(
        "SELECT p.*,a.name,a.email,o.configuration_json,o.fulfilled_at,i.terms_json,i.period_start,i.period_end FROM paysuite_payments p JOIN auth_accounts a ON a.id=p.owner_id LEFT JOIN paysuite_product_orders o ON p.kind='product' AND o.id=p.target_id LEFT JOIN profile_invoices i ON p.kind='subscription' AND i.id=p.target_id ORDER BY p.created_at DESC LIMIT 10001",
      )
      .all<Record<string, unknown>>(),
    db
      .prepare(
        "SELECT i.*,a.name,a.email,r.reference,r.created_at AS receipt_date FROM profile_invoices i JOIN auth_accounts a ON a.id=i.owner_id LEFT JOIN profile_receipts r ON r.invoice_id=i.id WHERE NOT EXISTS(SELECT 1 FROM paysuite_payments p WHERE p.kind='subscription' AND p.target_id=i.id) LIMIT 10001",
      )
      .all<Record<string, unknown>>(),
    db
      .prepare(
        "SELECT o.*,a.name,a.email,p.verified_at,p.provider_reference FROM sandbox_orders o JOIN auth_accounts a ON a.id=o.owner_id LEFT JOIN payment_records p ON p.order_id=o.id AND p.kind='capture' LIMIT 10001",
      )
      .all<Record<string, unknown>>(),
    db
      .prepare('SELECT * FROM finance_entries ORDER BY created_at LIMIT 10001')
      .all<FinanceEntry>(),
    db.prepare('SELECT * FROM finance_documents LIMIT 10001').all(),
  ]);
  if (
    [gateway, manual, legacy, entries, documents].some(
      (r) => r.results.length > 10000,
    )
  )
    throw Error(
      'O volume excede o limite desta consulta. Solicite uma exportação assistida.',
    );
  const parse = (v: unknown) => {
    try {
      return JSON.parse(typeof v === 'string' ? v : '{}');
    } catch {
      return {};
    }
  };
  const text = (v: unknown) =>
    typeof v === 'string' ? v : typeof v === 'number' ? String(v) : null;
  const operations: FinanceOperation[] = [
    ...gateway.results.map((p) => ({
      id: String(p.id),
      kind: p.kind as FinanceOperation['kind'],
      customer: String(p.name),
      email: String(p.email),
      amount: Number(p.amount),
      status: String(p.status),
      method: String(p.method),
      cycle: String(p.cycle),
      createdAt: String(p.created_at),
      paidAt: p.status === 'paid' ? String(p.updated_at) : null,
      fulfilledAt: text(p.fulfilled_at),
      periodStart: text(p.period_start),
      periodEnd: text(p.period_end),
      reference: text(p.provider_id) ?? '',
      description:
        p.kind === 'product'
          ? 'Produto NFC'
          : String(parse(p.terms_json).name ?? 'Plano digital'),
      cost: 0,
    })),
    ...manual.results.map((i) => ({
      id: String(i.id),
      kind: 'subscription' as const,
      customer: String(i.name),
      email: String(i.email),
      amount: Number(i.amount),
      status: i.status === 'confirmed' ? 'paid' : String(i.status),
      method: 'manual',
      cycle: parse(i.terms_json).billingCycle ?? 'monthly',
      createdAt: String(i.created_at),
      paidAt: text(i.receipt_date),
      fulfilledAt: null,
      periodStart: text(i.period_start),
      periodEnd: text(i.period_end),
      reference: text(i.reference) ?? '',
      description: String(parse(i.terms_json).name ?? i.plan_id),
      cost: 0,
    })),
    ...legacy.results.map((o) => {
      const d = parse(o.data_json);
      return {
        id: String(o.id),
        kind: 'product' as const,
        customer: String(o.name),
        email: String(o.email),
        amount: Number(d.amount ?? 0),
        status: o.verified_at ? 'paid' : String(d.status),
        method: 'manual',
        cycle: 'once',
        createdAt: String(o.created_at),
        paidAt: text(o.verified_at),
        fulfilledAt: d.status === 'DELIVERED' ? String(d.updatedAt) : null,
        periodStart: null,
        periodEnd: null,
        reference: text(o.provider_reference) ?? '',
        description: String(d.productName ?? 'Produto'),
        cost: Number(d.cost ?? 0),
      };
    }),
  ];
  const refunds = await db
    .prepare("SELECT * FROM payment_records WHERE kind='refund' LIMIT 10001")
    .all<Record<string, unknown>>();
  if (refunds.results.length > 10000)
    throw Error('Demasiados movimentos para esta consulta.');
  const allEntries: FinanceEntry[] = [
    ...entries.results,
    ...refunds.results.map((r) => ({
      id: 'legacy-' + r.id,
      operation_id: String(r.order_id),
      kind: 'refund' as const,
      amount: Number(r.amount),
      reference: String(r.provider_reference),
      occurred_on: String(r.verified_at).slice(0, 10),
      notes: 'Reembolso registado nas operações',
      reversal_of: null,
    })),
  ];
  return {
    operations,
    entries: allEntries,
    documents: documents.results,
    closedThrough: lock?.through_date ?? null,
  };
}
