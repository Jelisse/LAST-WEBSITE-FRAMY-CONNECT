'use client';
import { useRef, useState } from 'react';
import { Plus } from 'lucide-react';
import { corporateEmail, processCorporateBatch } from '@/lib/corporate';
import { useI18n } from './language-provider';
export function CorporateEmailInvites({
  organisation,
  mode,
  emailReady,
  busy,
  setBusy,
  reload,
}: {
  organisation: string;
  mode: 'invite' | 'authorization';
  emailReady: boolean;
  busy: boolean;
  setBusy: (busy: boolean) => void;
  reload: () => Promise<void>;
}) {
  const { t } = useI18n(),
    next = useRef(1);
  const [rows, setRows] = useState([{ id: 0, email: '' }]),
    [team, setTeam] = useState(''),
    [error, setError] = useState(''),
    [notice, setNotice] = useState('');
  async function send() {
    if (busy) return;
    setError('');
    setNotice('');
    try {
      const emails = rows.map((row) => corporateEmail(row.email));
      if (new Set(emails).size !== emails.length)
        throw Error('Existem emails repetidos no lote.');
      setBusy(true);
      const result = await processCorporateBatch(
        emails.map((email) => ({ email, name: '', team })),
        async (row) => {
          const r = await fetch('/api/corporate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'invite',
              organisation,
              email: row.email,
              team: row.team,
              mode,
              role: 'member',
            }),
            signal: AbortSignal.timeout(20000),
          });
          const b = (await r.json()) as { error?: string; delivery?: string };
          if (!r.ok || !['accepted', 'uncertain'].includes(b.delivery || ''))
            throw Error(b.error || 'Não foi possível enviar.');
          return b.delivery === 'accepted' ? 'accepted' : 'uncertain';
        },
      );
      setRows(
        result.remaining.length
          ? result.remaining.map((row) => ({
              id: next.current++,
              email: row.email,
            }))
          : [{ id: next.current++, email: '' }],
      );
      setNotice(
        t('Convites processados: {0}. Envios por confirmar: {1}.', [
          result.completed,
          result.uncertain,
        ]),
      );
      if (result.error) setError(result.error);
      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Não foi possível enviar.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="corporate-panel corporate-email-invites">
      <h2>{t('Adicionar trabalhadores por email')}</h2>
      <p>
        {t(
          'Escreva os emails e use + para adicionar mais. A mensagem com a empresa e o líder é preparada automaticamente; não precisa escrever um email.',
        )}
      </p>
      {error && <p role="alert">{t(error)}</p>}
      {notice && <output aria-live="polite">{notice}</output>}
      {!emailReady && (
        <p>{t('O envio de convites por email não está configurado.')}</p>
      )}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void send();
        }}
      >
        {rows.map((row, index) => (
          <div className="corporate-email-row" key={row.id}>
            <label>
              {t('Email do trabalhador {0}', [index + 1])}
              <input
                type="email"
                autoComplete="off"
                required
                maxLength={254}
                disabled={busy}
                value={row.email}
                onChange={(e) =>
                  setRows(
                    rows.map((r) =>
                      r.id === row.id ? { ...r, email: e.target.value } : r,
                    ),
                  )
                }
              />
            </label>
            {rows.length > 1 && (
              <button
                type="button"
                disabled={busy}
                aria-label={t('Remover email {0}', [index + 1])}
                onClick={() => setRows(rows.filter((r) => r.id !== row.id))}
              >
                {t('Remover')}
              </button>
            )}
          </div>
        ))}
        <button
          type="button"
          disabled={busy || rows.length >= 25}
          onClick={() => setRows([...rows, { id: next.current++, email: '' }])}
        >
          <Plus size={18} aria-hidden="true" />
          {t('Adicionar outro email')}
        </button>
        <label>
          {t('Equipa')}
          <input
            maxLength={80}
            disabled={busy}
            value={team}
            onChange={(e) => setTeam(e.target.value)}
          />
        </label>
        <button disabled={busy || !emailReady}>
          {t(
            busy
              ? 'A enviar…'
              : mode === 'authorization'
                ? 'Enviar autorizações'
                : 'Enviar convites',
          )}
        </button>
      </form>
    </section>
  );
}
