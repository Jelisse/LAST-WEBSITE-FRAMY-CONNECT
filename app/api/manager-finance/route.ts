import { getChatGPTUser } from '@/app/chatgpt-auth';
import { database } from '@/lib/server-db';
import { profileBody, profileJSON as json } from '@/lib/profile-api';
import { financeData } from '@/lib/server-finance';
import {
  csv,
  financeSummary,
  financeJournal,
  maputoDay,
  validDay,
} from '@/lib/finance-report';
export const dynamic = 'force-dynamic';
export async function GET(request: Request) {
  const user = await getChatGPTUser();
  if (user?.role !== 'manager')
    return json({ error: 'Acesso reservado.' }, 403);
  try {
    const q = new URL(request.url).searchParams,
      today = maputoDay(new Date().toISOString()),
      from = q.get('from') ?? today.slice(0, 7) + '-01',
      to = q.get('to') ?? today;
    if (!validDay(from) || !validDay(to) || from > to || to > today)
      throw Error('Período inválido. Use datas até hoje.');
    const data = await financeData();
    const journal = financeJournal(data.operations, data.entries, from, to),
      summary = financeSummary(data.operations, data.entries, from, to);
    if (q.get('export')) {
      const docs = new Map(data.documents.map((d) => [d.operation_id, d]));
      const rows =
        q.get('export') === 'summary' ? [['Resumo de gestão MZN',from,to],['Pagamentos recebidos',(summary.received/100).toFixed(2)],['Receita bruta reconhecida',(summary.recognized/100).toFixed(2)],['Recebimentos de produtos',(summary.productReceived/100).toFixed(2)],['Recebimentos de subscrições',(summary.subscriptionReceived/100).toFixed(2)],['Taxas registadas',(summary.fees/100).toFixed(2)],['Reembolsos registados',(summary.refunds/100).toFixed(2)],['Liquidações registadas',(summary.settlements/100).toFixed(2)],['Despesas registadas',(summary.expenses/100).toFixed(2)],['ISPC','Não calculado: enquadramento por validar']] :
        q.get('export') === 'journal'
          ? [
              [
                'Data',
                'Operação/referência',
                'Conta de gestão',
                'Débito MZN',
                'Crédito MZN',
                'Descrição',
              ],
              ...journal.map((j) => [
                j.date,
                j.reference,
                j.account,
                (j.debit / 100).toFixed(2),
                (j.credit / 100).toFixed(2),
                j.description,
              ]),
            ]
          : q.get('export') === 'entries'
            ? [
                [
                  'Data',
                  'Referência',
                  'Tipo',
                  'Operação',
                  'Valor MZN',
                  'Notas',
                  'Estorno de',
                ],
                ...data.entries
                  .filter((e) => e.occurred_on >= from && e.occurred_on <= to)
                  .map((e) => [
                    e.occurred_on,
                    e.reference,
                    e.kind,
                    e.operation_id,
                    (e.amount / 100).toFixed(2),
                    e.notes,
                    e.reversal_of,
                  ]),
              ]
            : [
                [
                  'Operação',
                  'Categoria',
                  'Cliente',
                  'Email',
                  'Descrição',
                  'Ciclo',
                  'Criado em',
                  'Recebido em',
                  'Estado',
                  'Valor MZN',
                  'Método',
                  'Referência pagamento',
                  'Início serviço',
                  'Fim serviço',
                  'Documento externo',
                  'Data emissão',
                ],
                ...data.operations
                  .filter((o) => {
                    const created = maputoDay(o.createdAt),
                      paid = maputoDay(o.paidAt ?? '');
                    return (
                      (created >= from && created <= to) ||
                      (paid >= from && paid <= to)
                    );
                  })
                  .map((o) => [
                    o.id,
                    o.kind,
                    o.customer,
                    o.email,
                    o.description,
                    o.cycle,
                    o.createdAt,
                    o.paidAt,
                    o.status,
                    (o.amount / 100).toFixed(2),
                    o.method,
                    o.reference,
                    o.periodStart,
                    o.periodEnd,
                    docs.get(o.id)?.reference,
                    docs.get(o.id)?.issued_on,
                  ]),
              ];
      return new Response(csv(rows), {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="framy-finance-${from}-${to}.csv"`,
          'Cache-Control': 'private, no-store',
        },
      });
    }
    return json({ ...data, summary, journal, from, to });
  } catch (e) {
    return json(
      {
        error:
          e instanceof Error && !/SQL|D1|constraint/i.test(e.message)
            ? e.message
            : 'Não foi possível carregar as finanças.',
      },
      422,
    );
  }
}
export async function POST(request: Request) {
  const user = await getChatGPTUser();
  if (user?.role !== 'manager')
    return json({ error: 'Acesso reservado.' }, 403);
  try {
    const b = await profileBody(request);
    const db = database(),
      now = new Date().toISOString();
    const text = (v: unknown, max: number, required = true) => {
      if (typeof v !== 'string' || v.length > max || (required && !v.trim()))
        throw Error('Preencha os campos obrigatórios.');
      return v.trim();
    };
    const data = await financeData();
    const op = data.operations.find((o) => o.id === b.operationId);
    let stmt;
    if (b.action === 'close-period') {
      if (!validDay(b.date) || b.date >= maputoDay(now) || b.verified !== true)
        throw Error('Confirme um período terminado.');
      const next = new Date(Date.parse(b.date + 'T00:00:00Z') + 86400000);
      if (next.getUTCDate() !== 1)
        throw Error('Seleccione o último dia do mês.');
      stmt = db
        .prepare(
          "INSERT INTO finance_period_locks(through_date,actor,created_at) SELECT ?,?,? WHERE COALESCE((SELECT MAX(through_date) FROM finance_period_locks),'')<?",
        )
        .bind(b.date, user.userId, now, b.date);
    } else if (b.action === 'document') {
      if (!op) throw Error('Operação inválida.');
      if (
        data.closedThrough &&
        typeof b.date === 'string' &&
        b.date <= data.closedThrough
      )
        throw Error(
          'Período fechado. Registe uma correcção no período aberto.',
        );
      if (!Number.isInteger(b.version) || Number(b.version) < 0)
        throw Error('Versão inválida.');
      const reference = text(b.reference, 100),
        notes = text(b.notes, 500, false),
        kind = text(b.documentType, 40);
      if (
        !['Factura', 'Factura-recibo', 'Nota de crédito'].includes(kind) ||
        !validDay(b.date) ||
        b.date > maputoDay(now)
      )
        throw Error('Documento inválido.');
      stmt = db
        .prepare(
          'INSERT INTO finance_documents(operation_id,document_type,reference,issued_on,notes,version,updated_by,updated_at) SELECT ?,?,?,?,?,1,?,? WHERE COALESCE((SELECT version FROM finance_documents WHERE operation_id=?),0)=? ON CONFLICT(operation_id) DO UPDATE SET document_type=excluded.document_type,reference=excluded.reference,issued_on=excluded.issued_on,notes=excluded.notes,version=finance_documents.version+1,updated_by=excluded.updated_by,updated_at=excluded.updated_at',
        )
        .bind(
          op.id,
          kind,
          reference,
          b.date,
          notes,
          user.userId,
          now,
          op.id,
          b.version,
        );
    } else if (b.action === 'entry') {
      if (
        data.closedThrough &&
        typeof b.date === 'string' &&
        b.date <= data.closedThrough
      )
        throw Error(
          'Período fechado. Registe uma correcção no período aberto.',
        );
      const kind = text(b.kind, 20),
        reference = text(b.reference, 120),
        notes = text(b.notes, 500);
      if (
        !['fee', 'refund', 'settlement', 'expense', 'reversal'].includes(
          kind,
        ) ||
        !validDay(b.date) ||
        b.date > maputoDay(now) ||
        !Number.isSafeInteger(b.amount) ||
        Number(b.amount) <= 0 ||
        Number(b.amount) > 1000000000
      )
        throw Error('Movimento inválido.');
      if (b.verified !== true)
        throw Error('Confirme o movimento no documento ou prestador.');
      if (kind !== 'expense' && kind !== 'reversal' && !op?.paidAt)
        throw Error('Escolha uma operação paga.');
      const original =
        kind === 'reversal'
          ? data.entries.find(
              (e) =>
                e.id === b.reversalOf &&
                e.kind !== 'reversal' &&
                !e.id.startsWith('legacy-'),
            )
          : null;
      if (
        kind === 'reversal' &&
        (!original ||
          original.amount !== b.amount ||
          b.date < original.occurred_on)
      )
        throw Error('Estorno inválido.');
      if (op?.paidAt && b.date < maputoDay(op.paidAt) && kind !== 'expense')
        throw Error('O movimento não pode anteceder o pagamento.');
      const operationId =
        kind === 'reversal'
          ? original!.operation_id
          : kind === 'expense'
            ? null
            : op!.id;
      // Conditional insertion serializes over-allocation checks with concurrent writes.
      const bound = ['fee', 'refund', 'settlement'].includes(kind)
        ? op!.amount
        : 1000000000000;
      const legacyRefund = data.entries
        .filter(
          (e) => e.operation_id === operationId && e.id.startsWith('legacy-'),
        )
        .reduce((s, e) => s + e.amount, 0);
      stmt = db
        .prepare(
          "INSERT INTO finance_entries(id,operation_id,kind,amount,reference,occurred_on,notes,reversal_of,actor,created_at) SELECT ?,?,?,?,?,?,?,?,?,? WHERE ?='reversal' OR ?='expense' OR ?+?+COALESCE((SELECT SUM(e.amount) FROM finance_entries e WHERE e.operation_id=? AND e.kind IN ('fee','refund','settlement') AND (?<>'refund' OR e.kind='refund') AND NOT EXISTS(SELECT 1 FROM finance_entries r WHERE r.reversal_of=e.id)),0)<=?",
        )
        .bind(
          crypto.randomUUID(),
          operationId,
          kind,
          b.amount,
          reference,
          b.date,
          notes,
          original?.id ?? null,
          user.userId,
          now,
          kind,
          kind,
          b.amount,
          legacyRefund,
          operationId,
          kind,
          bound,
        );
    } else throw Error('Acção inválida.');
    const result = await db.batch([
      stmt,
      db
        .prepare('INSERT INTO manager_audit SELECT ?,?,?,?,? WHERE changes()>0')
        .bind(
          crypto.randomUUID(),
          user.userId,
          'Financeiro: ' + b.action,
          JSON.stringify({
            operation: b.operationId ?? null,
            reference: b.reference,
            date: b.date,
            amount: b.amount ?? null,
            notes: b.notes,
          }),
          now,
        ),
    ]);
    return result[0].meta.changes
      ? json({ ok: true })
      : json(
          {
            error:
              'Registo alterado ou valor superior ao saldo por reconciliar. Actualize.',
          },
          409,
        );
  } catch (e) {
    return json(
      {
        error:
          e instanceof Error && !/SQL|D1|constraint|unique/i.test(e.message)
            ? e.message
            : 'Não foi possível guardar. Verifique referências repetidas.',
      },
      422,
    );
  }
}
