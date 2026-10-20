'use client';
import { useRef, useState } from 'react';
import { Plus, Send, Mail, ShieldCheck, Trash2 } from 'lucide-react';
import {
  prepareCorporateInvites,
  processCorporateBatch,
} from '@/lib/corporate';
import { useI18n } from './language-provider';
type Mode = 'invite' | 'authorization';
export function CorporateEmailInvites({
  organisation,
  mode,
  onModeChange,
  teams,
  emailReady,
  busy,
  setBusy,
  reload,
  owner,
}: {
  organisation: string;
  mode: Mode;
  onModeChange: (mode: Mode) => void;
  teams: string[];
  owner: boolean;
  emailReady: boolean;
  busy: boolean;
  setBusy: (busy: boolean) => void;
  reload: () => Promise<void>;
}) {
  const { t } = useI18n(),
    next = useRef(1),
    inFlight = useRef(false);
  const [rows, setRows] = useState([{ id: 0, email: '', name: '' }]);
  const [team, setTeam] = useState(''),
    [newTeam, setNewTeam] = useState(''),
    [creatingTeam, setCreatingTeam] = useState(false);
  const [role, setRole] = useState('member'),
    [entry, setEntry] = useState<'emails' | 'bulk'>('emails');
  const [batch, setBatch] = useState(''),
    [names, setNames] = useState(false),
    [error, setError] = useState('');
  const [result, setResult] = useState<{
    completed: number;
    uncertain: number;
    mode: Mode;
  } | null>(null);
  const [progress, setProgress] = useState(0);
  async function send() {
    if (busy || inFlight.current || !emailReady) return;
    setError('');
    setResult(null);
    setProgress(0);
    try {
      const list = prepareCorporateInvites({
        entry,
        rows,
        batch,
        team: creatingTeam ? newTeam : team,
        requireTeam: creatingTeam,
      });
      inFlight.current = true;
      setBusy(true);
      const sent = await processCorporateBatch(
        list,
        async (row) => {
          const r = await fetch('/api/corporate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'invite',
              organisation,
              ...row,
              mode,
              role: owner ? role : 'member',
            }),
            signal: AbortSignal.timeout(20000),
          });
          const b = (await r.json()) as { error?: string; delivery?: string };
          if (!r.ok || !['accepted', 'uncertain'].includes(b.delivery || ''))
            throw Error(b.error || 'Não foi possível enviar.');
          return b.delivery === 'accepted' ? 'accepted' : 'uncertain';
        },
        (completed) => setProgress(completed),
      );
      if (entry === 'bulk')
        setBatch(
          sent.remaining
            .map((row) => [row.name, row.email, row.team].join(';'))
            .join('\n'),
        );
      else
        setRows(
          sent.remaining.length
            ? sent.remaining.map((row) => ({
                id: next.current++,
                email: row.email,
                name: row.name,
              }))
            : [{ id: next.current++, email: '', name: '' }],
        );
      setResult({ completed: sent.completed, uncertain: sent.uncertain, mode });
      if (sent.error) setError(sent.error);
      try {
        await reload();
      } catch {
        setError(
          'O envio foi processado, mas a lista não foi actualizada. Actualize os dados antes de reenviar.',
        );
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Não foi possível enviar.');
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }
  return (
    <section
      className="corporate-panel corporate-email-invites corporate-onboarding"
      id="add-employees"
    >
      <div className="corporate-section-heading">
        <div>
          <h2>{t('Adicionar trabalhadores')}</h2>
          <p>
            {t(
              'Escolha como a equipa recebe acesso. A mensagem inclui automaticamente a empresa e o líder.',
            )}
          </p>
        </div>
      </div>
      <fieldset className="corporate-entry-modes" disabled={busy}>
        <legend>{t('Método de entrada')}</legend>
        {(['invite', 'authorization'] as const).map((value) => (
          <label key={value} className={mode === value ? 'is-selected' : ''}>
            <input
              type="radio"
              name="employee-entry-mode"
              checked={mode === value}
              onChange={() => onModeChange(value)}
            />
            {value === 'invite' ? (
              <Mail size={24} aria-hidden="true" />
            ) : (
              <ShieldCheck size={24} aria-hidden="true" />
            )}
            <span>
              <strong>
                {t(
                  value === 'invite'
                    ? 'O trabalhador cria a conta'
                    : 'O líder cria o acesso',
                )}
              </strong>
              <small>
                {t(
                  value === 'invite'
                    ? 'Envia um convite para aceitar e definir o próprio acesso.'
                    : 'Pede autorização por email. Só após consentimento pode criar o acesso.',
                )}
              </small>
            </span>
          </label>
        ))}
      </fieldset>
      {mode === 'authorization' && (
        <p className="corporate-inline-help">
          {t(
            'Para trabalhadores com conta existente, escolha Convite. A autorização não permite alterar uma conta existente.',
          )}
        </p>
      )}
      {error && <p role="alert">{t(error)}</p>}
      {result && result.completed > 0 && (
        <output aria-live="polite" className="corporate-send-result">
          <strong>
            {t('Pedidos aceites pelo serviço de email: {0}.', [
              result.completed - result.uncertain,
            ])}
          </strong>
          <span>
            {t(
              result.mode === 'authorization'
                ? 'A aguardar o consentimento dos trabalhadores por email.'
                : 'A aguardar aceitação do convite e confirmação de acesso.',
            )}
          </span>
          {!!result.uncertain && (
            <span>
              {t(
                'Envio por confirmar: {0}. Consulte os pedidos pendentes antes de reenviar.',
                [result.uncertain],
              )}
            </span>
          )}
          <small>
            {t(
              'A aceitação pelo serviço de email não confirma a entrega na caixa de correio.',
            )}
          </small>
        </output>
      )}
      {!emailReady && (
        <p role="alert">
          {t('O envio de convites por email não está configurado.')}
        </p>
      )}
      <div
        className="corporate-entry-tabs"
        aria-label={t('Introdução de trabalhadores')}
      >
        <button
          type="button"
          disabled={busy}
          aria-pressed={entry === 'emails'}
          onClick={() => setEntry('emails')}
        >
          {t('Introduzir emails')}
        </button>
        <button
          type="button"
          disabled={busy}
          aria-pressed={entry === 'bulk'}
          onClick={() => setEntry('bulk')}
        >
          {t('Colar lista de trabalhadores')}
        </button>
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void send();
        }}
      >
        {entry === 'emails' ? (
          <div className="corporate-email-fields">
            <label className="corporate-name-toggle">
              <input
                type="checkbox"
                checked={names}
                disabled={busy}
                onChange={(e) => setNames(e.target.checked)}
              />
              {t('Incluir nomes (opcional)')}
            </label>
            {rows.map((row, index) => (
              <div className="corporate-email-row" key={row.id}>
                {names && (
                  <label className="corporate-name-field">
                    {t('Nome')}
                    <input
                      value={row.name}
                      maxLength={100}
                      disabled={busy}
                      onChange={(e) =>
                        setRows(
                          rows.map((r) =>
                            r.id === row.id
                              ? { ...r, name: e.target.value }
                              : r,
                          ),
                        )
                      }
                    />
                  </label>
                )}
                <label className="corporate-email-field">
                  {t('Email do trabalhador {0}', [index + 1])}
                  <input
                    type="email"
                    autoComplete="off"
                    required
                    maxLength={254}
                    disabled={busy}
                    value={row.email}
                    placeholder="nome@empresa.com"
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
                    className="corporate-remove-email"
                    type="button"
                    disabled={busy}
                    aria-label={t('Remover email {0}', [index + 1])}
                    onClick={() => setRows(rows.filter((r) => r.id !== row.id))}
                  >
                    <Trash2 size={18} aria-hidden="true" />
                  </button>
                )}
              </div>
            ))}
            <button
              className="corporate-add-email"
              type="button"
              disabled={busy || rows.length >= 25}
              onClick={() =>
                setRows([...rows, { id: next.current++, email: '', name: '' }])
              }
            >
              <Plus size={18} aria-hidden="true" />
              {t('Adicionar outro email')}
            </button>
          </div>
        ) : (
          <label className="corporate-bulk-field">
            {t('Trabalhadores')}
            <textarea
              value={batch}
              disabled={busy}
              onChange={(e) => setBatch(e.target.value)}
              maxLength={12000}
              rows={6}
              required
              placeholder="Ana;ana@empresa.com;Vendas"
            />
            <small>
              {t(
                'Um trabalhador por linha: Nome;email;equipa, sem cabeçalho. Até 25 por envio. Se houver uma falha, as linhas restantes ficam guardadas neste formulário.',
              )}
            </small>
          </label>
        )}
        <div className="corporate-invite-settings">
          <label>
            {t('Equipa')}
            <select
              disabled={busy}
              value={creatingTeam ? '__new__' : team}
              onChange={(e) => {
                setCreatingTeam(e.target.value === '__new__');
                if (e.target.value !== '__new__') setTeam(e.target.value);
              }}
            >
              <option value="">{t('Sem equipa')}</option>
              {[...new Set([...teams, ...(team ? [team] : [])])]
                .filter(Boolean)
                .map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              <option value="__new__">{t('+ Criar uma equipa')}</option>
            </select>
          </label>
          {creatingTeam && (
            <label>
              {t('Nome da nova equipa')}
              <input
                required
                maxLength={80}
                disabled={busy}
                value={newTeam}
                onChange={(e) => setNewTeam(e.target.value)}
              />
            </label>
          )}
          {owner && (
            <label>
              {t('Função')}
              <select
                disabled={busy}
                value={role}
                onChange={(e) => setRole(e.target.value)}
              >
                <option value="member">{t('Trabalhador')}</option>
                <option value="leader">{t('Líder')}</option>
              </select>
            </label>
          )}
        </div>
        <p className="corporate-inline-help">
          {t(
            entry === 'bulk'
              ? 'A equipa seleccionada aplica-se às linhas sem equipa.'
              : 'A equipa e a função seleccionadas aplicam-se a todos os emails acima.',
          )}
        </p>
        <div className="corporate-send-footer">
          <small>
            {t(
              'Até 25 trabalhadores por envio. Os acessos dependem de confirmação por email.',
            )}
          </small>
          <button
            className="corporate-send-button"
            disabled={busy || !emailReady}
          >
            <Send size={18} aria-hidden="true" />
            {t(
              busy
                ? 'A enviar…'
                : mode === 'authorization'
                  ? 'Enviar autorizações'
                  : 'Enviar convites',
            )}
          </button>
        </div>
        {busy && (
          <output aria-live="polite">
            {t('Pedidos processados: {0}.', [progress])}
          </output>
        )}
      </form>
    </section>
  );
}
