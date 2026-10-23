'use client';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from './ui/dialog';
import { useEffect, useState } from 'react';
import { useI18n } from './language-provider';
import { csvCell } from '@/lib/site-analytics';
import { followupStatuses } from '@/lib/company-cards';
export type CompanyLead = {
  id: string;
  account_id: string;
  campaign_id: string;
  name: string;
  email: string;
  phone: string;
  interest: string;
  created_at: number;
  followup_status?: string | null;
  followup_note?: string | null;
  followup_due?: string | null;
  followup_version?: number | null;
  followup_tags?: string | null;
  followup_assignee?: string | null;
};
export function CompanyFollowups({
  organisation,
  leads,
  onSaved,
  memberNames = {},
  leader = false,
  campaignNames = {},
}: {
  organisation: string;
  leads: CompanyLead[];
  onSaved: () => Promise<unknown>;
  memberNames?: Record<string, string>;
  leader?: boolean;
  campaignNames?: Record<string, string>;
}) {
  const { t } = useI18n();
  const [status, setStatus] = useState('all'),
    [query, setQuery] = useState(''),
    [selected, setSelected] = useState<CompanyLead | null>(null),
    [draft, setDraft] = useState({
      status: 'new',
      note: '',
      dueDate: '',
      tags: '',
      assignee: '',
    }),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [sort, setSort] = useState('newest'),
    [tag, setTag] = useState(''),
    [history, setHistory] = useState<
      { name: string; created_at: number; details_json: string }[]
    >([]),
    [historyError, setHistoryError] = useState(''),
    [historyLoading, setHistoryLoading] = useState(false);
  const original = selected
    ? {
        status: selected.followup_status || 'new',
        note: selected.followup_note || '',
        dueDate: selected.followup_due || '',
        tags: selected.followup_tags || '',
        assignee: selected.followup_assignee || '',
      }
    : null;
  const dirty =
    !!selected && JSON.stringify(original) !== JSON.stringify(draft);
  function close() {
    if (
      !busy &&
      (!dirty || window.confirm(t('Descartar alterações não guardadas?')))
    )
      setSelected(null);
  }
  useEffect(() => {
    if (!selected) return;
    let current = true;
    void fetch(
      '/api/company-cards?organisation=' +
        encodeURIComponent(organisation) +
        '&lead=' +
        encodeURIComponent(selected.id),
      { cache: 'no-store' },
    )
      .then(async (r) => {
        const b = (await r.json()) as {
          error?: string;
          history: typeof history;
        };
        if (!r.ok) throw Error(b.error);
        if (current) {
          setHistory(b.history);
          setHistoryLoading(false);
        }
      })
      .catch(() => {
        if (current) {
          setHistoryError('Não foi possível carregar o histórico.');
          setHistoryLoading(false);
        }
      });
    return () => {
      current = false;
    };
  }, [selected, organisation]);
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (dirty) e.preventDefault();
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [dirty]);
  const today = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Africa/Maputo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
  const shown = leads
    .filter(
      (l) =>
        (status === 'all' ||
          (status === 'today'
            ? l.followup_due === today &&
              !['done', 'archived'].includes(l.followup_status || 'new')
            : status === 'overdue'
              ? !!l.followup_due &&
                l.followup_due < today &&
                !['done', 'archived'].includes(l.followup_status || 'new')
              : (l.followup_status || 'new') === status)) &&
        (!tag ||
          (l.followup_tags || '')
            .split(',')
            .map((v) => v.trim())
            .includes(tag)) &&
        [l.name, l.email, l.phone, l.interest, l.followup_note, l.followup_tags]
          .join(' ')
          .toLocaleLowerCase()
          .includes(query.toLocaleLowerCase()),
    )
    .sort((a, b) =>
      sort === 'name'
        ? a.name.localeCompare(b.name)
        : sort === 'due'
          ? (a.followup_due || '9999').localeCompare(b.followup_due || '9999')
          : b.created_at - a.created_at,
    );
  function exportShown() {
    const rows = [
      [
        'Nome',
        'Email',
        'Telefone',
        'Interesse',
        'Trabalhador',
        'Data',
        'Seguimento',
        'Próximo contacto',
        'Notas internas',
        'Etiquetas',
        'Responsável',
        'Campanha',
      ],
      ...shown.map((lead) => [
        lead.name,
        lead.email,
        lead.phone,
        lead.interest,
        memberNames[lead.account_id] || '',
        new Date(lead.created_at).toISOString(),
        t(
          followupStatuses[
            (lead.followup_status || 'new') as keyof typeof followupStatuses
          ],
        ),
        lead.followup_due || '',
        lead.followup_note || '',
        lead.followup_tags || '',
        memberNames[lead.followup_assignee || lead.account_id] || '',
        campaignNames[lead.campaign_id] || '',
      ]),
    ];
    const url = URL.createObjectURL(
      new Blob(
        ['\ufeff' + rows.map((row) => row.map(csvCell).join(',')).join('\r\n')],
        { type: 'text/csv;charset=utf-8' },
      ),
    );
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'framy-contactos.csv';
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  return (
    <section
      className="corporate-panel company-followups"
      data-company-unsaved={dirty ? 'true' : undefined}
    >
      <h3>{t('Dar seguimento aos contactos')}</h3>
      <p>
        {t(
          'Registe o próximo passo. Email e telefone abrem a sua aplicação; nenhuma mensagem é enviada automaticamente.',
        )}
      </p>
      <div className="company-actions">
        <label>
          {t('Pesquisar contactos')}
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
        <label>
          {t('Estado do seguimento')}
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="all">{t('Todos')}</option>
            <option value="today">{t('Hoje')}</option>
            <option value="overdue">{t('Em atraso')}</option>
            {Object.entries(followupStatuses).map(([k, v]) => (
              <option key={k} value={k}>
                {t(v)}
              </option>
            ))}
          </select>
        </label>
        <label>
          {t('Ordenar')}
          <select value={sort} onChange={(e) => setSort(e.target.value)}>
            <option value="newest">{t('Mais recentes')}</option>
            <option value="name">{t('Nome')}</option>
            <option value="due">{t('Próximo contacto')}</option>
          </select>
        </label>
        <label>
          {t('Etiqueta')}
          <select value={tag} onChange={(e) => setTag(e.target.value)}>
            <option value="">{t('Todas')}</option>
            {Array.from(
              new Set(
                leads.flatMap((l) =>
                  (l.followup_tags || '')
                    .split(',')
                    .map((v) => v.trim())
                    .filter(Boolean),
                ),
              ),
            )
              .sort()
              .map((v) => (
                <option key={v}>{v}</option>
              ))}
          </select>
        </label>
      </div>
      <output>
        {shown.length} {t('contactos apresentados')}
      </output>
      <button onClick={exportShown}>{t('Exportar contactos CSV')}</button>
      <p>
        {t('O CSV contém os contactos apresentados, com os filtros activos.')}
      </p>
      <div className="company-lead-grid">
        {shown.map((lead) => (
          <article key={lead.id}>
            <span>
              {t(
                followupStatuses[
                  (lead.followup_status ||
                    'new') as keyof typeof followupStatuses
                ],
              )}
            </span>
            <h4>{lead.name}</h4>
            <p>{lead.interest}</p>
            <p>
              {t('Responsável')}:{' '}
              {memberNames[lead.followup_assignee || lead.account_id] || '—'} ·{' '}
              {campaignNames[lead.campaign_id] || t('Campanha')}
            </p>
            {lead.followup_tags && (
              <p className="company-tags">{lead.followup_tags}</p>
            )}
            {lead.followup_due && (
              <p>
                {t('Próximo contacto')}: {lead.followup_due}
              </p>
            )}
            <div className="company-actions">
              {lead.email && (
                <a href={'mailto:' + lead.email}>{t('Enviar email')}</a>
              )}
              {lead.phone && /^\+?[0-9 ()-]{7,40}$/.test(lead.phone) && (
                <a href={'tel:' + lead.phone.replace(/[^+0-9]/g, '')}>
                  {t('Ligar')}
                </a>
              )}
              {/^\+[1-9]\d{7,14}$/.test(lead.phone.replace(/[ ()-]/g, '')) && (
                <a
                  href={
                    'https://wa.me/' +
                    lead.phone.replace(/\D/g, '') +
                    '?text=' +
                    encodeURIComponent(
                      t(
                        'Olá {0}, seguimos o contacto feito com a nossa equipa.',
                        [lead.name],
                      ),
                    )
                  }
                  target="_blank"
                  rel="noreferrer"
                >
                  WhatsApp
                </a>
              )}
              <button
                onClick={() => {
                  if (
                    dirty &&
                    !window.confirm(t('Descartar alterações não guardadas?'))
                  )
                    return;
                  setHistory([]);
                  setHistoryError('');
                  setHistoryLoading(true);
                  setSelected(lead);
                  setDraft({
                    status: lead.followup_status || 'new',
                    note: lead.followup_note || '',
                    dueDate: lead.followup_due || '',
                    tags: lead.followup_tags || '',
                    assignee: lead.followup_assignee || '',
                  });
                  setError('');
                }}
              >
                {t('Actualizar seguimento')}
              </button>
            </div>
          </article>
        ))}
      </div>
      {!shown.length && <p>{t('Não existem contactos com estes filtros.')}</p>}
      <Dialog
        open={!!selected}
        onOpenChange={(open) => {
          if (!open) close();
        }}
      >
        {selected && (
          <DialogContent className="company-contact-drawer">
            <DialogTitle>{selected.name}</DialogTitle>
            <DialogDescription>
              {t('Detalhes do contacto e próximo passo')}
            </DialogDescription>
            <div className="company-actions">
              {selected.email && <a href={'mailto:' + selected.email}>Email</a>}
              {/^\+[1-9]\d{7,14}$/.test(
                selected.phone.replace(/[ ()-]/g, ''),
              ) && (
                <>
                  <a href={'tel:' + selected.phone}> {t('Ligar')}</a>
                  <a
                    href={'https://wa.me/' + selected.phone.replace(/\D/g, '')}
                    target="_blank"
                    rel="noreferrer"
                  >
                    WhatsApp
                  </a>
                </>
              )}
            </div>
            <p>{selected.interest}</p>
            <form
              className="company-followup-editor"
              id="company-followup-editor"
              tabIndex={-1}
              onSubmit={async (e) => {
                e.preventDefault();
                if (busy) return;
                setBusy(true);
                setError('');
                try {
                  const r = await fetch('/api/company-cards', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      action: 'followup',
                      organisation,
                      leadId: selected.id,
                      version: selected.followup_version ?? 0,
                      ...draft,
                    }),
                  });
                  const b = (await r.json()) as { error?: string };
                  if (!r.ok) throw Error(b.error);
                  await onSaved();
                  setSelected(null);
                } catch (err) {
                  setError(
                    err instanceof Error ? err.message : 'Tente novamente.',
                  );
                } finally {
                  setBusy(false);
                }
              }}
            >
              <h4>
                {t('Seguimento')}: {selected.name}
              </h4>
              {error && (
                <div role="alert">
                  <p>{t(error)}</p>
                  <button
                    type="button"
                    onClick={async () => {
                      await onSaved();
                      setSelected(null);
                    }}
                  >
                    {t('Fechar e actualizar')}
                  </button>
                </div>
              )}
              <fieldset disabled={busy}>
                <label>
                  {t('Estado do seguimento')}
                  <select
                    value={draft.status}
                    onChange={(e) =>
                      setDraft({ ...draft, status: e.target.value })
                    }
                  >
                    {Object.entries(followupStatuses).map(([k, v]) => (
                      <option value={k} key={k}>
                        {t(v)}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  {t('Próximo contacto')}
                  <input
                    type="date"
                    value={draft.dueDate}
                    onChange={(e) =>
                      setDraft({ ...draft, dueDate: e.target.value })
                    }
                  />
                </label>
                <label>
                  {t('Notas internas')}
                  <textarea
                    rows={4}
                    maxLength={1000}
                    value={draft.note}
                    onChange={(e) =>
                      setDraft({ ...draft, note: e.target.value })
                    }
                  />
                </label>
                <label>
                  {t('Etiquetas separadas por vírgulas')}
                  <input
                    maxLength={200}
                    value={draft.tags}
                    onChange={(e) =>
                      setDraft({ ...draft, tags: e.target.value })
                    }
                  />
                </label>
                <label>
                  {t('Responsável')}
                  <select
                    disabled={!leader}
                    value={draft.assignee}
                    onChange={(e) =>
                      setDraft({ ...draft, assignee: e.target.value })
                    }
                  >
                    <option value="">{t('Colaborador de origem')}</option>
                    {Object.entries(memberNames).map(([id, name]) => (
                      <option key={id} value={id}>
                        {name}
                      </option>
                    ))}
                  </select>
                </label>
                <small>
                  {t(
                    'As notas não aparecem no cartão público. São visíveis aos responsáveis autorizados da empresa e ao colaborador deste contacto.',
                  )}
                </small>
                <div className="company-actions">
                  <button>{t('Guardar seguimento')}</button>
                  <button type="button" onClick={close}>
                    {t('Cancelar')}
                  </button>
                </div>
              </fieldset>
            </form>
            <section className="company-contact-history">
              <h4>{t('Histórico de seguimento')}</h4>
              {historyError && <p role="alert">{t(historyError)}</p>}
              {historyLoading && <output>{t('A carregar…')}</output>}
              {!historyLoading && !history.length && !historyError && (
                <p>{t('Ainda não existem actualizações.')}</p>
              )}
              {history.map((h, i) => {
                const d = JSON.parse(h.details_json);
                return (
                  <article key={i}>
                    <strong>{h.name}</strong>
                    <time>{new Date(h.created_at).toLocaleString()}</time>
                    <p>
                      {t(
                        followupStatuses[
                          d.status as keyof typeof followupStatuses
                        ],
                      )}{' '}
                      {d.dueDate ? ' · ' + d.dueDate : ''}
                    </p>
                    <p>{d.note}</p>
                    {d.tags && <p>{d.tags}</p>}
                  </article>
                );
              })}
            </section>
          </DialogContent>
        )}
      </Dialog>
    </section>
  );
}
