'use client';
import { useI18n } from '@/components/language-provider';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { PortraitBackground } from './portrait-background';
import { portraitShapes, portraitPatterns } from '@/lib/portrait-design';
import { Camera, Upload, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import type { Profile } from '@/lib/domain';
export function ProfilePhotoUpload({
  profile,
  disabled,
  onChange,
  onUploading,
}: {
  profile: Profile;
  disabled: boolean;
  onChange: (profile: Profile) => void;
  onUploading: (uploading: boolean) => void;
}) {
  const { t } = useI18n();
  const input = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false),
    [error, setError] = useState('');
  const [matting, setMatting] = useState('');
  const [cutout, setCutout] = useState<{ photo: Blob; url: string } | null>(
    null,
  );
  const worker = useRef<Worker | null>(null);
  const original = useRef<Profile | null>(null);
  useEffect(() => () => worker.current?.terminate(), []);
  useEffect(
    () => () => {
      if (cutout) URL.revokeObjectURL(cutout.url);
    },
    [cutout],
  );
  async function removeBackground() {
    if (!profile.photoUrl) return;
    setError('');
    setMatting('A preparar a remoção do fundo…');
    onUploading(true);
    try {
      const response = await fetch(profile.photoUrl);
      if (!response.ok) throw Error('Não foi possível abrir a fotografia.');
      const photo = await response.blob();
      const task = new Worker('/portrait-model/worker/portrait-worker.js', {
        type: 'module',
      });
      worker.current = task;
      const result = await new Promise<Blob>((resolve, reject) => {
        const timeout = window.setTimeout(() => {
          task.terminate();
          reject(
            Error('A remoção demorou demasiado. Tente uma fotografia menor.'),
          );
        }, 180000);
        task.onmessage = (
          event: MessageEvent<{
            status: string;
            photo?: Blob;
            diagnostic?: string;
          }>,
        ) => {
          if (event.data.status === 'loading')
            setMatting('A carregar a ferramenta de retrato…');
          if (event.data.status === 'processing')
            setMatting('A remover o fundo…');
          if (
            event.data.status === 'complete' ||
            event.data.status === 'error'
          ) {
            if (event.data.diagnostic)
              console.error('Portrait matting:', event.data.diagnostic);
            window.clearTimeout(timeout);
            task.terminate();
            if (event.data.photo) resolve(event.data.photo);
            else
              reject(
                Error(
                  'Não foi possível remover o fundo. Pode carregar um PNG transparente.',
                ),
              );
          }
        };
        task.onerror = () => {
          window.clearTimeout(timeout);
          task.terminate();
          reject(Error('Não foi possível remover o fundo neste navegador.'));
        };
        task.postMessage({ photo });
      });
      if (result.size > 5 * 1024 * 1024)
        throw Error('A fotografia deve ter até 5 MB.');
      setCutout({ photo: result, url: URL.createObjectURL(result) });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Tente novamente.');
    } finally {
      setMatting('');
      onUploading(false);
      worker.current = null;
    }
  }
  async function upload(file?: File, isCutout = false) {
    if (!file) return;
    setError('');
    if (
      !['image/jpeg', 'image/png', 'image/webp'].includes(file.type) ||
      file.size > 5 * 1024 * 1024
    ) {
      setError('Escolha uma fotografia JPG, PNG ou WebP até 5 MB.');
      return;
    }
    setUploading(true);
    onUploading(true);
    try {
      const response = await fetch('/api/profile-photo', {
        method: 'POST',
        headers: { 'Content-Type': file.type },
        body: file,
      });
      const result = (await response.json()) as {
        photoUrl?: string;
        error?: string;
      };
      if (!response.ok || !result.photoUrl)
        throw new Error(result.error || 'Não foi possível carregar.');
      if (isCutout) original.current = profile;
      else original.current = null;
      onChange({
        ...profile,
        photoUrl: result.photoUrl,
        photoPosition: 35,
        photoPositionX: 50,
        photoCutout: isCutout,
        photoScale: 100,
      });
      setCutout(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Tente novamente.');
    } finally {
      setUploading(false);
      onUploading(false);
      if (input.current) input.current.value = '';
    }
  }
  return (
    <section className="photo-editor" aria-labelledby="photo-editor-title">
      <div className="photo-editor-thumbnail">
        {profile.photoUrl ? (
          <Image
            src={profile.photoUrl}
            alt={t('A sua fotografia')}
            fill
            unoptimized
            sizes="100px"
            style={{
              objectFit: profile.photoCutout ? 'contain' : 'cover',
              objectPosition: `${profile.photoPositionX ?? 50}% 35%`,
              transformOrigin: `${profile.photoPositionX ?? 50}% bottom`,
              transform: `translateY(${((profile.photoPosition ?? 35) - 35) * 0.6}%) scale(${(profile.photoScale ?? 100) / 100})`,
            }}
          />
        ) : (
          <Camera size={30} />
        )}
      </div>
      <div className="photo-editor-controls">
        <h3 id="photo-editor-title">{t('Fotografia de perfil')}</h3>
        <p>
          {t(
            'Use um retrato vertical. Remova o fundo para destacar a pessoa na forma do perfil.',
          )}
        </p>
        <input
          ref={input}
          type="file"
          className="sr-only"
          aria-label={t('Escolher fotografia de perfil')}
          accept="image/jpeg,image/png,image/webp"
          disabled={disabled || uploading || !!matting}
          onChange={(event) => {
            void upload(event.target.files?.[0]);
          }}
        />
        <div>
          <Button
            type="button"
            variant="outline"
            disabled={disabled || uploading || !!matting}
            onClick={() => input.current?.click()}
          >
            <Upload size={17} />
            {uploading
              ? t('A carregar…')
              : profile.photoUrl
                ? t('Alterar fotografia')
                : t('Carregar fotografia')}
          </Button>
          {profile.photoUrl && (
            <Button
              type="button"
              variant="outline"
              disabled={
                disabled || uploading || !!matting || profile.photoCutout
              }
              onClick={() => void removeBackground()}
            >
              {matting ? t(matting) : t('Remover fundo')}
            </Button>
          )}
          {original.current && (
            <Button
              type="button"
              variant="ghost"
              disabled={disabled || uploading || !!matting}
              onClick={() => {
                const saved = original.current;
                if (saved)
                  onChange({
                    ...profile,
                    photoUrl: saved.photoUrl,
                    photoCutout: saved.photoCutout,
                    photoScale: saved.photoScale,
                    photoPosition: saved.photoPosition,
                    photoPositionX: saved.photoPositionX,
                  });
                original.current = null;
              }}
            >
              {t('Restaurar fotografia original')}
            </Button>
          )}
          {profile.photoUrl && (
            <Button
              type="button"
              variant="ghost"
              disabled={disabled || uploading || !!matting}
              onClick={() =>
                onChange({
                  ...profile,
                  photoUrl: '',
                  photoPosition: 35,
                  photoPositionX: 50,
                  photoCutout: false,
                  photoScale: 100,
                })
              }
            >
              <X size={16} />
              {t(' Remover')}
            </Button>
          )}
        </div>
        <small>{t('JPG, PNG ou WebP · até 5 MB')}</small>
        <small>
          {t(
            'A remoção do fundo acontece no seu dispositivo. A primeira utilização descarrega a ferramenta de retrato.',
          )}
        </small>
        {cutout && (
          <div className="portrait-cutout-review">
            <img src={cutout.url} alt={t('Pré-visualização sem fundo')} />
            <p>{t('Confira os contornos antes de aplicar.')}</p>
            <Button
              type="button"
              disabled={disabled || uploading}
              onClick={() =>
                void upload(
                  new File([cutout.photo], 'portrait.png', {
                    type: 'image/png',
                  }),
                  true,
                )
              }
            >
              {t('Usar fotografia sem fundo')}
            </Button>
            <Button
              type="button"
              variant="ghost"
              disabled={uploading}
              onClick={() => setCutout(null)}
            >
              {t('Cancelar')}
            </Button>
          </div>
        )}
        {profile.photoUrl && (
          <div>
            <span id="photo-position-label">{t('Enquadramento vertical')}</span>
            <Slider
              aria-labelledby="photo-position-label"
              min={0}
              max={100}
              step={1}
              value={[profile.photoPosition ?? 35]}
              disabled={disabled || uploading || !!matting}
              onValueChange={(value) =>
                onChange({
                  ...profile,
                  photoPosition: Array.isArray(value) ? value[0] : value,
                })
              }
            />
            <span id="photo-horizontal-label">{t('Enquadramento horizontal')}</span>
            <Slider aria-labelledby="photo-horizontal-label" min={0} max={100} step={1}
              value={[profile.photoPositionX ?? 50]} disabled={disabled || uploading || !!matting}
              onValueChange={(value) => onChange({ ...profile, photoPositionX: Array.isArray(value) ? value[0] : value })} />
            <span id="photo-scale-label">{t('Tamanho da fotografia')}</span>
            <Slider
              aria-labelledby="photo-scale-label"
              min={75}
              max={150}
              step={1}
              value={[profile.photoScale ?? 100]}
              disabled={disabled || uploading || !!matting}
              onValueChange={(value) =>
                onChange({
                  ...profile,
                  photoScale: Array.isArray(value) ? value[0] : value,
                })
              }
            />
            <label className="photo-cutout-choice">
              <input
                type="checkbox"
                checked={profile.photoCutout ?? false}
                disabled={disabled || uploading || !!matting}
                onChange={(event) =>
                  onChange({ ...profile, photoCutout: event.target.checked })
                }
              />
              {t('Esta fotografia já tem fundo transparente')}
            </label>
            <fieldset className="portrait-design-controls" disabled={disabled || uploading || !!matting}>
              <legend>{t('Forma da fotografia')}</legend>
              <div className="portrait-shape-options">
                {portraitShapes.map((shape, i) => <button key={shape} type="button" aria-pressed={(profile.photoShape ?? 'framy') === shape}
                  onClick={() => onChange({ ...profile, photoShape: shape })}>
                  <PortraitBackground shape={shape} color="#e4773e" />{t(['Framy', 'Círculo', 'Quadrado arredondado'][i])}
                </button>)}
              </div>
              <label>{t('Cor do contorno')}
                <input type="color" value={profile.photoOutlineColor ?? '#ffffff'} onChange={(event) => onChange({ ...profile, photoOutlineColor: event.target.value })} />
              </label>
              <label>{t('Espessura do contorno')} <output>{profile.photoOutlineWidth ?? 3}</output>
                <input type="range" min="0" max="20" step="1" value={profile.photoOutlineWidth ?? 3} onChange={(event) => onChange({ ...profile, photoOutlineWidth: Number(event.target.value) })} />
              </label>
              <small>{t('Escolha zero para ocultar o contorno.')}</small>
              <p>{t('Fundo da fotografia')}</p>
              <div className="portrait-pattern-options">
                {portraitPatterns.map((pattern, i) => <button key={pattern} type="button" aria-pressed={(profile.photoPattern ?? 'solid') === pattern}
                  onClick={() => onChange({ ...profile, photoPattern: pattern })}>
                  <PortraitBackground shape="square" pattern={pattern} color={profile.photoShapeColor ?? '#e4773e'} ink={profile.photoPatternColor ?? '#ffffff'} />
                  {t(['Cor sólida', 'Ondas', 'Labirinto', 'Traços', 'Anéis', 'Meios-tons', 'Raios', 'Ziguezague', 'Folhas', 'Fitas', 'Losangos', 'Confetes', 'Pontos', 'Diagonais', 'Pétalas', 'Dividido'][i])}
                </button>)}
              </div>
              {profile.photoPattern && profile.photoPattern !== 'solid' && <>
                <label className="portrait-pattern-ink">{t('Cor do padrão')}
                  <input type="color" value={profile.photoPatternColor ?? '#ffffff'} onChange={(event) => onChange({ ...profile, photoPatternColor: event.target.value })} />
                </label>
                <label>{t('Tamanho do padrão')}
                  <input type="range" min="50" max="200" value={profile.photoPatternScale ?? 100} onChange={(event) => onChange({ ...profile, photoPatternScale: Number(event.target.value) })} />
                </label>
                <label>{t('Intensidade do padrão')}
                  <input type="range" min="0" max="100" value={profile.photoPatternStrength ?? 100} onChange={(event) => onChange({ ...profile, photoPatternStrength: Number(event.target.value) })} />
                </label>
              </>}
              {profile.photoCutout && <label className="photo-cutout-choice">
                <input type="checkbox" checked={profile.photoHeadEscape !== false} onChange={(event) => onChange({ ...profile, photoHeadEscape: event.target.checked })} />
                {t('Deixar a cabeça sair da forma')}
              </label>}
              <label>{t('Intensidade da luz exterior')}
                <input type="range" min="0" max="100" value={profile.photoGlowStrength ?? 32} onChange={(event) => onChange({ ...profile, photoGlowStrength: Number(event.target.value) })} />
              </label>
              <small>{t('Remova o fundo da fotografia para revelar o padrão atrás de si.')}</small>
            </fieldset>
            <div className="portrait-color-controls">
              <label>
                {t('Cor interior da forma')}
                <input type="color" value={profile.photoShapeColor ?? '#eeeef3'}
                  disabled={disabled || uploading || !!matting}
                  onChange={(event) => onChange({ ...profile, photoShapeColor: event.target.value })} />
              </label>
              <label>
                {t('Cor da luz e sombra exterior')}
                <input type="color" value={profile.photoGlowColor ?? '#c7885a'}
                  disabled={disabled || uploading || !!matting}
                  onChange={(event) => onChange({ ...profile, photoGlowColor: event.target.value })} />
              </label>
            </div>
          </div>
        )}
        {error && (
          <p role="alert" className="photo-error">
            {t(error)}
          </p>
        )}
      </div>
    </section>
  );
}
