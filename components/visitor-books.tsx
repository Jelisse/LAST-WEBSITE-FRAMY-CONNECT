'use client';
import { useCallback, useEffect, useState } from 'react';
import { useI18n } from './language-provider';
import { SourceImage } from './source-image';
import type { VisitorBook } from '@/lib/visitor-book';
import Link from './hard-link';
const formText = (f: FormData, key: string) => {
  const v = f.get(key);
  return typeof v === 'string' ? v : '';
};
type Entry = {
  id: string;
  name: string;
  phone: string;
  email: string;
  company: string;
  position: string;
  purpose: string;
  department: string;
  created_at: number;
};
type Data = {
  books: VisitorBook[];
  leader: boolean;
  members: { account_id: string; name: string }[];
  access?: { account_id: string }[];
  entries?: Entry[];
  more?: boolean;
};
export function VisitorBooks({ organisation }: { organisation: string }) {
  const { t, locale } = useI18n();
  const [data, setData] = useState<Data | null>(null),
    [book, setBook] = useState(''),
    [creating, setCreating] = useState(false),
    [error, setError] = useState(''),
    [notice, setNotice] = useState(''),
    [busy, setBusy] = useState(false),
    [search, setSearch] = useState(''),
    [from, setFrom] = useState(''),
    [to, setTo] = useState(''),
    [offset, setOffset] = useState(0),
    [revision, setRevision] = useState(0);
  const query = new URLSearchParams({
    organisation,
    ...(book ? { book } : {}),
    search,
    from,
    to,
    offset: String(offset),
  }).toString();
  const load = useCallback(
    async (signal: AbortSignal) => {
      try {
        const r = await fetch('/api/visitor-books?' + query, {
          cache: 'no-store',
          signal,
        });
        const b = (await r.json()) as Data & { error?: string };
        if (!r.ok) throw Error(b.error);
        if (signal.aborted) return;
        setData(b);
        if (!book && !creating && b.books.length) setBook(b.books[0].id);
        setError('');
      } catch (e) {
        if (!signal.aborted)
          setError(e instanceof Error ? e.message : 'Erro ao carregar.');
      }
    },
    [query, book, creating],
  );
  useEffect(() => {
    const c = new AbortController();
    queueMicrotask(() => {
      if (!c.signal.aborted) void load(c.signal);
    });
    return () => c.abort();
  }, [load, revision]);
  const selected = data?.books.find((b) => b.id === book);
  async function action(body: Record<string, unknown>) {
    if (busy) return;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const r = await fetch('/api/visitor-books', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organisation,
          book,
          version: selected?.version,
          ...body,
        }),
      });
      const b = (await r.json()) as { error?: string; book: string };
      if (!r.ok) throw Error(b.error);
      setCreating(false);
      setBook(b.book);
      setRevision((x) => x + 1);
      setNotice('Guardado.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Não foi possível guardar.');
    } finally {
      setBusy(false);
    }
  }
  const url = selected
    ? new URL(
        '/visita/' + selected.public_id,
        typeof window === 'undefined'
          ? 'https://framyconnect.co.mz'
          : window.location.origin,
      ).href
    : '';
  return (
    <section className="visitor-tools">
      <div className="visitor-intro">
        <p>
          {t(
            'Receba visitantes com um QR ou suporte NFC. Os registos são privados e não entram nas campanhas de marketing.',
          )}
        </p>
      </div>
      {error && <p role="alert">{t(error)}</p>}
      {notice && <output>{t(notice)}</output>}
      {!data && !error && <output>{t('A carregar…')}</output>}
      <div className="visitor-toolbar">
        <label>
          {t('Recepção')}
          <select
            value={book}
            onChange={(e) => {
              setData((d) => (d ? { ...d, entries: [], access: [] } : d));
              setBook(e.target.value);
              setOffset(0);
              setSearch('');
            }}
          >
            <option value="">{t('Escolher livro')}</option>
            {data?.books.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
                {b.active ? '' : ' · ' + t('Fechado')}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => setRevision((x) => x + 1)}
        >
          {t('Actualizar')}
        </button>
        {data?.leader && (
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => {
              setCreating(true);
              setBook('');
              setNotice('');
            }}
          >
            {t('Novo livro')}
          </button>
        )}
      </div>
      {data && !book && !data.leader && (
        <p>{t('Peça ao responsável acesso ao livro da recepção.')}</p>
      )}
      {data?.leader && (
        <details
          open={!book}
          className="visitor-settings"
          key={book + ':' + selected?.version}
        >
          <summary>
            {t(book ? 'Configuração e permissões' : 'Criar livro de visitas')}
          </summary>
          <form
            key={book + ':form:' + selected?.version}
            onSubmit={(e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              void action({
                action: book ? 'save' : 'create',
                name: f.get('name'),
                welcome: f.get('welcome'),
                active: f.get('active') === 'on',
                showLogo: f.get('showLogo') === 'on',
                retentionDays: Number(f.get('retention')),
                purposes: formText(f, 'purposes')
                  .split('\n')
                  .map((x) => x.trim())
                  .filter(Boolean),
                departments: formText(f, 'departments')
                  .split('\n')
                  .map((x) => x.trim())
                  .filter(Boolean),
              });
            }}
          >
            <div className="visitor-fields">
              <label>
                {t('Nome da recepção')}
                <input
                  name="name"
                  required
                  maxLength={80}
                  defaultValue={selected?.name || ''}
                />
              </label>
              <label>
                {t('Conservação dos registos')}
                <select
                  name="retention"
                  defaultValue={selected?.retention_days || 90}
                >
                  {[30, 60, 90].map((n) => (
                    <option key={n} value={n}>
                      {t('{0} dias', [n])}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <label>
              {t('Mensagem de boas-vindas (opcional)')}
              <textarea
                name="welcome"
                maxLength={240}
                defaultValue={selected?.welcome || ''}
              />
            </label>
            <div className="visitor-fields">
              <label>
                {t('Motivos da visita (um por linha, até 12)')}
                <textarea
                  name="purposes"
                  defaultValue={
                    selected
                      ? JSON.parse(selected.purposes_json).join('\n')
                      : ''
                  }
                />
              </label>
              <label>
                {t('Departamentos públicos (um por linha, até 12)')}
                <textarea
                  name="departments"
                  defaultValue={
                    selected
                      ? JSON.parse(selected.departments_json).join('\n')
                      : ''
                  }
                />
              </label>
            </div>
            <label className="visitor-check">
              <input
                type="checkbox"
                name="active"
                defaultChecked={selected ? !!selected.active : true}
              />
              {t('Aceitar novos registos')}
            </label>
            <label className="visitor-check">
              <input
                type="checkbox"
                name="showLogo"
                defaultChecked={!!selected?.show_logo}
              />
              {t('Mostrar o logótipo guardado nos cartões da empresa')}
            </label>
            <p>
              {t(
                'Reduzir a conservação encurta o prazo dos registos existentes. Aumentar o prazo não recupera dados expirados.',
              )}
            </p>
            <button className="btn btn-primary" disabled={busy}>
              {t('Guardar')}
            </button>
          </form>
          {selected && (
            <>
              <h3>{t('Acesso da recepção')}</h3>
              <p>
                {t(
                  'Os responsáveis gerem e exportam. Os membros seleccionados apenas consultam este livro.',
                )}
              </p>
              {data.members.map((m) => (
                <label key={m.account_id} className="visitor-check">
                  <input
                    type="checkbox"
                    disabled={busy}
                    checked={
                      !!data.access?.some((a) => a.account_id === m.account_id)
                    }
                    onChange={(e) =>
                      void action({
                        action: 'access',
                        account: m.account_id,
                        enabled: e.target.checked,
                      })
                    }
                  />
                  {m.name}
                </label>
              ))}
              <details>
                <summary>{t('Substituir ligação pública')}</summary>
                <p>
                  {t(
                    'O QR e o NFC antigos deixarão de funcionar. Actualize os suportes da recepção.',
                  )}
                </p>
                <button
                  className="btn btn-secondary"
                  disabled={busy}
                  onClick={() => void action({ action: 'rotate' })}
                >
                  {t('Gerar nova ligação')}
                </button>
              </details>
            </>
          )}
        </details>
      )}
      {selected && (
        <>
          <div className="visitor-sharing">
            <div>
              <h3>{t('Bem-vindo. Registe a sua visita.')}</h3>
              <p>{t('Aproxime o telemóvel ou leia o código QR.')}</p>
              <p>
                {t(
                  'O suporte NFC e o QR devem abrir esta mesma ligação. O produto físico é adquirido separadamente.',
                )}
              </p>
              <Link
                className="text-link"
                href="/contacto?assunto=suporte-recepcao"
              >
                {t('Pedir suporte NFC para a recepção')}
              </Link>
              <input aria-label={t('Ligação pública')} readOnly value={url} />
              <div className="visitor-toolbar">
                <button
                  className="btn btn-secondary"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(url);
                      setNotice('Ligação copiada.');
                    } catch {
                      setError('Copie a ligação apresentada.');
                    }
                  }}
                >
                  {t('Copiar ligação')}
                </button>
                <Link
                  className="btn btn-secondary"
                  href={'/visita/' + selected.public_id}
                  target="_blank"
                  rel="noopener"
                >
                  {t('Ver formulário')}
                </Link>
                <a
                  className="btn btn-secondary"
                  href={'/api/visitor-books/qr?book=' + selected.id}
                  download="framy-recepcao.png"
                >
                  {t('Descarregar QR')}
                </a>
              </div>
            </div>
            <SourceImage
              src={
                '/api/visitor-books/qr?book=' +
                selected.id +
                '&v=' +
                selected.version
              }
              alt={t('QR do livro de visitas')}
              width={220}
              height={220}
            />
          </div>
          <h3>{t('Visitas registadas')}</h3>
          <form
            className="visitor-toolbar"
            onSubmit={(e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              setSearch(formText(f, 'search'));
              setFrom(formText(f, 'from'));
              setTo(formText(f, 'to'));
              setOffset(0);
              setRevision((x) => x + 1);
            }}
          >
            <label>
              {t('Nome ou empresa')}
              <input name="search" maxLength={100} defaultValue={search} />
            </label>
            <label>
              {t('De')}
              <input name="from" type="date" defaultValue={from} />
            </label>
            <label>
              {t('Até')}
              <input name="to" type="date" defaultValue={to} />
            </label>
            <button className="btn btn-secondary">{t('Filtrar')}</button>
            {data?.leader && (
              <a
                className="btn btn-secondary"
                href={'/api/visitor-books?' + query + '&export=csv'}
              >
                {t('Exportar CSV')}
              </a>
            )}
          </form>
          <p>
            {t(
              'Datas no fuso de Maputo. Exportação limitada a 1000 visitas por intervalo.',
            )}
          </p>
          {data?.entries?.length === 0 ? (
            <p>{t('Ainda não há visitas neste intervalo.')}</p>
          ) : (
            <div className="visitor-records">
              {data?.entries?.map((v) => (
                <article key={v.id}>
                  <div>
                    <strong>{v.name}</strong>
                    <time>
                      {new Intl.DateTimeFormat(locale, {
                        dateStyle: 'medium',
                        timeStyle: 'short',
                        timeZone: 'Africa/Maputo',
                      }).format(v.created_at)}
                    </time>
                  </div>
                  <p>
                    {v.phone}
                    {v.email ? ' · ' + v.email : ''}
                  </p>
                  {v.company && (
                    <p>
                      {v.company}
                      {v.position ? ' · ' + t(v.position) : ''}
                    </p>
                  )}
                  {(v.purpose || v.department) && (
                    <p>
                      {[v.purpose, v.department].filter(Boolean).join(' · ')}
                    </p>
                  )}
                </article>
              ))}
            </div>
          )}
          <div className="visitor-toolbar">
            <button
              disabled={offset === 0}
              className="btn btn-secondary"
              onClick={() => setOffset((x) => Math.max(0, x - 50))}
            >
              {t('Anterior')}
            </button>
            <button
              disabled={!data?.more}
              className="btn btn-secondary"
              onClick={() => setOffset((x) => x + 50)}
            >
              {t('Seguinte')}
            </button>
          </div>
        </>
      )}
    </section>
  );
}
