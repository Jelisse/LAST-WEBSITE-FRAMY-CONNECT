'use client';
import { useI18n } from '@/components/language-provider';
import { useCallback, useEffect, useState } from 'react';
import {
  financeSummary,
  effectiveEntries,
  maputoDay,
  entryLabels,
  type FinanceOperation,
  type FinanceEntry,
} from '@/lib/finance-report';
type Document = {
  operation_id: string;
  document_type: string;
  reference: string;
  issued_on: string;
  notes: string;
  version: number;
};
type Data = {
  closedThrough: string | null;
  operations: FinanceOperation[];
  entries: FinanceEntry[];
  documents: Document[];
  summary: ReturnType<typeof financeSummary>;
  journal: {
    date: string;
    reference: string;
    account: string;
    debit: number;
    credit: number;
    description: string;
  }[];
};
const money = (v: number) =>
  new Intl.NumberFormat('pt-MZ', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(v / 100) + ' MT';
export function FinanceManager() {
  const { t } = useI18n();
  const today = maputoDay(new Date().toISOString());
  const [from, setFrom] = useState(today.slice(0, 7) + '-01'),
    [to, setTo] = useState(today),
    [data, setData] = useState<Data | null>(null),
    [tab, setTab] = useState('overview'),
    [search, setSearch] = useState(''),
    [kind, setKind] = useState('all'),
    [error, setError] = useState(''),
    [notice, setNotice] = useState(''),
    [busy, setBusy] = useState(false),
    [selected, setSelected] = useState<FinanceOperation | null>(null),
    [entryKind, setEntryKind] = useState('fee');
  const query = new URLSearchParams({ from, to }).toString();
  const load = useCallback(
    async (signal?: AbortSignal) => {
      const r = await fetch(
        '/api/manager-finance?' + new URLSearchParams({ from, to }),
        {
          cache: 'no-store',
          signal: signal
            ? AbortSignal.any([signal, AbortSignal.timeout(20000)])
            : AbortSignal.timeout(20000),
        },
      );
      const d = (await r.json()) as Data & { error?: string };
      if (!r.ok) throw Error(d.error ?? 'Não foi possível concluir.');
      setData(d);
      setError('');
    },
    [from, to],
  );
  useEffect(() => {
    const c = new AbortController();
    // Clear the previous period while the external request loads.
    // oxlint-disable-next-line react/react-compiler
    setData(null);
    void load(c.signal).catch((e) => {
      if (!c.signal.aborted) setError(e.message);
    });
    return () => c.abort();
  }, [load]);
  async function save(body: object) {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const r = await fetch('/api/manager-finance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(20000),
      });
      const d = (await r.json()) as Data & { error?: string };
      if (!r.ok) throw Error(d.error ?? 'Não foi possível concluir.');
      await load();
      setSelected(null);
      setNotice(
        'Registo guardado. Este registo não executa transferências nem emite documentos fiscais.',
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Não foi possível guardar.');
    } finally {
      setBusy(false);
    }
  }
  const operations =
    data?.operations.filter((o) => {
      const created = maputoDay(o.createdAt),
        paid = maputoDay(o.paidAt ?? '');
      return (
        ((created >= from && created <= to) || (paid >= from && paid <= to)) &&
        (kind === 'all' || o.kind === kind) &&
        `${o.customer} ${o.email} ${o.reference} ${o.id}`
          .toLowerCase()
          .includes(search.toLowerCase())
      );
    }) ?? [];
  const document = data?.documents.find((d) => d.operation_id === selected?.id);
  const totals = data?.summary;
  const activeEntries = effectiveEntries(data?.entries ?? []);
  return (
    <section className="management-suite" aria-busy={busy}>
      <div className="suite-toolbar">
        <label>
          {t(' De ')}
          <input
            aria-label={t('Data inicial')}
            type="date"
            value={from}
            max={to}
            onChange={(e) => setFrom(e.target.value)}
          />
        </label>
        <label>
          {t(' Até ')}
          <input
            aria-label={t('Data final')}
            type="date"
            value={to}
            min={from}
            max={today}
            onChange={(e) => setTo(e.target.value)}
          />
        </label>
        <button
          disabled={busy}
          onClick={() => {
            setBusy(true);
            void load()
              .catch((e) => setError(e.message))
              .finally(() => setBusy(false));
          }}
        >
          {t(' Actualizar ')}
        </button>
      </div>
      <nav className="suite-tabs" aria-label={t('Gestão financeira')}>
        {[
          ['overview', 'Resumo e gráficos'],
          ['operations', 'Vendas e documentos'],
          ['entries', 'Reconciliação e despesas'],
          ['journal', 'Diário e razão'],
          ['exports', 'Exportação'],
        ].map(([id, label]) => (
          <button key={id} aria-pressed={tab === id} onClick={() => setTab(id)}>
            {t(label)}
          </button>
        ))}
      </nav>
      {error && (
        <p role="alert" className="manager-error">
          {t(error)}
        </p>
      )}
      {notice && <output className="manager-notice">{t(notice)}</output>}
      <p className="suite-note">
        {t(
          ' Controlo de gestão em MZN · datas de Maputo · facturas emitidas num sistema externo. Sem cálculo automático de ISPC até validação do enquadramento fiscal. ',
        )}
      </p>
      {!data ? (
        <p>{t('A carregar movimentos…')}</p>
      ) : (
        <>
          {tab === 'overview' && totals && (
            <>
              <div className="suite-stats">
                {[
                  ['Pagamentos recebidos', totals.received],
                  ['Receita bruta reconhecida', totals.recognized],
                  ['Liquidações registadas', totals.settlements],
                  ['Reembolsos registados', totals.refunds],
                  ['Taxas registadas', totals.fees],
                  ['Despesas registadas', totals.expenses],
                ].map(([label, value]) => (
                  <article key={label}>
                    <span>{t(label)}</span>
                    <strong>{money(Number(value))}</strong>
                  </article>
                ))}
              </div>
              <div className="suite-grid">
                <article className="manager-card">
                  <h2>{t('Recebimentos por actividade')}</h2>
                  {[
                    ['Produtos físicos', totals.productReceived],
                    ['Subscrições digitais', totals.subscriptionReceived],
                  ].map(([label, value]) => (
                    <div className="suite-bar" key={label}>
                      <span>
                        {t(label)} · {money(Number(value))}
                      </span>
                      <meter
                        min={0}
                        max={Math.max(totals.received, 1)}
                        value={Number(value)}
                        aria-label={String(label)}
                      />
                    </div>
                  ))}
                  {!totals.received && (
                    <p>{t('Sem pagamentos confirmados neste período.')}</p>
                  )}
                </article>
                <article className="manager-card">
                  <h2>{t('Recebimentos por mês')}</h2>
                  {(() => {
                    const monthly = new Map<string, number>();
                    data.operations
                      .filter(
                        (o) =>
                          o.paidAt &&
                          maputoDay(o.paidAt) >= from &&
                          maputoDay(o.paidAt) <= to,
                      )
                      .forEach((o) => {
                        const key = maputoDay(o.paidAt!).slice(0, 7);
                        monthly.set(key, (monthly.get(key) ?? 0) + o.amount);
                      });
                    const max = Math.max(1, ...monthly.values());
                    return monthly.size ? (
                      [...monthly]
                        .sort(([a], [b]) => a.localeCompare(b))
                        .map(([month, value]) => (
                          <div className="suite-bar" key={month}>
                            <span>
                              {month} · {money(value)}
                            </span>
                            <meter
                              min={0}
                              max={max}
                              value={value}
                              aria-label={month}
                            />
                          </div>
                        ))
                    ) : (
                      <p>{t('Sem dados no período escolhido.')}</p>
                    );
                  })()}
                </article>
              </div>
              <section className="manager-card">
                <h2>{t('Como interpretar os valores')}</h2>
                <p>
                  {t(
                    ' Recebimentos usam a data de confirmação do pagamento. Subscrições são reconhecidas proporcionalmente ao período de serviço; produtos, na entrega registada. A receita apresentada é bruta, antes de ajustar devoluções e impostos. ',
                  )}
                </p>
                <p>
                  {t(
                    ' Taxas, liquidações, despesas e reembolsos manuais só entram após registo com comprovativo. Valores em falta não significam custo zero. Este painel não apresenta lucro líquido nem substitui as demonstrações do contabilista. ',
                  )}
                </p>
                {data.operations.some(
                  (o) => o.kind === 'product' && o.paidAt && !o.fulfilledAt,
                ) && (
                  <p>
                    {t(
                      ' Existem produtos pagos sem data de entrega registada: a respectiva receita ainda não foi reconhecida neste relatório. ',
                    )}
                  </p>
                )}
              </section>
            </>
          )}
          {tab === 'operations' && (
            <section className="manager-card">
              <h2>{t('Vendas e documentos externos')}</h2>
              <div className="suite-toolbar">
                <input
                  placeholder={t('Cliente ou referência')}
                  aria-label={t('Pesquisar movimento')}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                <select
                  value={kind}
                  aria-label={t('Tipo de operação')}
                  onChange={(e) => setKind(e.target.value)}
                >
                  <option value="all">{t('Todas as actividades')}</option>
                  <option value="product">{t('Produtos')}</option>
                  <option value="subscription">{t('Subscrições')}</option>
                </select>
              </div>
              <div className="suite-table">
                <table>
                  <thead>
                    <tr>
                      <th>{t('Cliente / operação')}</th>
                      <th>{t('Tipo')}</th>
                      <th>{t('Recebido em')}</th>
                      <th>{t('Valor')}</th>
                      <th>{t('Documento')}</th>
                      <th>{t('Acção')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {operations.map((o) => (
                      <tr key={o.id}>
                        <td>
                          {o.customer}
                          <small>
                            {o.description} · {o.id}
                          </small>
                        </td>
                        <td>
                          {t(
                            o.kind === 'product'
                              ? 'Produto'
                              : o.cycle === 'annual'
                                ? 'Plano anual'
                                : 'Plano mensal',
                          )}
                        </td>
                        <td>
                          {t(o.paidAt ? maputoDay(o.paidAt) : 'Não confirmado')}
                        </td>
                        <td>{money(o.amount)}</td>
                        <td>
                          {data.documents.find((d) => d.operation_id === o.id)
                            ?.reference ?? 'Por associar'}
                        </td>
                        <td>
                          <button onClick={() => setSelected(o)}>
                            {t(' Associar factura ')}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {!operations.length && (
                <p>{t('Sem movimentos para estes filtros.')}</p>
              )}
              {selected && (
                <form
                  key={selected.id}
                  className="suite-form suite-preview"
                  onSubmit={(e) => {
                    e.preventDefault();
                    const f = new FormData(e.currentTarget);
                    void save({
                      action: 'document',
                      operationId: selected.id,
                      version: document?.version ?? 0,
                      documentType: f.get('type'),
                      reference: f.get('reference'),
                      date: f.get('date'),
                      notes: f.get('notes'),
                    });
                  }}
                >
                  <h3>
                    {t('Documento externo · ')}
                    {selected.customer}
                  </h3>
                  <label>
                    {t(' Tipo ')}
                    <select
                      name="type"
                      defaultValue={document?.document_type ?? 'Factura'}
                    >
                      <option>{t('Factura')}</option>
                      <option>{t('Factura-recibo')}</option>
                      <option>{t('Nota de crédito')}</option>
                    </select>
                  </label>
                  <label>
                    {t(' Referência emitida no sistema externo ')}
                    <input
                      name="reference"
                      required
                      maxLength={100}
                      defaultValue={document?.reference}
                    />
                  </label>
                  <label>
                    {t(' Data de emissão ')}
                    <input
                      name="date"
                      required
                      type="date"
                      max={today}
                      defaultValue={document?.issued_on ?? today}
                    />
                  </label>
                  <label>
                    {t(' Notas ')}
                    <textarea
                      name="notes"
                      maxLength={500}
                      defaultValue={document?.notes}
                    />
                  </label>
                  <button disabled={busy}>{t('Guardar referência')}</button>
                  <button type="button" onClick={() => setSelected(null)}>
                    {t(' Fechar ')}
                  </button>
                </form>
              )}
            </section>
          )}
          {tab === 'entries' && (
            <>
              <section className="manager-card">
                <h2>{t('Saldo por reconciliar no prestador')}</h2>
                <div className="suite-table">
                  <table>
                    <thead>
                      <tr>
                        <th>{t('Pagamento')}</th>
                        <th>{t('Recebido')}</th>
                        <th>{t('Taxas / reembolsos / liquidações')}</th>
                        <th>{t('Saldo')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.operations
                        .filter((o) => o.paidAt)
                        .map((o) => {
                          const adjustments = activeEntries
                            .filter((e) => e.operation_id === o.id)
                            .reduce((s, e) => s + e.amount, 0);
                          return (
                            <tr key={o.id}>
                              <td>
                                {o.customer}
                                <small>{o.reference || o.id}</small>
                              </td>
                              <td>{money(o.amount)}</td>
                              <td>{money(adjustments)}</td>
                              <td>{money(o.amount - adjustments)}</td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
                <p>
                  {t(
                    ' Saldo global desde o início. Um saldo negativo exige revisão, por exemplo após um reembolso posterior à liquidação. ',
                  )}
                </p>
              </section>
              <form
                className="manager-card suite-form"
                onSubmit={(e) => {
                  e.preventDefault();
                  const f = new FormData(e.currentTarget);
                  void save({
                    action: 'entry',
                    kind: entryKind,
                    operationId: f.get('operation'),
                    reference: f.get('reference'),
                    date: f.get('date'),
                    amount: Math.round(Number(f.get('amount')) * 100),
                    notes: f.get('notes'),
                    verified: f.get('verified') === 'on',
                    reversalOf: f.get('reversal'),
                  });
                }}
              >
                <h2>{t('Registar movimento comprovado')}</h2>
                <p>
                  {t(
                    ' Registe aqui movimentos já realizados. Este formulário não executa reembolsos nem transferências. ',
                  )}
                </p>
                <div className="suite-grid">
                  <label>
                    {t(' Tipo ')}
                    <select
                      value={entryKind}
                      onChange={(e) => setEntryKind(e.target.value)}
                    >
                      {Object.entries(entryLabels).map(([id, label]) => (
                        <option key={id} value={id}>
                          {t(label)}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    {t(' Pagamento associado ')}
                    <select
                      name="operation"
                      required={!['expense', 'reversal'].includes(entryKind)}
                      disabled={['expense', 'reversal'].includes(entryKind)}
                    >
                      <option value="">{t('Seleccione')}</option>
                      {data.operations
                        .filter((o) => o.paidAt)
                        .map((o) => (
                          <option key={o.id} value={o.id}>
                            {o.customer} · {money(o.amount)} · {o.id}
                          </option>
                        ))}
                    </select>
                  </label>
                  {entryKind === 'reversal' && (
                    <label>
                      {t(' Registo a estornar ')}
                      <select name="reversal" required>
                        <option value="">{t('Seleccione')}</option>
                        {activeEntries
                          .filter((e) => !e.id.startsWith('legacy-'))
                          .map((e) => (
                            <option key={e.id} value={e.id}>
                              {e.reference} · {money(e.amount)}
                            </option>
                          ))}
                      </select>
                    </label>
                  )}
                  <label>
                    {t(' Valor (MT) ')}
                    <input
                      name="amount"
                      required
                      type="number"
                      min="0.01"
                      max="10000000"
                      step="0.01"
                    />
                  </label>
                  <label>
                    {t(' Data efectiva ')}
                    <input
                      required
                      name="date"
                      type="date"
                      max={today}
                      defaultValue={today}
                    />
                  </label>
                </div>
                <label>
                  {t(' Referência única do comprovativo ')}
                  <input name="reference" required maxLength={120} />
                </label>
                <label>
                  {t(' Descrição / motivo ')}
                  <textarea name="notes" required maxLength={500} />
                </label>
                <label className="suite-check">
                  <input name="verified" type="checkbox" required />
                  {t(' Verifiquei o movimento e o comprovativo. ')}
                </label>
                <button className="manager-primary" disabled={busy}>
                  {t(' Registar movimento ')}
                </button>
              </form>
              <section className="manager-card">
                <h2>{t('Movimentos registados')}</h2>
                <div className="suite-table">
                  <table>
                    <thead>
                      <tr>
                        <th>{t('Data')}</th>
                        <th>{t('Tipo')}</th>
                        <th>{t('Referência')}</th>
                        <th>{t('Valor')}</th>
                        <th>{t('Descrição')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.entries
                        .filter(
                          (e) => e.occurred_on >= from && e.occurred_on <= to,
                        )
                        .map((e) => (
                          <tr key={e.id}>
                            <td>{e.occurred_on}</td>
                            <td>{entryLabels[e.kind]}</td>
                            <td>{e.reference}</td>
                            <td>{money(e.amount)}</td>
                            <td>{e.notes}</td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </section>
            </>
          )}
          {tab === 'journal' && (
            <section className="manager-card">
              <h2>{t('Diário de gestão e razão por conta')}</h2>
              <p>
                {t(
                  ' Débitos e créditos de gestão. O contabilista classifica reembolsos, despesas e impostos no sistema externo; não são contas fiscais oficiais. ',
                )}
              </p>
              <div className="suite-table">
                <table>
                  <thead>
                    <tr>
                      <th>{t('Conta')}</th>
                      <th>{t('Débitos')}</th>
                      <th>{t('Créditos')}</th>
                      <th>{t('Saldo do período')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...new Set(data.journal.map((j) => j.account))].map(
                      (account) => {
                        const rows = data.journal.filter(
                            (j) => j.account === account,
                          ),
                          debit = rows.reduce((s, j) => s + j.debit, 0),
                          credit = rows.reduce((s, j) => s + j.credit, 0);
                        return (
                          <tr key={account}>
                            <td>{account}</td>
                            <td>{money(debit)}</td>
                            <td>{money(credit)}</td>
                            <td>{money(debit - credit)}</td>
                          </tr>
                        );
                      },
                    )}
                  </tbody>
                </table>
                <table>
                  <thead>
                    <tr>
                      <th>{t('Data')}</th>
                      <th>{t('Referência')}</th>
                      <th>{t('Conta')}</th>
                      <th>{t('Débito')}</th>
                      <th>{t('Crédito')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.journal.map((j, i) => (
                      <tr key={i}>
                        <td>{j.date}</td>
                        <td>{j.reference}</td>
                        <td>{j.account}</td>
                        <td>{money(j.debit)}</td>
                        <td>{money(j.credit)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}
          {tab === 'exports' && (
            <section className="manager-card">
              <h2>{t('Exportação para o contabilista')}</h2>
              <p>
                {t(
                  ' Ficheiros CSV compatíveis com Excel, valores em meticais e datas de Maputo. Período: ',
                )}
                {from} {t(' a ')}
                {to}.
              </p>
              <div className="suite-toolbar">
                {[
                  ['summary', 'Resumo do período'],
                  ['operations', 'Vendas e facturas'],
                  ['entries', 'Despesas e reconciliação'],
                  ['journal', 'Diário de gestão'],
                ].map(([id, label]) => (
                  <a
                    className="manager-primary"
                    key={id}
                    href={'/api/manager-finance?' + query + '&export=' + id}
                  >
                    {t(label)} {t(' · CSV ')}
                  </a>
                ))}
              </div>
              <form
                className="suite-form suite-preview"
                onSubmit={(e) => {
                  e.preventDefault();
                  const f = new FormData(e.currentTarget);
                  void save({
                    action: 'close-period',
                    date: f.get('date'),
                    verified: f.get('verified') === 'on',
                  });
                }}
              >
                <h3>{t('Fecho dos registos de gestão')}</h3>
                <p>
                  {t(' Fechado até: ')}
                  {data.closedThrough ?? 'Nenhum período'}
                  {t(
                    '. Impede novos movimentos manuais e alterações a documentos nos períodos fechados. Correcções por estorno ficam no período aberto; o fecho não interrompe confirmações automáticas do prestador. ',
                  )}
                </p>
                <label>
                  {t(' Último dia do mês a fechar ')}
                  <input name="date" type="date" required max={today} />
                </label>
                <label className="suite-check">
                  <input type="checkbox" name="verified" required />
                  {t(
                    ' Revi e exportei os movimentos. Compreendo que este fecho não pode ser desfeito neste painel. ',
                  )}
                </label>
                <button disabled={busy}>{t('Fechar período de gestão')}</button>
              </form>
              <p>
                {t(
                  ' Os ficheiros incluem dados de clientes: partilhe apenas com quem trata da contabilidade. Os valores não constituem uma declaração de ISPC nem um ficheiro fiscal certificado. ',
                )}
              </p>
            </section>
          )}
        </>
      )}
    </section>
  );
}
