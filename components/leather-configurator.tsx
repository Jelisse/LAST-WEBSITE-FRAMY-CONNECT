'use client';
import { useEffect, useEffectEvent, useRef, useState, useId } from 'react';
import { Upload, RotateCcw, Ruler, Check, Move3D, Sun } from 'lucide-react';
import { SourceImage } from './source-image';
import type { LeatherDesign } from '@/lib/leather-design';
async function previewFile(blob: Blob, page: number) {
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
        throw Error(`O PDF tem ${pdf.numPages} página(s).`);
      const sheet = await pdf.getPage(page),
        base = sheet.getViewport({ scale: 1 }),
        viewport = sheet.getViewport({
          scale: 900 / Math.max(base.width, base.height),
        });
      const canvas = document.createElement('canvas');
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      await sheet.render({
        canvas,
        canvasContext: canvas.getContext('2d')!,
        viewport,
      }).promise;
      return canvas.toDataURL('image/png');
    } finally {
      await task.destroy();
    }
  }
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () =>
      resolve(typeof reader.result === 'string' ? reader.result : '');
    reader.onerror = () => reject(Error('Não foi possível ler a imagem.'));
    reader.readAsDataURL(blob);
  });
}
export function LeatherPreview({
  value,
  design,
  preview,
  back = false,
}: {
  value: LeatherDesign;
  design: string;
  preview?: string;
  back?: boolean;
}) {
  const uid = useId().replaceAll(':', '');
  const photo = back
    ? `/products/leather/${value.color}-back.png`
    : design === 'standard' &&
        !(value.color === 'black' && value.logo === 'full')
      ? `/products/leather/${value.color}-${value.logo}.png`
      : null;
  if (photo)
    return (
      <SourceImage
        className="leather-photo"
        src={photo}
        alt={`Porta-chaves de couro ${value.color === 'brown' ? 'castanho' : 'preto'} · ${back ? 'verso NFC' : value.logo === 'full' ? 'logo completo' : 'símbolo F'}`}
        width={600}
        height={620}
      />
    );
  return (
    <svg
      className="leather-photo"
      viewBox="0 0 400 440"

      aria-label="Simulação do logótipo na frente do porta-chaves"
    >
      <defs>
        <linearGradient id={uid} x2="1" y2="1">
          <stop stopColor={value.color === 'brown' ? '#b7682c' : '#3c3c3c'} />
          <stop
            offset="1"
            stopColor={value.color === 'brown' ? '#71340f' : '#151515'}
          />
        </linearGradient>
        <clipPath id={uid + 'clip'}>
          <circle cx="200" cy="280" r="89" />
        </clipPath>
      </defs>
      <rect width="400" height="440" rx="20" fill="#f4f1eb" />
      <circle
        cx="200"
        cy="91"
        r="64"
        fill="none"
        stroke="#323232"
        strokeWidth="13"
      />
      <circle
        cx="200"
        cy="91"
        r="64"
        fill="none"
        stroke="#bdbdbd"
        strokeWidth="3"
      />
      <path
        d="M166 118h68v38c0 31 78 61 78 139a112 112 0 0 1-224 0c0-78 78-108 78-139z"
        fill={`url(#${uid})`}
        stroke="#432719"
        strokeWidth="2"
      />
      <circle
        cx="200"
        cy="288"
        r="98"
        fill="none"
        stroke={value.color === 'brown' ? '#dfab6b' : '#727272'}
        strokeWidth="3"
        strokeDasharray="7 5"
      />
      <g clipPath={`url(#${uid}clip)`}>
        {(preview || design === 'standard') && (
          <image
            href={preview || '/brand/logo.svg'}
            x={200 - (89 * value.scale) / 100 + value.x * 1.5}
            y={280 - (65 * value.scale) / 100 + value.y * 1.5}
            width={(178 * value.scale) / 100}
            height={(130 * value.scale) / 100}
            preserveAspectRatio="xMidYMid meet"
          />
        )}
      </g>
    </svg>
  );
}
export function LeatherConfigurator({
  value,
  onChange,
  design,
  signedIn,
  onBusy,
  dimensions,
}: {
  value: LeatherDesign;
  onChange: (value: LeatherDesign) => void;
  design: string;
  signedIn: boolean;
  onBusy: (busy: boolean) => void;
  dimensions?: string;
}) {
  const [preview, setPreview] = useState(''),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false),
    [back, setBack] = useState(false),
    [isPdf, setIsPdf] = useState(false);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [light, setLight] = useState(50);
  const fileRef = useRef<Blob | null>(null),
    sequence = useRef(0);
  const update = (patch: Partial<LeatherDesign>) =>
    onChange({ ...value, ...patch });
  const invalidate = useEffectEvent(() => update({ assetId: undefined }));
  useEffect(() => {
    if (!value.assetId) return;
    let alive = true;
    onBusy(true);
    void fetch('/api/design-assets/' + value.assetId)
      .then(async (r) => {
        if (!r.ok) throw Error('Volte a carregar o logótipo.');
        const blob = await r.blob();
        fileRef.current = blob;
        if (alive) setIsPdf(blob.type === 'application/pdf');
        return previewFile(blob, value.page);
      })
      .then((src) => {
        if (alive) setPreview(src);
      })
      .catch((e) => {
        if (alive) {
          setError(e.message);
          invalidate();
        }
      })
      .finally(() => {
        if (alive) onBusy(false);
      });
    return () => {
      alive = false;
      onBusy(false);
    };
  }, [value.assetId, value.page, onBusy]);
  async function upload(file?: File) {
    if (!file) return;
    const seq = ++sequence.current;
    setBusy(true);
    onBusy(true);
    setError('');
    try {
      if (file.size > 8 * 1024 * 1024) throw Error('Máximo: 8 MB.');
      if (!['application/pdf', 'image/png', 'image/jpeg'].includes(file.type))
        throw Error('Use PDF, PNG ou JPG.');
      const src = await previewFile(file, 1);
      if (seq !== sequence.current) return;
      setPreview(src);
      fileRef.current = file;
      setIsPdf(file.type === 'application/pdf');
      setBack(false);
      if (!signedIn) {
        update({ assetId: undefined, fileName: file.name, page: 1 });
        setError(
          'Pré-visualização local. Inicie sessão e carregue o ficheiro para o guardar no pedido.',
        );
        return;
      }
      const r = await fetch('/api/design-assets', {
        method: 'POST',
        headers: { 'Content-Type': file.type },
        body: file,
      });
      const d = (await r.json()) as { id: string; error?: string };
      if (!r.ok) throw Error(d.error);
      update({ assetId: d.id, fileName: file.name, page: 1 });
    } catch (e) {
      update({ assetId: undefined });
      setError(e instanceof Error ? e.message : 'Não foi possível carregar.');
    } finally {
      setBusy(false);
      onBusy(false);
    }
  }
  return (
    <section className="leather-config">
      <div className="leather-controls">
        <h3>Personalize o porta-chaves de couro</h3>
        <fieldset disabled={busy}>
          <legend>Cor do couro</legend>
          <div className="leather-swatches">
            {(['brown', 'black'] as const).map((color) => (
              <button
                type="button"
                key={color}
                aria-pressed={value.color === color}
                onClick={() => update({ color })}
              >
                <span
                  style={{ background: color === 'brown' ? '#975121' : '#222' }}
                />
                {color === 'brown' ? 'Castanho' : 'Preto'}
                {value.color === color && (
                  <Check size={15} aria-hidden="true" />
                )}
              </button>
            ))}
          </div>
        </fieldset>
        {design === 'standard' && (
          <>
            <fieldset>
              <legend>Logótipo frontal</legend>
              <div className="leather-logos">
                {(['full', 'symbol'] as const).map((logo) => (
                  <button
                    type="button"
                    key={logo}
                    aria-pressed={value.logo === logo}
                    onClick={() => update({ logo })}
                  >
                    {logo === 'full' ? 'FramyConnect completo' : 'Símbolo F'}
                  </button>
                ))}
              </div>
            </fieldset>
            <div className="leather-specs">
              <Ruler size={18} aria-hidden="true" />
              <div>
                <strong>Dimensões do produto</strong>
                <p>{dimensions || 'Medidas a confirmar pela equipa.'}</p>
                <small>Couro · Argola metálica · Verso com símbolo NFC</small>
              </div>
            </div>
          </>
        )}
        {design === 'customer' && (
          <>
            <label className="leather-upload">
              <Upload size={20} aria-hidden="true" />
              <strong>Carregar o seu logótipo</strong>
              <span>PDF vectorial, PNG ou JPG · até 8 MB</span>
              <input
                type="file"
                accept="application/pdf,image/png,image/jpeg"
                disabled={busy}
                onChange={(e) => {
                  void upload(e.target.files?.[0]);
                  e.target.value = '';
                }}
              />
            </label>
            {value.fileName && <p className="leather-file">{value.fileName}</p>}
            {preview && (
              <div className="leather-logo-source">
                <SourceImage src={preview} alt="Logótipo carregado" />
                <span>O seu logótipo</span>
              </div>
            )}
            {value.assetId && <p>Ficheiro guardado para produção.</p>}
            {preview && (
              <>
                <label>
                  Tamanho do logótipo
                  <input
                    type="range"
                    min="25"
                    max="100"
                    value={value.scale}
                    onChange={(e) => update({ scale: Number(e.target.value) })}
                  />
                </label>
                <label>
                  Posição horizontal
                  <input
                    type="range"
                    min="-20"
                    max="20"
                    value={value.x}
                    onChange={(e) => update({ x: Number(e.target.value) })}
                  />
                </label>
                <label>
                  Posição vertical
                  <input
                    type="range"
                    min="-20"
                    max="20"
                    value={value.y}
                    onChange={(e) => update({ y: Number(e.target.value) })}
                  />
                </label>
                <button
                  type="button"
                  onClick={() => update({ scale: 70, x: 0, y: 0 })}
                >
                  <RotateCcw size={15} aria-hidden="true" /> Repor posição
                </button>
                {isPdf && (
                  <label>
                    Página do PDF
                    <input
                      type="number"
                      min="1"
                      max="100"
                      value={value.page}
                      onChange={(e) => {
                        const page = Number(e.target.value);
                        if (Number.isInteger(page) && page > 0 && page <= 100) {
                          update({ page });
                          if (!value.assetId && fileRef.current)
                            void previewFile(fileRef.current, page)
                              .then((src) => {
                                setPreview(src);
                                setError('');
                              })
                              .catch((e) => setError(e.message));
                        }
                      }}
                    />
                  </label>
                )}
              </>
            )}
          </>
        )}
        {busy && <output>A preparar o logótipo…</output>}
        {error && <p role="alert">{error}</p>}
      </div>
      <figure className="leather-preview">
        <div className="leather-face-tabs">
          <button
            type="button"
            aria-pressed={!back}
            onClick={() => setBack(false)}
          >
            Frente
          </button>
          <button
            type="button"
            aria-pressed={back}
            onClick={() => setBack(true)}
          >
            Verso
          </button>
        </div>
        <div
          className={`leather-studio ${value.color === 'black' ? 'is-black' : ''}`}
        >
          <div className="leather-studio-label">
            <Move3D size={15} aria-hidden="true" /> Vista interactiva
          </div>
          <div
            className="leather-studio-stage"
            onPointerMove={(e) => {
              if (e.pointerType !== 'mouse') return;
              const r = e.currentTarget.getBoundingClientRect();
              setTilt({
                x: (0.5 - (e.clientY - r.top) / r.height) * 14,
                y: ((e.clientX - r.left) / r.width - 0.5) * 24,
              });
            }}
            onPointerLeave={() => setTilt({ x: 0, y: 0 })}
          >
            <div
              className="leather-studio-halo"
              style={{ opacity: 0.25 + light / 160 }}
            />
            <div
              className="leather-studio-shadow"
              style={{
                transform: `translateX(${tilt.y * 0.6}px) scale(${1 - Math.abs(tilt.y) / 150})`,
              }}
            />
            <div
              className="leather-studio-object"
              style={{
                transform: `rotateX(${tilt.x}deg) rotateY(${tilt.y + (back ? 180 : 0)}deg)`,
              }}
            >
              <div className="leather-studio-face" aria-hidden={back}>
                <LeatherPreview
                  value={value}
                  design={design}
                  preview={design === 'customer' ? preview : undefined}
                />
                <div
                  className="leather-studio-sheen"
                  style={{
                    opacity: light / 350,
                    transform: `translateX(${tilt.y * 1.2}px)`,
                  }}
                />
              </div>
              <div
                className="leather-studio-face leather-studio-reverse"
                aria-hidden={!back}
              >
                <LeatherPreview value={value} design={design} back />
                <div
                  className="leather-studio-sheen"
                  style={{ opacity: light / 350 }}
                />
              </div>
            </div>
          </div>
          <div className="leather-studio-caption">
            <span>
              COURO · {value.color === 'brown' ? 'CASTANHO' : 'PRETO'}
            </span>
            <small>Mova o cursor para inclinar</small>
          </div>
        </div>
        <div className="leather-studio-controls">
          <label>
            <Move3D size={15} aria-hidden="true" /> Ângulo
            <input
              type="range"
              aria-label="Ângulo de visualização"
              min="-22"
              max="22"
              value={tilt.y}
              onChange={(e) => setTilt({ x: 0, y: Number(e.target.value) })}
            />
          </label>
          <label>
            <Sun size={15} aria-hidden="true" /> Luz
            <input
              type="range"
              aria-label="Intensidade da iluminação"
              min="0"
              max="100"
              value={light}
              onChange={(e) => setLight(Number(e.target.value))}
            />
          </label>
          <button
            type="button"
            onClick={() => {
              setTilt({ x: 0, y: 0 });
              setLight(50);
              setBack(false);
            }}
          >
            <RotateCcw size={15} aria-hidden="true" /> Repor vista
          </button>
        </div>
        <figcaption>
          {back ? 'Verso com símbolo NFC' : 'Pré-visualização da frente'}
          <small>
            Simulação ilustrativa. Cor e acabamento da gravação podem variar. A
            equipa verifica o ficheiro antes da produção.
          </small>
        </figcaption>
      </figure>
    </section>
  );
}
