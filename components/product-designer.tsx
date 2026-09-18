'use client';
import { useI18n } from '@/components/language-provider';

import { SourceImage } from '@/components/source-image';
import { useEffect, useState, useEffectEvent } from 'react';
import QRCode from 'qrcode';
import {
  cardThemes,
  cardArtwork,
  cardArtworkUrl,
  cardPalette,
  cardIsPortrait,
  cardCopyFields,
} from '@/lib/card-art';
import { clearLogoBackground } from '@/lib/logo-background';
import { artworkFile } from '@/lib/artwork-storage';
import {
  blankOption,
  resetProductDesign,
  keychainChoices,
  type Artwork,
  type ProductDesign,
  type StockOption,
} from '@/lib/customisation';
import type { Profile } from '@/lib/domain';

export function InventoryPhoto({
  index,
  back = false,
}: {
  index: number;
  back?: boolean;
}) {
  const { t } = useI18n();
  return (
    <svg
      className="inventory-photo"
      viewBox={`180 ${[230, 670, 1090][index]} 970 440`}

      aria-label={
        back
          ? t('Verso com logótipo Framy Connect')
          : t('Fotografia do porta-chaves em stock')
      }
    >
      <image
        href={`/products/keychain/${back ? 'backs' : 'fronts'}.jpeg`}
        width="1280"
        height="1706"
      />
    </svg>
  );
}
async function renderFile(blob: Blob, page: number) {
  if (blob.type === 'application/pdf') {
    const pdfjs = await import('pdfjs-dist');
    pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
    const task = pdfjs.getDocument({
      data: new Uint8Array(await blob.arrayBuffer()),
      isEvalSupported: false,
    });
    try {
      const pdf = await task.promise;
      if (page > pdf.numPages)
        throw Error(`Este PDF tem ${pdf.numPages} páginas.`);
      const p = await pdf.getPage(page);
      const base = p.getViewport({ scale: 1 });
      const viewport = p.getViewport({
        scale: 1200 / Math.max(base.width, base.height),
      });
      const canvas = document.createElement('canvas');
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      await p.render({
        canvas,
        canvasContext: canvas.getContext('2d')!,
        viewport,
      }).promise;
      return canvas.toDataURL('image/png');
    } finally {
      await task.destroy();
    }
  }
  return await new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(typeof r.result === 'string' ? r.result : '');
    r.onerror = reject;
    r.readAsDataURL(blob);
  });
}
export function ProductDesigner({
  product,
  design,
  onChange,
  profile,
  readOnly = false,
  onBusy,
}: {
  product: { id: string; category: string };
  design: ProductDesign;
  onChange: (d: ProductDesign) => void;
  profile: Profile;
  readOnly?: boolean;
  onBusy?: (b: boolean) => void;
}) {
  const { t } = useI18n();
  const card = product.id !== 'keychain';
  const blank = blankOption(product);
  const [options, setOptions] = useState<StockOption[]>([]),
    [error, setError] = useState(''),
    [side, setSide] = useState<'front' | 'back'>('front'),
    [rotation, setRotation] = useState(-18),
    [tilt, setTilt] = useState(12),
    [qr, setQr] = useState(''),
    [art, setArt] = useState({ front: '', back: '' });
  const [processing, setProcessing] = useState(false);
  const [stockAttempt, setStockAttempt] = useState(0);
  const [stockLoading, setStockLoading] = useState(true);
  const [stockError, setStockError] = useState('');
  const [tolerance, setTolerance] = useState(30);
  const [originals, setOriginals] = useState<
    Partial<Record<'front' | 'back', Artwork>>
  >({});
  const portrait = card && cardIsPortrait(design.cardTheme);
  const custom = design.optionId === blank;
  const available = options.find((o) => o.id === blank);
  useEffect(() => {
    if (!card || readOnly) return;
    const next = { ...design };
    let changed = false;
    for (const s of ['front', 'back'] as const) {
      const a = design[s];
      if (a && !a.placement && !a.name.toLowerCase().endsWith('.pdf')) {
        next[s] = { ...a, placement: 'logo', scale: 100, x: 0, y: 0 };
        changed = true;
      }
    }
    if (changed) onChange(next);
  }, [card, readOnly, design, onChange]);
  useEffect(() => {
    if (
      card &&
      !readOnly &&
      design.cardTheme &&
      !cardThemes.some((t) => t.id === design.cardTheme)
    ) {
      onChange({ ...design, cardTheme: 'navy-gold', cardColors: undefined });
    }
  }, [card, readOnly, design, onChange]);
  useEffect(() => {
    let alive = true;
    setStockLoading(true);
    setStockError('');
    fetch('/api/product-options', { cache: 'no-store' })
      .then(async (r) => {
        const d = (await r.json()) as {
          error?: string;
          options: StockOption[];
        };
        if (!r.ok) throw Error(d.error);
        if (alive) setOptions(d.options);
      })
      .catch((e) => {
        if (alive)
          setStockError(e.message || 'Não foi possível consultar o stock.');
      })
      .finally(() => {
        if (alive) setStockLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [stockAttempt]);
  useEffect(() => {
    let active = true;
    if (profile.username)
      void QRCode.toDataURL(
        design.profileUrl || `${window.location.origin}/${profile.username}`,
        { margin: 4, width: 300, errorCorrectionLevel: 'M' },
      )
        .then((v) => {
          if (active) setQr(v);
        })
        .catch(() => {
          if (active) setError('Não foi possível gerar o código QR.');
        });
    return () => {
      active = false;
    };
  }, [profile.username, design.profileUrl]);
  const currentArtwork = useEffectEvent(() => ({ design, onBusy }));
  useEffect(() => {
    let active = true;
    const { design, onBusy } = currentArtwork();
    onBusy?.(true);
    void (async () => {
      try {
        const next = { front: '', back: '' };
        for (const s of ['front', 'back'] as const) {
          const a = design[s];
          if (!a) continue;
          let blob = await artworkFile(a.fileKey);
          if (!blob && a.assetId) {
            const r = await fetch(`/api/design-assets/${a.assetId}`);
            if (!r.ok) throw Error('Ficheiro indisponível.');
            blob = await r.blob();
          }
          if (blob) next[s] = await renderFile(blob, a.page);
          else throw Error('Seleccione novamente o ficheiro de design.');
        }
        if (active) {
          setArt(next);
          setError('');
          onBusy?.(false);
        }
      } catch (e) {
        if (active) {
          setArt({ front: '', back: '' });
          setError(
            e instanceof Error
              ? e.message
              : 'Não foi possível visualizar o ficheiro.',
          );
        }
      } finally {
        if (active) onBusy?.(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [
    design.front?.fileKey,
    design.front?.page,
    design.back?.fileKey,
    design.back?.page,
    design.front?.assetId,
    design.back?.assetId,
  ]);
  async function upload(file?: File) {
    if (!file) return;
    setError('');
    setProcessing(true);
    onBusy?.(true);
    try {
      if (card && side === 'back' && file.type !== 'application/pdf')
        throw Error(
          'O logótipo só pode ser colocado na frente, no local «Logo».',
        );
      if (
        !['image/png', 'image/jpeg', 'application/pdf'].includes(file.type) ||
        file.size > 8 * 1024 * 1024
      )
        throw Error('Use PNG, JPG ou PDF até 8 MB.');
      const fileKey = crypto.randomUUID();
      await renderFile(file, 1);
      await artworkFile(fileKey, file);
      setOriginals((prev) => ({ ...prev, [side]: undefined }));
      onChange({
        ...design,
        [side]: {
          fileKey,
          name: file.name,
          page: 1,
          scale: file.type === 'application/pdf' || !card ? 80 : 100,
          x: 0,
          y: 0,
          ...(card && file.type !== 'application/pdf'
            ? { placement: 'logo' as const }
            : {}),
        },
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Não foi possível carregar.');
    } finally {
      setProcessing(false);
      onBusy?.(false);
    }
  }
  const selected = design[side];
  async function removeBackground() {
    if (!selected || selected.name.toLowerCase().endsWith('.pdf')) return;
    setError('');
    setProcessing(true);
    onBusy?.(true);
    try {
      const original = originals[side] ?? selected;
      let blob = await artworkFile(original.fileKey);
      if (!blob && original.assetId) {
        const response = await fetch(`/api/design-assets/${original.assetId}`);
        if (!response.ok) throw Error('Não foi possível abrir o logótipo.');
        blob = await response.blob();
      }
      if (!blob) throw Error('Carregue novamente o logótipo.');
      const image = await createImageBitmap(blob);
      const ratio = Math.min(1, 1800 / Math.max(image.width, image.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(image.width * ratio));
      canvas.height = Math.max(1, Math.round(image.height * ratio));
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
      image.close();
      const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const removed = clearLogoBackground(
        pixels.data,
        canvas.width,
        canvas.height,
        tolerance,
      );
      if (!removed)
        throw Error(
          'Não foi detectado um fundo liso. Ajuste a intensidade ou use um PNG transparente.',
        );
      ctx.putImageData(pixels, 0, 0);
      const png = await new Promise<Blob>((resolve, reject) =>
        canvas.toBlob(
          (result) =>
            result
              ? resolve(result)
              : reject(Error('Não foi possível criar o PNG.')),
          'image/png',
        ),
      );
      const fileKey = crypto.randomUUID();
      await artworkFile(fileKey, png);
      setOriginals((prev) => ({ ...prev, [side]: original }));
      onChange({
        ...design,
        [side]: {
          ...selected,
          assetId: undefined,
          fileKey,
          name: original.name.replace(/\.[^.]+$/, '') + '-sem-fundo.png',
        },
      });
    } catch (e) {
      setError(
        e instanceof Error ? e.message : 'Não foi possível remover o fundo.',
      );
    } finally {
      setProcessing(false);
      onBusy?.(false);
    }
  }
  function adjust(patch: Partial<Artwork>) {
    if (selected) onChange({ ...design, [side]: { ...selected, ...patch } });
  }
  function resetDesign() {
    onChange(resetProductDesign(design));
    setOriginals({});
    setArt({ front: '', back: '' });
    setTolerance(30);
    setError('');
    setSide('front');
    setRotation(-18);
    setTilt(12);
  }
  function face(s: 'front' | 'back', print = false) {
    const a = design[s];
    if (card)
      return (
        <div
          className={`design-face design-card ${portrait ? 'portrait-card' : ''} ${print ? 'flat-face' : ''}`}
        >
          <SourceImage
            className="card-composition"
            alt={
              s === 'front'
                ? t('Frente personalizada do cartão')
                : t('Verso com nome, email e QR do perfil')
            }
            src={cardArtworkUrl(
              cardArtwork({
                theme: design.cardTheme,
                colors: design.cardColors,
                copy: design.cardText?.[s],
                side: s,
                name: profile.name,
                email: profile.email,
                qr,
                art:
                  a && art[s]
                    ? {
                        src: art[s],
                        scale: a.scale,
                        x: a.x,
                        y: a.y,
                        placement: a.placement,
                      }
                    : undefined,
              }),
            )}
          />
        </div>
      );
    return (
      <div
        className={`design-face ${card ? 'design-card' : 'design-keychain'} ${print ? 'flat-face' : ''}`}
      >
        {art[s] && (
          <SourceImage
            className="customer-art"
            src={art[s]}
            alt={t('Design {0}', [s === 'front' ? 'da frente' : 'do verso'])}
            style={{
              width: `${a?.scale ?? 80}%`,
              height: `${a?.scale ?? 80}%`,
              left: `${50 + (a?.x ?? 0)}%`,
              top: `${50 + (a?.y ?? 0)}%`,
            }}
          />
        )}
        {!card && s === 'back' && (
          <SourceImage
            className="fixed-brand"
            src="/brand/logo.svg"
            alt={t('Framy Connect')}
          />
        )}
        {card && s === 'back' && (
          <div className="card-identity">
            <div>
              <strong>{profile.name || t('Nome do titular')}</strong>
              <span>{profile.email || t('Email do titular')}</span>
            </div>
            {qr ? (
              <SourceImage
                src={profile.username ? qr : ''}
                alt={t('QR do perfil final')}
              />
            ) : (
              <span className="qr-pending">{t('QR após criar o perfil')}</span>
            )}
          </div>
        )}
        {!art[s] && s === 'front' && (
          <span className="design-placeholder">{t('O seu logótipo aqui')}</span>
        )}
      </div>
    );
  }
  async function downloadPrint() {
    if (card) {
      const a = design[side];
      const svg = cardArtwork({
        theme: design.cardTheme,
        colors: design.cardColors,
        copy: design.cardText?.[side],
        side,
        name: profile.name,
        email: profile.email,
        qr,
        art:
          a && art[side]
            ? {
                src: art[side],
                scale: a.scale,
                x: a.x,
                y: a.y,
                placement: a.placement,
              }
            : undefined,
      });
      const url = URL.createObjectURL(
        new Blob([svg], { type: 'image/svg+xml' }),
      );
      const link = document.createElement('a');
      link.href = url;
      link.download = `cartao-${portrait ? '54x85.5' : '85.5x54'}mm-${side}.svg`;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      return;
    }
    const w = card ? 1010 : 331,
      h = card ? 638 : 331;
    const svg = document.createElement('canvas');
    svg.width = w;
    svg.height = h;
    const ctx = svg.getContext('2d')!;
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, w, h);
    if (!card) {
      ctx.beginPath();
      ctx.arc(w / 2, h / 2, w / 2, 0, Math.PI * 2);
      ctx.clip();
    }
    async function draw(
      url: string,
      x: number,
      y: number,
      width: number,
      height: number,
    ) {
      const image = new Image();
      image.src = url;
      await image.decode();
      const ratio = Math.min(width / image.width, height / image.height);
      ctx.drawImage(
        image,
        x + (width - image.width * ratio) / 2,
        y + (height - image.height * ratio) / 2,
        image.width * ratio,
        image.height * ratio,
      );
    }
    const a = design[side];
    if (a && art[side]) {
      const aw = (w * a.scale) / 100,
        ah = (h * a.scale) / 100;
      await draw(
        art[side],
        w * (0.5 + a.x / 100) - aw / 2,
        h * (0.5 + a.y / 100) - ah / 2,
        aw,
        ah,
      );
    }
    if (!card && side === 'back')
      await draw('/brand/logo.svg', w * 0.16, h * 0.35, w * 0.68, h * 0.3);
    if (card && side === 'back') {
      ctx.fillStyle = 'white';
      ctx.fillRect(0, h * 0.63, w, h * 0.37);
      ctx.fillStyle = '#222';
      ctx.font = 'bold 30px Arial';
      ctx.fillText(
        profile.name || 'Nome do titular',
        w * 0.05,
        h * 0.77,
        w * 0.61,
      );
      ctx.font = '24px Arial';
      ctx.fillText(
        profile.email || 'Email do titular',
        w * 0.05,
        h * 0.85,
        w * 0.61,
      );
      if (qr) await draw(qr, w * 0.76, h * 0.65, h * 0.31, h * 0.31);
    }
    const physical = `<svg xmlns="http://www.w3.org/2000/svg" width="${card ? 85.5 : 28}mm" height="${card ? 54 : 28}mm" viewBox="0 0 ${w} ${h}"><image width="${w}" height="${h}" href="${svg.toDataURL()}"/></svg>`;
    const url = URL.createObjectURL(
      new Blob([physical], { type: 'image/svg+xml' }),
    );
    const link = document.createElement('a');
    link.download = `${card ? 'cartao-85.5x54mm' : 'porta-chaves-28mm'}-${side}.svg`;
    link.href = url;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return (
    <div
      className={`product-designer seamless-designer ${portrait ? 'portrait-editor' : ''} ${card ? 'card-editor' : 'keychain-editor'}`}
    >
      <fieldset
        className="editor-inputs"
        disabled={processing}
        aria-busy={processing}
      >
        {!readOnly && stockError && (
          <div role="alert">
            <p>
              {stockError}
              {t(' As opções serão activadas após confirmar o stock.')}
            </p>
            <button
              type="button"
              disabled={stockLoading}
              onClick={() => setStockAttempt((n) => n + 1)}
            >
              {t('Consultar stock novamente')}
            </button>
          </div>
        )}
        {!readOnly && !card && (
          <>
            <h3>{t('Escolha o seu porta-chaves')}</h3>
            <p>{t('500 MT por unidade · Frente e verso de cada modelo.')}</p>
            <div className="inventory-choices">
              {keychainChoices.map((choice) => {
                const stock = options.find((o) => o.id === choice.id);
                return (
                  <button
                    type="button"
                    key={choice.id}
                    aria-pressed={design.optionId === choice.id}
                    className={design.optionId === choice.id ? 'chosen' : ''}
                    disabled={
                      stockLoading ||
                      !!stockError ||
                      !stock?.enabled ||
                      !stock.quantity
                    }
                    onClick={() => onChange({ optionId: choice.id })}
                  >
                    <strong>{t(choice.name)}</strong>
                    <div className="inventory-pair">
                      <div>
                        <InventoryPhoto index={choice.index} />
                        <span>{t('Frente')}</span>
                      </div>
                      <div>
                        <InventoryPhoto index={choice.index} back />
                        <span>{t('Verso')}</span>
                      </div>
                    </div>
                    <span>
                      {stockLoading
                        ? t('A consultar stock…')
                        : stockError
                          ? t('Stock por confirmar')
                          : stock?.enabled && stock.quantity
                            ? t('Seleccionar · 500 MT')
                            : t('Indisponível')}
                    </span>
                  </button>
                );
              })}
            </div>
          </>
        )}
        {!readOnly && (!card || !custom) && (
          <button
            className={`custom-choice ${custom ? 'chosen' : ''}`}
            aria-pressed={custom}
            type="button"
            disabled={
              stockLoading ||
              !!stockError ||
              !available?.enabled ||
              !available.quantity
            }
            onClick={() => onChange({ ...design, optionId: blank })}
          >
            <strong>
              {card
                ? t('Personalizar o cartão')
                : t('Criar o meu porta-chaves')}
            </strong>
            <span>
              {available?.enabled && available.quantity
                ? card
                  ? t('Frente e verso · 85,5 × 54 mm')
                  : t('O seu logótipo na frente · 28 mm')
                : t('Personalização indisponível')}
            </span>
          </button>
        )}
        {custom && (
          <>
            <div className="editor-workspace">
              <div className="editor-settings">
                {card && !readOnly && (
                  <div className="card-style-picker">
                    <h3>{t('Modelo')}</h3>
                    <p>
                      {t('O texto «Logo» indica onde ficará o seu logótipo.')}
                    </p>
                    <div>
                      {cardThemes.map((theme) => (
                        <button
                          type="button"
                          key={theme.id}
                          aria-pressed={
                            (design.cardTheme ?? 'plain') === theme.id
                          }
                          onClick={() =>
                            onChange({
                              ...design,
                              cardTheme: theme.id,
                              cardColors: undefined,
                            })
                          }
                        >
                          <span
                            className={`template-preview ${cardIsPortrait(theme.id) ? 'template-portrait' : ''}`}
                          >
                            <SourceImage
                              alt=""
                              src={cardArtworkUrl(
                                cardArtwork({ theme: theme.id, side: 'front' }),
                              )}
                            />
                          </span>
                          {t(theme.name)}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {card && !readOnly && (
                  <section
                    className="card-colors"
                    aria-label={t('Cores do cartão')}
                  >
                    <div className="color-heading">
                      <h3>{t('Cores')}</h3>
                      <button
                        type="button"
                        onClick={resetDesign}
                        title={t(
                          'Remover ficheiros e repor textos e cores de ambos os lados',
                        )}
                      >
                        {t('Repor')}
                      </button>
                    </div>
                    <p>{t('Selector de cor ou código HEX.')}</p>
                    <p>
                      {t(
                        'Repor remove os ficheiros e as edições de texto e cor dos dois lados. Mantém o modelo escolhido e o QR do perfil.',
                      )}
                    </p>
                    <div className="color-grid">
                      {(
                        [
                          ['from', 'Fundo'],
                          ['to', 'Fim do degradé'],
                          ['accent', 'Detalhes'],
                          ['text', 'Texto'],
                        ] as const
                      ).map(([key, label]) => (
                        <CardColorField
                          key={key}
                          label={t(label)}
                          value={
                            cardPalette(design.cardTheme, design.cardColors)[
                              key
                            ]
                          }
                          onChange={(value) =>
                            onChange({
                              ...design,
                              cardColors: {
                                ...cardPalette(
                                  design.cardTheme,
                                  design.cardColors,
                                ),
                                [key]: value,
                              },
                            })
                          }
                        />
                      ))}
                    </div>
                    <small>
                      {t(
                        'Para um fundo liso, use o mesmo código nas duas cores do degradé. Imagens e PDFs mantêm as suas cores originais.',
                      )}
                    </small>
                  </section>
                )}
              </div>
              <div className="editor-preview">
                <div className="designer-heading">
                  <h3>{card ? t('O seu cartão') : t('O seu porta-chaves')}</h3>
                  <p>
                    {card
                      ? t(
                          'Logótipo e marca na frente. Nome, email e QR apenas no verso.',
                        )
                      : t('O verso mantém o logótipo Framy Connect.')}
                  </p>
                </div>
                <div className="designer-layout">
                  <div className="designer-stage">
                    <div
                      className="keyring-model"
                      style={{
                        transform: `rotateX(${tilt}deg) rotateY(${rotation}deg)`,
                        transformStyle: 'preserve-3d',
                      }}
                    >
                      {!card && <div className="keyring-loop" />}
                      <div className="model-front">{face('front')}</div>
                      <div className="model-back">{face('back')}</div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="designer-controls">
                <strong>{t('Pré-visualização 3D')}</strong>
                <label>
                  {t('Rodar')}
                  <input
                    aria-label={t('Rodar modelo 3D')}
                    type="range"
                    min="-180"
                    max="180"
                    value={rotation}
                    onChange={(e) => setRotation(Number(e.target.value))}
                  />
                </label>
                <label>
                  {t('Inclinar')}
                  <input
                    type="range"
                    min="-35"
                    max="35"
                    value={tilt}
                    onChange={(e) => setTilt(Number(e.target.value))}
                  />
                </label>
                <div className="side-buttons">
                  {(['front', 'back'] as const).map((s) => (
                    <button
                      type="button"
                      key={s}
                      aria-pressed={side === s}
                      onClick={() => {
                        setSide(s);
                        setRotation(s === 'back' ? 180 : -18);
                      }}
                    >
                      {s === 'front' ? t('Frente') : t('Verso')}
                    </button>
                  ))}
                </div>
                {!readOnly && card && (
                  <section
                    className="card-text-fields"
                    aria-label={t('Textos {0}', [
                      t(side === 'front' ? 'da frente' : 'do verso'),
                    ])}
                  >
                    <h3>
                      {t('Textos · ')}
                      {side === 'front' ? t('Frente') : t('Verso')}
                    </h3>
                    {cardCopyFields(design.cardTheme, side).map((key) => {
                      const defaults = {
                        brand: 'Logo',
                        subtitle: '',
                        name: profile.name || 'Nome do titular',
                        email: profile.email || 'Email do titular',
                        action:
                          design.cardTheme === 'plain' && side === 'front'
                            ? ''
                            : 'Aproxime ou leia o QR',
                      };
                      const labels = {
                        brand: 'Logo / nome da marca',
                        subtitle: 'Subtítulo',
                        name: 'Nome no cartão',
                        email: 'Email no cartão',
                        action: 'Texto de apoio',
                      };
                      return (
                        <label key={key}>
                          {t(labels[key])}
                          <input
                            type="text"
                            value={
                              design.cardText?.[side]?.[key] ?? defaults[key]
                            }
                            maxLength={key === 'email' ? 120 : 80}
                            onChange={(e) =>
                              onChange({
                                ...design,
                                cardText: {
                                  ...design.cardText,
                                  [side]: {
                                    ...design.cardText?.[side],
                                    [key]: e.target.value,
                                  },
                                },
                              })
                            }
                          />
                        </label>
                      );
                    })}
                    <small>
                      {t(
                        'A frente apresenta a marca; o verso reúne os contactos e o QR do perfil.',
                      )}
                    </small>
                  </section>
                )}
                {!readOnly && (card || side === 'front') && (
                  <>
                    <label>
                      {card && side === 'back'
                        ? t('Design próprio (PDF)')
                        : t('Logótipo ou design próprio')}
                      <input
                        type="file"
                        accept={
                          card && side === 'back'
                            ? 'application/pdf'
                            : 'image/png,image/jpeg,application/pdf'
                        }
                        onChange={(e) => {
                          void upload(e.target.files?.[0]);
                          e.target.value = '';
                        }}
                      />
                    </label>
                    <small>
                      {card && side === 'back'
                        ? t(
                            'O logótipo aparece apenas na frente. PDF para design completo · até 8 MB.',
                          )
                        : t(
                            'PNG ou JPG substitui «Logo» no local indicado. PDF para design completo · até 8 MB.',
                          )}
                    </small>
                    {selected && (
                      <>
                        <p>{selected.name}</p>
                        {(!card || side === 'front') &&
                          !selected.name.toLowerCase().endsWith('.pdf') && (
                            <div className="logo-background-controls">
                              <label>
                                {t('Intensidade da remoção')}
                                <input
                                  type="range"
                                  min="0"
                                  max="100"
                                  value={tolerance}
                                  onChange={(e) =>
                                    setTolerance(Number(e.target.value))
                                  }
                                />
                              </label>
                              <button
                                type="button"
                                onClick={() => void removeBackground()}
                              >
                                {t('Remover fundo')}
                              </button>
                              {originals[side] && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    onChange({
                                      ...design,
                                      [side]: {
                                        ...originals[side]!,
                                        scale: selected.scale,
                                        x: selected.x,
                                        y: selected.y,
                                      },
                                    });
                                    setOriginals((prev) => ({
                                      ...prev,
                                      [side]: undefined,
                                    }));
                                  }}
                                >
                                  {t('Restaurar original')}
                                </button>
                              )}
                              <small>
                                {t(
                                  'Para fundos lisos. A remoção é feita neste dispositivo. Para fundos complexos, use um PNG transparente.',
                                )}
                              </small>
                            </div>
                          )}
                        {selected.name.toLowerCase().endsWith('.pdf') && (
                          <label>
                            {t('Página do PDF')}
                            <input
                              type="number"
                              min="1"
                              max="100"
                              value={selected.page}
                              onChange={(e) =>
                                adjust({ page: Number(e.target.value) })
                              }
                            />
                          </label>
                        )}
                        {(['scale', 'x', 'y'] as const).map((k) => (
                          <label key={k}>
                            {k === 'scale'
                              ? t('Tamanho')
                              : k === 'x'
                                ? t('Posição horizontal')
                                : t('Posição vertical')}
                            <input
                              type="range"
                              min={k === 'scale' ? 20 : -40}
                              max={k === 'scale' ? 150 : 40}
                              value={selected[k]}
                              onChange={(e) =>
                                adjust({ [k]: Number(e.target.value) })
                              }
                            />
                          </label>
                        ))}
                        <button
                          type="button"
                          onClick={() => (
                            setOriginals((prev) => ({
                              ...prev,
                              [side]: undefined,
                            })),
                            onChange({ ...design, [side]: undefined })
                          )}
                        >
                          {t('Remover ficheiro')}
                        </button>
                      </>
                    )}
                  </>
                )}
              </div>
            </div>
            <details className="print-disclosure">
              <summary>
                {t('Arte para impressão')}{' '}
                <span>
                  {card
                    ? portrait
                      ? t('54 × 85,5 mm')
                      : t('85,5 × 54 mm')
                    : t('Ø 28 mm')}{' '}
                  {t('· Ver 2D e descarregar')}
                </span>
              </summary>
              <div className="flat-designs">
                <figure>
                  {face('front', true)}
                  <figcaption>{t('Frente')}</figcaption>
                </figure>
                <figure>
                  {face('back', true)}
                  <figcaption>{t('Verso')}</figcaption>
                </figure>
              </div>
              <button
                className="btn"
                type="button"
                onClick={() =>
                  void downloadPrint().catch(() =>
                    setError('Não foi possível exportar a vista.'),
                  )
                }
              >
                {t('Descarregar vista 2D (')}
                {side === 'front' ? t('frente') : t('verso')})
              </button>
              <p className="muted">
                {t(
                  'Exportação à escala de 300 ppp, sem sangria. Confirmar margens e acabamento com a gráfica. A prévia é ilustrativa.',
                )}
              </p>
            </details>
          </>
        )}
        {readOnly && !custom && (
          <p>
            {t('Modelo:')}{' '}
            {keychainChoices.find((c) => c.id === design.optionId)?.name ??
              design.optionId}
          </p>
        )}
        {processing && <output>{t('A processar o logótipo…')}</output>}
      </fieldset>
      {error && <p role="alert">{t(error)}</p>}
    </div>
  );
}

function CardColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const { t } = useI18n();
  const [hex, setHex] = useState(value);
  const [previous, setPrevious] = useState(value);
  if (previous !== value) {
    setPrevious(value);
    setHex(value);
  }
  const normalise = (input: string) => {
    const raw = input.trim().replace(/^#/, '');
    return /^[0-9a-f]{3}$/i.test(raw)
      ? '#' +
          raw
            .split('')
            .map((c) => c + c)
            .join('')
      : '#' + raw;
  };
  const valid = /^#[0-9a-f]{6}$/i.test(normalise(hex));
  return (
    <div className="card-color-field">
      <span>{t(label)}</span>
      <div>
        <input
          type="color"
          aria-label={t('{0}: seleccionar cor', [label])}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
        <input
          type="text"
          aria-label={t('{0}: código HEX', [label])}
          value={hex}
          maxLength={7}
          spellCheck={false}
          aria-invalid={!valid}
          onChange={(e) => {
            setHex(e.target.value);
            if (/^#?[0-9a-f]{6}$/i.test(e.target.value))
              onChange(normalise(e.target.value));
          }}
          onBlur={() => {
            if (valid) {
              const next = normalise(hex).toUpperCase();
              setHex(next);
              onChange(next);
            }
          }}
          placeholder={t('#FF6600')}
        />
      </div>
      {!valid && <output>{t('Use 3 ou 6 caracteres: 0–9 e A–F.')}</output>}
    </div>
  );
}
