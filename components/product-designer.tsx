'use client';
import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { cardThemes, cardArtwork, cardArtworkUrl, cardPalette, cardIsPortrait } from '@/lib/card-art';
import { artworkFile } from '@/lib/artwork-storage';
import {
  blankOption,
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
  return (
    <svg
      className="inventory-photo"
      viewBox={`180 ${[230, 670, 1090][index]} 970 440`}
      role="img"
      aria-label={
        back
          ? 'Verso com logótipo Framy Connect'
          : 'Fotografia do porta-chaves em stock'
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
    r.onload = () => resolve(String(r.result));
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
  const card = product.id !== 'keychain';
  const blank = blankOption(product);
  const [options, setOptions] = useState<StockOption[]>([]),
    [error, setError] = useState(''),
    [side, setSide] = useState<'front' | 'back'>('front'),
    [rotation, setRotation] = useState(-18),
    [tilt, setTilt] = useState(12),
    [qr, setQr] = useState(''),
    [art, setArt] = useState({ front: '', back: '' });
  const portrait = card && cardIsPortrait(design.cardTheme);
  const custom = design.optionId === blank;
  const available = options.find((o) => o.id === blank);
  useEffect(() => {
    if (card && !readOnly && design.cardTheme && !cardThemes.some((t) => t.id === design.cardTheme)) {
      onChange({...design, cardTheme: 'navy-gold', cardColors: undefined});
    }
  }, [card, readOnly, design.cardTheme]);
  useEffect(() => {
    let alive = true;
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
        if (alive) setError(e.message);
      });
    return () => {
      alive = false;
    };
  }, []);
  useEffect(() => {
    let active = true;
    if (profile.username)
      QRCode.toDataURL(
        design.profileUrl || `${window.location.origin}/${profile.username}`,
        { margin: 4, width: 300, errorCorrectionLevel: 'M' },
      ).then((v) => {
        if (active) setQr(v);
      });
    else setQr('');
    return () => {
      active = false;
    };
  }, [profile.username, design.profileUrl]);
  useEffect(() => {
    let active = true;
    onBusy?.(true);
    (async () => {
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
  ]);
  async function upload(file?: File) {
    if (!file) return;
    setError('');
    onBusy?.(true);
    try {
      if (
        !['image/png', 'image/jpeg', 'application/pdf'].includes(file.type) ||
        file.size > 8 * 1024 * 1024
      )
        throw Error('Use PNG, JPG ou PDF até 8 MB.');
      const fileKey = crypto.randomUUID();
      await renderFile(file, 1);
      await artworkFile(fileKey, file);
      onChange({
        ...design,
        [side]: { fileKey, name: file.name, page: 1, scale: 80, x: 0, y: 0 },
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Não foi possível carregar.');
    } finally {
      onBusy?.(false);
    }
  }
  const selected = design[side];
  function adjust(patch: Partial<Artwork>) {
    if (selected) onChange({ ...design, [side]: { ...selected, ...patch } });
  }
  function face(s: 'front' | 'back', print = false) {
    const a = design[s];
    if (card)
      return (
        <div className={`design-face design-card ${portrait ? "portrait-card" : ""} ${print ? 'flat-face' : ''}`}>
          <img
            className="card-composition"
            alt={
              s === 'front'
                ? 'Frente personalizada do cartão'
                : 'Verso com nome, email e QR do perfil'
            }
            src={cardArtworkUrl(
              cardArtwork({
                theme: design.cardTheme,
        colors: design.cardColors,
                side: s,
                name: profile.name,
                email: profile.email,
                qr,
                art:
                  a && art[s]
                    ? { src: art[s], scale: a.scale, x: a.x, y: a.y }
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
          <img
            className="customer-art"
            src={art[s]}
            alt={`Design ${s === 'front' ? 'da frente' : 'do verso'}`}
            style={{
              width: `${a?.scale ?? 80}%`,
              height: `${a?.scale ?? 80}%`,
              left: `${50 + (a?.x ?? 0)}%`,
              top: `${50 + (a?.y ?? 0)}%`,
            }}
          />
        )}
        {!card && s === 'back' && (
          <img
            className="fixed-brand"
            src="/brand/logo.svg"
            alt="Framy Connect"
          />
        )}
        {card && s === 'back' && (
          <div className="card-identity">
            <div>
              <strong>{profile.name || 'Nome do titular'}</strong>
              <span>{profile.email || 'Email do titular'}</span>
            </div>
            {qr ? (
              <img src={qr} alt="QR do perfil final" />
            ) : (
              <span className="qr-pending">QR após criar o perfil</span>
            )}
          </div>
        )}
        {!art[s] && s === 'front' && (
          <span className="design-placeholder">O seu logótipo aqui</span>
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
        side,
        name: profile.name,
        email: profile.email,
        qr,
        art:
          a && art[side]
            ? { src: art[side], scale: a.scale, x: a.x, y: a.y }
            : undefined,
      });
      const url = URL.createObjectURL(
        new Blob([svg], { type: 'image/svg+xml' }),
      );
      const link = document.createElement('a');
      link.href = url;
      link.download = `cartao-${portrait ? "54x85.5" : "85.5x54"}mm-${side}.svg`;
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
    <div className={`product-designer seamless-designer ${portrait ? "portrait-editor" : ""} ${card ? "card-editor" : "keychain-editor"}`}>
      {!readOnly && !card && (
        <>
          <h3>Escolha o seu porta-chaves</h3>
          <p>500 MT por unidade · Frente e verso de cada modelo.</p>
          <div className="inventory-choices">
            {keychainChoices.map((choice) => {
              const stock = options.find((o) => o.id === choice.id);
              return (
                <button
                  type="button"
                  key={choice.id}
                  aria-pressed={design.optionId === choice.id}
                  className={design.optionId === choice.id ? 'chosen' : ''}
                  disabled={!stock?.enabled || !stock.quantity}
                  onClick={() => onChange({ optionId: choice.id })}
                >
                  <strong>{choice.name}</strong>
                  <div className="inventory-pair">
                    <div>
                      <InventoryPhoto index={choice.index} />
                      <span>Frente</span>
                    </div>
                    <div>
                      <InventoryPhoto index={choice.index} back />
                      <span>Verso</span>
                    </div>
                  </div>
                  <span>
                    {stock?.enabled && stock.quantity
                      ? 'Seleccionar · 500 MT'
                      : 'Indisponível'}
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
          disabled={!available?.enabled || !available.quantity}
          onClick={() => onChange({ ...design, optionId: blank })}
        >
          <strong>
            {card ? 'Personalizar o cartão' : 'Criar o meu porta-chaves'}
          </strong>
          <span>
            {available?.enabled && available.quantity
              ? card
                ? 'Frente e verso · 85,5 × 54 mm'
                : 'O seu logótipo na frente · 28 mm'
              : 'Personalização indisponível'}
          </span>
        </button>
      )}
      {custom && (
        <>
          <div className="editor-workspace">
          <div className="editor-settings">
          {card && !readOnly && (
            <div className="card-style-picker">
              <h3>Modelo</h3>
              <p>
                Escolha um modelo horizontal ou vertical.
              </p>
              <div>
                {cardThemes.map((t) => (
                  <button
                    type="button"
                    key={t.id}
                    aria-pressed={(design.cardTheme ?? 'plain') === t.id}
                    onClick={() => onChange({ ...design, cardTheme: t.id, cardColors: undefined })}
                  >
                    <span className={`template-preview ${cardIsPortrait(t.id) ? 'template-portrait' : ''}`}><img alt="" src={cardArtworkUrl(cardArtwork({theme: t.id, side: 'front'}))} /></span>
                    {t.name}
                  </button>
                ))}
              </div>
            </div>
          )}
          {card && !readOnly && (
            <section className="card-colors" aria-label="Cores do cartão">
              <div className="color-heading"><h3>Cores</h3>
                <button type="button" onClick={() => onChange({...design, cardColors: undefined})}>Repor</button>
              </div>
              <p>Selector de cor ou código HEX.</p>
              <div className="color-grid">
                {([['from', 'Fundo'], ['to', 'Fim do degradé'], ['accent', 'Detalhes'], ['text', 'Texto']] as const).map(([key, label]) => (
                  <CardColorField key={key} label={label} value={cardPalette(design.cardTheme, design.cardColors)[key]}
                    onChange={(value) => onChange({...design, cardColors: {...cardPalette(design.cardTheme, design.cardColors), [key]: value}})} />
                ))}
              </div>
              <small>Para um fundo liso, use o mesmo código nas duas cores do degradé. Imagens e PDFs mantêm as suas cores originais.</small>
            </section>
          )}
          </div>
          <div className="editor-preview">
          <div className="designer-heading">
            <h3>{card ? 'O seu cartão' : 'O seu porta-chaves'}</h3>
            <p>
              {card
                ? 'Nome, email e QR são adicionados ao verso após a criação do perfil.'
                : 'O verso mantém o logótipo Framy Connect.'}
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
            <div className="designer-controls">
              <strong>Pré-visualização 3D</strong>
              <label>
                Rodar
                <input
                  aria-label="Rodar modelo 3D"
                  type="range"
                  min="-180"
                  max="180"
                  value={rotation}
                  onChange={(e) => setRotation(Number(e.target.value))}
                />
              </label>
              <label>
                Inclinar
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
                    {s === 'front' ? 'Frente' : 'Verso'}
                  </button>
                ))}
              </div>
              {!readOnly && (card || side === 'front') && (
                <>
                  <label>
                    Logótipo ou design próprio
                    <input
                      type="file"
                      accept="image/png,image/jpeg,application/pdf"
                      onChange={(e) => void upload(e.target.files?.[0])}
                    />
                  </label>
                  <small>
                    PNG, JPG ou PDF · até 8 MB.
                  </small>
                  {selected && (
                    <>
                      <p>{selected.name}</p>
                      {selected.name.toLowerCase().endsWith('.pdf') && (
                        <label>
                          Página do PDF
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
                            ? 'Tamanho'
                            : k === 'x'
                              ? 'Posição horizontal'
                              : 'Posição vertical'}
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
                        onClick={() =>
                          onChange({ ...design, [side]: undefined })
                        }
                      >
                        Remover ficheiro
                      </button>
                    </>
                  )}
                </>
              )}
            </div>
          </div>
          </div>
          </div>
          <details className="print-disclosure">
          <summary>Arte para impressão <span>{card ? portrait ? '54 × 85,5 mm' : '85,5 × 54 mm' : 'Ø 28 mm'} · Ver 2D e descarregar</span></summary>
          <div className="flat-designs">
            <figure>
              {face('front', true)}
              <figcaption>Frente</figcaption>
            </figure>
            <figure>
              {face('back', true)}
              <figcaption>Verso</figcaption>
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
            Descarregar vista 2D ({side === 'front' ? 'frente' : 'verso'})
          </button>
          <p className="muted">
            Exportação à escala de 300 ppp, sem sangria. Confirmar margens e
            acabamento com a gráfica. A prévia é ilustrativa.
          </p>
          </details>
        </>
      )}
      {readOnly && !custom && (
        <p>
          Modelo:{' '}
          {keychainChoices.find((c) => c.id === design.optionId)?.name ??
            design.optionId}
        </p>
      )}
      {error && <p role="alert">{error}</p>}
    </div>
  );
}

function CardColorField({label, value, onChange}: {label: string; value: string; onChange: (value: string) => void}) {
  const [hex, setHex] = useState(value);
  useEffect(() => setHex(value), [value]);
  const normalise = (input: string) => {
    const raw = input.trim().replace(/^#/, '');
    return /^[0-9a-f]{3}$/i.test(raw) ? '#' + [...raw].map((c) => c + c).join('') : '#' + raw;
  };
  const valid = /^#[0-9a-f]{6}$/i.test(normalise(hex));
  return <div className="card-color-field"><span>{label}</span><div>
    <input type="color" aria-label={`${label}: seleccionar cor`} value={value} onChange={(e) => onChange(e.target.value)} />
    <input type="text" aria-label={`${label}: código HEX`} value={hex} maxLength={7} spellCheck={false} aria-invalid={!valid}
      onChange={(e) => {setHex(e.target.value); if (/^#?[0-9a-f]{6}$/i.test(e.target.value)) onChange(normalise(e.target.value));}}
      onBlur={() => {if (valid) {const next = normalise(hex).toUpperCase();setHex(next);onChange(next);}}}
      placeholder="#FF6600" />
  </div>{!valid && <small role="status">Use 3 ou 6 caracteres: 0–9 e A–F.</small>}</div>;
}
