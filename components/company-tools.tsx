'use client';
import { useEffect, useState } from 'react';
import Image from 'next/image';
import {
  Mail,
  Download,
  Copy,
  ExternalLink,
  Search,
  Users,
  Image as ImageIcon,
  CheckCircle2,
} from 'lucide-react';
import type { CompanyTemplate } from '@/lib/company-cards';
import {
  defaultToolSettings,
  signatureHTML,
  signatureText,
  type DirectoryCard,
  type ToolSettings,
} from '@/lib/company-tools';
import { profileColorHex } from '@/lib/profile-business';
import { useI18n } from './language-provider';
import { CompanyCRM } from './company-crm';

type Data = {
  role: string;
  actor: string;
  origin: string;
  template: CompanyTemplate;
  cards: DirectoryCard[];
  settings: ToolSettings;
  version: number;
};
export type CompanyToolView =
  | 'signatures'
  | 'backgrounds'
  | 'directory'
  | 'integrations';
function SignatureDownload({ html, label }: { html: string; label: string }) {
  const [downloadURL, setDownloadURL] = useState('');
  useEffect(() => {
    const url = URL.createObjectURL(
      new Blob(
        [
          '<!doctype html><html><meta charset="utf-8"><body>' +
            html +
            '</body></html>',
        ],
        { type: 'text/html' },
      ),
    );
    // Publish the external Blob URL after mount; cleanup releases it on replacement.
    // oxlint-disable-next-line react/react-compiler
    setDownloadURL(url);
    return () => URL.revokeObjectURL(url);
  }, [html]);
  return (
    <a
      href={downloadURL || undefined}
      aria-disabled={!downloadURL}
      className="tool-download"
      download="framy-signature.html"
    >
      <Download size={17} />
      {label}
    </a>
  );
}
function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new window.Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });
}
async function backgroundPNG(
  card: DirectoryCard,
  template: CompanyTemplate,
  settings: ToolSettings,
  label: string,
) {
  const canvas = document.createElement('canvas');
  canvas.width = 1920;
  canvas.height = 1080;
  const c = canvas.getContext('2d')!;
  const dark = settings.background === 'dark',
    ink = dark ? '#fff9f3' : '#252522';
  c.fillStyle = dark ? '#171918' : '#f3f0e7';
  c.fillRect(0, 0, 1920, 1080);
  c.fillStyle = profileColorHex(template.accent);
  c.fillRect(0, 0, 1920, 14);
  const mountain = await loadImage('/brand/profile-dots.svg');
  c.globalAlpha = dark ? 0.17 : 0.08;
  c.drawImage(mountain, 0, 630, 1920, 450);
  c.globalAlpha = 1;
  const left = settings.corner === 'left',
    x = left ? 80 : 1410;
  c.fillStyle = ink;
  c.textAlign = left ? 'left' : 'right';
  const tx = left ? 80 : 1840;
  const fit = (text: string, max: number, size: number) => {
    while (size > 16) {
      c.font = `600 ${size}px Arial`;
      if (c.measureText(text).width <= max) break;
      size--;
    }
    return size;
  };
  fit(template.company, 650, 44);
  c.fillText(template.company, tx, 110);
  fit(card.name, 650, 36);
  c.fillText(card.name, tx, 170);
  fit(card.title, 650, 26);
  c.fillText(card.title, tx, 215);
  if (template.logoUrl) {
    const logo = await loadImage(template.logoUrl);
    const width = Math.min(240, (logo.naturalWidth * 110) / logo.naturalHeight),
      height = (width * logo.naturalHeight) / logo.naturalWidth;
    c.drawImage(logo, left ? 80 : 1840 - width, 265, width, height);
  }
  const qr = await loadImage('/api/company-tools/qr/' + card.id);
  c.fillStyle = '#ffffff';
  c.fillRect(x, 680, 300, 300);
  c.drawImage(qr, x, 680, 300, 300);
  c.fillStyle = ink;
  c.textAlign = 'center';
  c.font = '500 22px Arial';
  c.fillText(label, x + 150, 1020);
  // Keep the downloadable image self-contained across browser sessions.
  return canvas.toDataURL('image/png');
}
export function CompanyTools({
  organisation,
  view,
}: {
  organisation: string;
  view: CompanyToolView;
}) {
  const { t } = useI18n(),
    [data, setData] = useState<Data | null>(null),
    [settings, setSettings] = useState<ToolSettings>(defaultToolSettings),
    [selected, setSelected] = useState(''),
    [query, setQuery] = useState(''),
    [team, setTeam] = useState(''),
    [error, setError] = useState(''),
    [notice, setNotice] = useState(''),
    [busy, setBusy] = useState(false),
    [previewData, setPreview] = useState({ url: '', stamp: '' }),
    [refresh, setRefresh] = useState(0);
  const previewStamp =
    selected +
    JSON.stringify(settings) +
    JSON.stringify(data?.template) +
    t('Ver cartão');
  const preview = previewData.stamp === previewStamp ? previewData.url : '';
  useEffect(() => {
    const abort = new AbortController();
    fetch('/api/company-tools?' + new URLSearchParams({ organisation }), {
      cache: 'no-store',
      signal: abort.signal,
    })
      .then(async (r) => {
        const b = (await r.json()) as Data & { error?: string };
        if (!r.ok) throw Error(b.error);
        return b as Data;
      })
      .then((b) => {
        setData(b);
        setSettings(b.settings);
        setSelected(
          b.cards.find((c) => c.account === b.actor)?.id ||
            (b.role === 'leader' ? b.cards[0]?.id : '') ||
            '',
        );
        setError('');
      })
      .catch((e) => {
        if (!abort.signal.aborted)
          setError(
            e instanceof Error ? e.message : 'Não foi possível carregar.',
          );
      });
    return () => abort.abort();
  }, [organisation, refresh]);
  useEffect(() => {
    if (view !== 'backgrounds' || !data) return;
    const card = data.cards.find((c) => c.id === selected);
    if (!card) return;
    let cancelled = false;
    backgroundPNG(card, data.template, settings, t('Ver cartão'))
      .then((url) => {
        if (!cancelled) setPreview({ url, stamp: previewStamp });
      })
      .catch(() => {
        if (!cancelled) setError('Não foi possível gerar a imagem.');
      });
    return () => {
      cancelled = true;
    };
  }, [data, selected, settings, view, t, previewStamp]);
  useEffect(() => {
    if (!data || JSON.stringify(settings) === JSON.stringify(data.settings))
      return;
    const guard = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener('beforeunload', guard);
    return () => window.removeEventListener('beforeunload', guard);
  }, [data, settings]);
  if (!data)
    return (
      <section className="company-tools">
        <p role={error ? 'alert' : 'status'}>{t(error || 'A carregar…')}</p>
        {error && (
          <button onClick={() => setRefresh((x) => x + 1)}>
            {t('Tentar novamente')}
          </button>
        )}
      </section>
    );
  const ownCards =
      data.role === 'leader'
        ? data.cards
        : data.cards.filter((c) => c.account === data.actor),
    card = ownCards.find((c) => c.id === selected),
    dirty = JSON.stringify(settings) !== JSON.stringify(data.settings);
  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Não foi possível guardar.');
    } finally {
      setBusy(false);
    }
  };
  const save = () =>
    run(async () => {
      const r = await fetch('/api/company-tools', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            organisation,
            settings,
            version: data.version,
          }),
        }),
        b = (await r.json()) as { error?: string; version: number };
      if (!r.ok) throw Error(b.error);
      setData({ ...data, settings, version: b.version });
      setNotice('Definições aplicadas à equipa.');
    });
  const html = card
    ? signatureHTML(card, data.template, settings, data.origin, t('Ver cartão'))
    : '';
  const cards = data.cards.filter(
    (c) =>
      (!team || c.team === team) &&
      [c.name, c.title, c.team]
        .join(' ')
        .toLocaleLowerCase()
        .includes(query.toLocaleLowerCase()),
  );
  return (
    <section
      className="company-tools"
      data-company-unsaved={dirty ? 'true' : undefined}
    >
      {error && (
        <p role="alert" className="tool-alert">
          {t(error)}
        </p>
      )}
      {notice && (
        <output className="tool-notice">
          <CheckCircle2 size={18} />
          {t(notice)}
        </output>
      )}
      {view === 'integrations' ? (
        <CompanyCRM organisation={organisation} role={data.role} />
      ) : view === 'directory' ? (
        <>
          <div className="tool-intro">
            <Users />
            <div>
              <h2>{t('As pessoas por trás da empresa')}</h2>
              <p>
                {t('Encontre colegas e os contactos que escolheram publicar.')}
              </p>
            </div>
          </div>
          <div className="tool-filters">
            <label>
              <Search size={18} />
              <span>{t('Pesquisar')}</span>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t('Nome, cargo ou equipa')}
              />
            </label>
            <label>
              {t('Equipa')}
              <select value={team} onChange={(e) => setTeam(e.target.value)}>
                <option value="">{t('Todas as equipas')}</option>
                {[...new Set(data.cards.map((c) => c.team).filter(Boolean))]
                  .sort()
                  .map((v) => (
                    <option key={v}>{v}</option>
                  ))}
              </select>
            </label>
          </div>
          <p>
            {cards.length} {t('cartões publicados')}
          </p>
          <div className="tool-directory">
            {cards.map((c) => (
              <article key={c.id}>
                {c.photo ? (
                  <Image
                    unoptimized
                    src={c.photo}
                    alt=""
                    width={64}
                    height={64}
                  />
                ) : (
                  <span className="tool-avatar" aria-hidden="true">
                    {c.name.slice(0, 1)}
                  </span>
                )}
                <h3>{c.name}</h3>
                <p>{c.title}</p>
                <small>{c.team || data.template.company}</small>
                <div className="tool-contact-links">
                  {c.email && (
                    <a href={'mailto:' + c.email}>
                      <Mail size={16} />
                      {c.email}
                    </a>
                  )}
                  {c.phone && (
                    <a href={'tel:' + c.phone.replace(/\s/g, '')}>{c.phone}</a>
                  )}
                </div>
                <a
                  className="tool-link"
                  href={'/equipa/' + c.id}
                  target="_blank"
                  rel="noreferrer"
                >
                  {t('Ver cartão')}
                  <ExternalLink size={16} />
                </a>
              </article>
            ))}
          </div>
          {!cards.length && (
            <div className="tool-empty">
              <h3>{t('Ainda não há cartões publicados')}</h3>
              <p>
                {t(
                  'Ajuste a pesquisa ou peça à equipa para publicar os cartões.',
                )}
              </p>
              <a
                href={
                  '/corporativo/cartoes?' +
                  new URLSearchParams({ organisation })
                }
              >
                {t('Cartões da empresa')}
              </a>
            </div>
          )}
        </>
      ) : (
        <>
          <div className="tool-intro">
            {view === 'signatures' ? <Mail /> : <ImageIcon />}
            <div>
              <h2>
                {t(
                  view === 'signatures'
                    ? 'Cada email, uma apresentação'
                    : 'A sua marca em cada reunião',
                )}
              </h2>
              <p>
                {t(
                  'Gerado a partir do cartão publicado. Os contactos privados ficam de fora.',
                )}
              </p>
            </div>
          </div>
          {!data.origin ? (
            <p role="alert">
              {t(
                'Configure o endereço público antes de partilhar estes materiais.',
              )}
            </p>
          ) : !ownCards.length ? (
            <div className="tool-empty">
              <h3>{t('Publique primeiro o seu cartão')}</h3>
              <a
                href={
                  '/corporativo/cartoes?' +
                  new URLSearchParams({ organisation })
                }
              >
                {t('Cartões da empresa')}
              </a>
            </div>
          ) : (
            <div className="tool-studio">
              <div className="tool-controls">
                <label>
                  {t('Cartão publicado')}
                  <select
                    value={selected}
                    onChange={(e) => setSelected(e.target.value)}
                  >
                    {ownCards.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </label>
                {view === 'signatures' ? (
                  <label>
                    {t('Formato da assinatura')}
                    <select
                      disabled={data.role !== 'leader'}
                      value={settings.signature}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          signature: e.target
                            .value as ToolSettings['signature'],
                        })
                      }
                    >
                      <option value="compact">{t('Essencial')}</option>
                      <option value="qr">{t('Com código QR')}</option>
                    </select>
                  </label>
                ) : (
                  <>
                    <label>
                      {t('Fundo')}
                      <select
                        disabled={data.role !== 'leader'}
                        value={settings.background}
                        onChange={(e) =>
                          setSettings({
                            ...settings,
                            background: e.target
                              .value as ToolSettings['background'],
                          })
                        }
                      >
                        <option value="warm">{t('Claro')}</option>
                        <option value="dark">{t('Escuro')}</option>
                      </select>
                    </label>
                    <label>
                      {t('Posição da identidade')}
                      <select
                        disabled={data.role !== 'leader'}
                        value={settings.corner}
                        onChange={(e) =>
                          setSettings({
                            ...settings,
                            corner: e.target.value as ToolSettings['corner'],
                          })
                        }
                      >
                        <option value="left">{t('Esquerda')}</option>
                        <option value="right">{t('Direita')}</option>
                      </select>
                    </label>
                  </>
                )}
                {data.role === 'leader' && (
                  <>
                    <small>
                      {t('Estas definições são partilhadas por toda a equipa.')}
                    </small>
                    <button
                      disabled={busy || !dirty}
                      onClick={() => void save()}
                    >
                      {t('Aplicar à equipa')}
                    </button>
                  </>
                )}
                <div className="tool-actions">
                  {view === 'signatures' ? (
                    <>
                      <button
                        disabled={busy || !card}
                        onClick={() =>
                          void run(async () => {
                            await navigator.clipboard.write([
                              new ClipboardItem({
                                'text/html': new Blob([html], {
                                  type: 'text/html',
                                }),
                                'text/plain': new Blob(
                                  [signatureText(card!, data.template.company)],
                                  { type: 'text/plain' },
                                ),
                              }),
                            ]);
                            setNotice(
                              'Assinatura copiada. Cole nas definições do seu email.',
                            );
                          })
                        }
                      >
                        <Copy size={17} />
                        {t('Copiar assinatura')}
                      </button>
                      <SignatureDownload
                        html={html}
                        label={t('Descarregar HTML')}
                      />
                    </>
                  ) : preview ? (
                    <a
                      className="tool-download"
                      href={preview}
                      download={`framy-background-${selected}.png`}
                    >
                      <Download size={17} />
                      {t('Descarregar PNG')}
                    </a>
                  ) : (
                    <button disabled>
                      <Download size={17} />
                      {t('Descarregar PNG')}
                    </button>
                  )}
                </div>
              </div>
              <div className="tool-preview">
                {view === 'signatures' ? (
                  <>
                    <p className="tool-preview-label">
                      {t('Pré-visualização')}
                    </p>
                    <iframe
                      title={t('Pré-visualização da assinatura')}
                      sandbox="allow-same-origin"
                      srcDoc={
                        '<!doctype html><html><meta charset="utf-8"><body style="margin:24px">' +
                        html.replaceAll(
                          'src="' + data.origin,
                          'src="' +
                            (typeof window !== 'undefined'
                              ? window.location.origin
                              : data.origin),
                        ) +
                        '</body></html>'
                      }
                    />
                  </>
                ) : preview ? (
                  <Image
                    unoptimized
                    width={1920}
                    height={1080}
                    className="tool-background-preview"
                    src={preview}
                    alt={t('Pré-visualização do fundo')}
                  />
                ) : (
                  <output>{t('A gerar…')}</output>
                )}
              </div>
            </div>
          )}
          <div className="tool-help">
            <h3>{t('Como utilizar')}</h3>
            {view === 'signatures' ? (
              <ol>
                <li>
                  {t(
                    'Copie a assinatura ou abra o ficheiro HTML e copie o conteúdo.',
                  )}
                </li>
                <li>
                  {t(
                    'Gmail: Definições → Ver todas as definições → Geral → Assinatura.',
                  )}
                </li>
                <li>
                  {t(
                    'Outlook: Definições → Contas → Assinaturas. Cole e guarde.',
                  )}
                </li>
              </ol>
            ) : (
              <ol>
                <li>{t('Descarregue a imagem PNG em 1920 × 1080.')}</li>
                <li>
                  {t(
                    'No Zoom, Teams ou Google Meet, abra os efeitos de fundo e carregue a imagem.',
                  )}
                </li>
                <li>
                  {t('Teste a posição da câmara e do QR antes da reunião.')}
                </li>
              </ol>
            )}
            <p>
              {t(
                'Após alterar o cartão ou a marca, gere e instale novamente. As aplicações de email podem bloquear imagens externas.',
              )}
            </p>
          </div>
        </>
      )}
    </section>
  );
}
