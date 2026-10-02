'use client';
import { useEffect, useEffectEvent, useRef, useState } from 'react';
import { Upload, RotateCcw, Ruler, Check, Move3D, Eraser } from 'lucide-react';
import { SourceImage } from './source-image';
import { removeLogoBackground } from '@/lib/logo-background';
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
  const logo = value.color === 'black' ? 'symbol' : value.logo;
  const custom = design !== 'standard';
  const photo = `/products/leather/${value.color}-${back ? 'back' : custom ? 'blank' : logo}.png`;
  return (
    <div className="leather-photo-composite">
      <SourceImage
        className="leather-photo"
        src={photo}
        alt={`Porta-chaves de couro ${value.color === 'brown' ? 'castanho' : 'preto'} · ${back ? 'verso NFC' : custom ? 'frente para personalizar' : logo === 'full' ? 'logo completo' : 'símbolo F'}`}
        width={985}
        height={1024}
      />
      {!back && design === 'customer' && preview && (
        <div className="leather-photo-artwork">
          <SourceImage
            src={preview}
            alt="O seu logótipo aplicado ao produto"
            style={{
              width: `${value.scale}%`,
              height: `${value.scale}%`,
              left: `${50 + value.x}%`,
              top: `${50 + value.y}%`,
            }}
          />
        </div>
      )}
    </div>
  );
}

export function LeatherConfigurator({
  value,
  onChange,
  design,
  signedIn,
  onBusy,
  dimensions,
  onPreviewChange,
}: {
  value: LeatherDesign;
  onChange: (value: LeatherDesign) => void;
  design: string;
  signedIn: boolean;
  onBusy: (busy: boolean) => void;
  dimensions?: string;
  onPreviewChange?: (preview: string) => void;
}) {
  const [preview, setPreview] = useState(''),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false),
    [back, setBack] = useState(false),
    [isPdf, setIsPdf] = useState(false);
  useEffect(() => {
    onPreviewChange?.(preview);
  }, [preview, onPreviewChange]);
  useEffect(
    () => () => {
      onPreviewChange?.('');
    },
    [onPreviewChange],
  );
  const [backgroundColor, setBackgroundColor] = useState('#ffffff');
  const [tolerance, setTolerance] = useState(30);
  const [backgroundRemoved, setBackgroundRemoved] = useState(false);
  const originalRef = useRef<{ blob: Blob; name: string } | null>(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const fileRef = useRef<Blob | null>(null),
    sequence = useRef(0);
  const update = (patch: Partial<LeatherDesign>) =>
    onChange({ ...value, ...patch });
  const originalName = useEffectEvent(() => value.fileName || 'logotipo');
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
        if (!originalRef.current)
          originalRef.current = { blob, name: originalName() };
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
  async function upload(file?: File, preserveOriginal = false) {
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
      if (!preserveOriginal) {
        originalRef.current = { blob: file, name: file.name };
        setBackgroundRemoved(false);
      }
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
  async function removeBackground() {
    const original = originalRef.current;
    if (!original || busy) return;
    setBusy(true);
    onBusy(true);
    setError('');
    try {
      const png = await removeLogoBackground(
        original.blob,
        backgroundColor,
        tolerance,
      );
      await upload(
        new File(
          [png],
          original.name.replace(/\.[^.]+$/, '') + '-sem-fundo.png',
          { type: 'image/png' },
        ),
        true,
      );
      setBackgroundRemoved(true);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : 'Não foi possível remover o fundo.',
      );
    } finally {
      setBusy(false);
      onBusy(false);
    }
  }
  async function restoreOriginal() {
    const original = originalRef.current;
    if (!original || busy) return;
    await upload(
      new File([original.blob], original.name, { type: original.blob.type }),
    );
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
                onClick={() =>
                  update({
                    color,
                    ...(color === 'black' && design === 'standard'
                      ? { logo: 'symbol' as const }
                      : {}),
                  })
                }
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
                <div className="leather-artwork-area">
                  <SourceImage
                    src={preview}
                    alt="Composição do logótipo carregado"
                    style={{
                      width: `${value.scale}%`,
                      height: `${value.scale}%`,
                      left: `${50 + value.x}%`,
                      top: `${50 + value.y}%`,
                    }}
                  />
                </div>
                <span>Composição do seu logótipo · área de gravação</span>
              </div>
            )}
            {preview && !isPdf && (
              <fieldset className="leather-background-controls" disabled={busy}>
                <legend>Remover fundo do logótipo</legend>
                <p>
                  Para fundos de cor uniforme. Escolha a cor e ajuste a
                  tolerância.
                </p>
                <label>
                  Cor do fundo{' '}
                  <input
                    type="color"
                    value={backgroundColor}
                    onChange={(e) => setBackgroundColor(e.target.value)}
                  />
                </label>
                <label>
                  Tolerância · {tolerance}
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={tolerance}
                    onChange={(e) => setTolerance(Number(e.target.value))}
                  />
                </label>
                <button type="button" onClick={() => void removeBackground()}>
                  <Eraser size={16} aria-hidden="true" />
                  {backgroundRemoved ? 'Ajustar remoção' : 'Remover fundo'}
                </button>
                {backgroundRemoved && (
                  <button type="button" onClick={() => void restoreOriginal()}>
                    <RotateCcw size={16} aria-hidden="true" />
                    Repor imagem original
                  </button>
                )}
                <small>
                  Resultado em PNG transparente, até 2048 px. Pode repor o
                  original durante esta edição. Confira os detalhes antes de
                  continuar.
                </small>
              </fieldset>
            )}
            {value.assetId && <p>Ficheiro guardado para produção.</p>}
            {preview && (
              <>
                <label>
                  Tamanho do logótipo · {value.scale}%
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
              className="leather-studio-object"
              style={{
                transform: `rotateX(${tilt.x}deg) rotateY(${tilt.y + (back ? 180 : 0)}deg)`,
              }}
            >
              <div className="leather-studio-face" aria-hidden={back}>
                <LeatherPreview
                  value={value}
                  design={design}
                  preview={preview}
                />
              </div>
              <div
                className="leather-studio-face leather-studio-reverse"
                aria-hidden={!back}
              >
                <LeatherPreview value={value} design={design} back />
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
          <button
            type="button"
            onClick={() => {
              setTilt({ x: 0, y: 0 });
              setBack(false);
            }}
          >
            <RotateCcw size={15} aria-hidden="true" /> Repor vista
          </button>
        </div>
        <figcaption>
          {back ? 'Verso com símbolo NFC' : 'Pré-visualização da frente'}
          {!back &&
            design === 'standard' &&
            value.color === 'black' &&
            value.logo === 'full' && (
              <small>
                Fotografia de referência com símbolo F. Seleccionou o logótipo
                completo; a fotografia dessa versão ainda não está disponível.
              </small>
            )}
          {!back && design !== 'standard' && (
            <small>
              {design === 'customer'
                ? 'Pré-visualização do seu logótipo sobre a fotografia do produto. '
                : 'Frente disponível para o design da equipa. '}
              A equipa confirma a arte e o acabamento antes da produção.
            </small>
          )}
        </figcaption>
      </figure>
    </section>
  );
}
