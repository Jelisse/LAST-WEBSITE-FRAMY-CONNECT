'use client';
import { useRef, useState } from 'react';
import Image from 'next/image';
import { Camera, ImagePlus, Upload, X } from 'lucide-react';
import { useI18n } from './language-provider';
import { Button } from './ui/button';
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
  onUploading: (value: boolean) => void;
}) {
  const { t } = useI18n();
  const portraitInput = useRef<HTMLInputElement>(null),
    coverInput = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false),
    [error, setError] = useState('');
  async function upload(file: File | undefined, cover: boolean) {
    if (!file || uploading || disabled) return;
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
        signal: AbortSignal.timeout(45000),
      });
      const result = (await response.json()) as {
        photoUrl?: string;
        error?: string;
      };
      if (!response.ok || !result.photoUrl)
        throw Error(result.error || 'Não foi possível carregar.');
      onChange(
        cover
          ? { ...profile, coverUrl: result.photoUrl, coverPosition: 50 }
          : {
              ...profile,
              photoUrl: result.photoUrl,
              photoPosition: 50,
              photoPositionX: 50,
              photoScale: 100,
            },
      );
    } catch (e) {
      setError(
        e instanceof Error && e.name !== 'TimeoutError'
          ? e.message
          : 'Não foi possível carregar a fotografia. Tente novamente.',
      );
    } finally {
      setUploading(false);
      onUploading(false);
      if (portraitInput.current) portraitInput.current.value = '';
      if (coverInput.current) coverInput.current.value = '';
    }
  }
  return (
    <section
      className="portfolio-photo-editor"
      aria-label={t('Fotografia de perfil')}
    >
      <div className="portfolio-photo-editor-preview">
        <div className="portfolio-cover-preview">
          {profile.coverUrl ? (
            <Image
              src={profile.coverUrl}
              alt={t('Fotografia de capa')}
              fill
              unoptimized
              sizes="400px"
              style={{
                objectFit: 'cover',
                objectPosition: `50% ${profile.coverPosition ?? 50}%`,
              }}
            />
          ) : (
            <ImagePlus aria-hidden="true" />
          )}
        </div>
        <div className="portfolio-avatar-preview">
          {profile.photoUrl ? (
            <Image
              src={profile.photoUrl}
              alt={t('Fotografia de perfil')}
              fill
              unoptimized
              sizes="120px"
              style={{
                objectFit: 'cover',
                objectPosition: `${profile.photoPositionX ?? 50}% ${profile.photoPosition ?? 50}%`,
                transform: `scale(${(profile.photoScale ?? 100) / 100})`,
              }}
            />
          ) : (
            <Camera aria-hidden="true" />
          )}
        </div>
      </div>
      <div className="portfolio-photo-editor-controls">
        <input
          ref={portraitInput}
          hidden
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={(e) => void upload(e.target.files?.[0], false)}
        />
        <input
          ref={coverInput}
          hidden
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={(e) => void upload(e.target.files?.[0], true)}
        />
        <Button
          type="button"
          variant="outline"
          disabled={disabled || uploading}
          onClick={() => portraitInput.current?.click()}
        >
          <Upload size={16} />
          {t('Fotografia de perfil')}
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={disabled || uploading}
          onClick={() => coverInput.current?.click()}
        >
          <ImagePlus size={16} />
          {t('Fotografia de capa')}
        </Button>
        {uploading && <output>{t('A carregar…')}</output>}
        <small>{t('JPG, PNG ou WebP · até 5 MB')}</small>
        {profile.photoUrl && (
          <details className="photo-adjustments">
            <summary>{t('Ajustar fotografia de perfil')}</summary>
            <div className="photo-adjustment-fields">
              {(
                [
                  ['photoPositionX', 'Enquadramento horizontal', 0, 100, 50],
                  ['photoPosition', 'Enquadramento vertical', 0, 100, 50],
                  ['photoScale', 'Zoom da fotografia', 100, 150, 100],
                ] as const
              ).map(([key, label, min, max, fallback]) => (
                <label key={key}>
                  {t(label)}
                  <input
                    type="range"
                    min={min}
                    max={max}
                    disabled={disabled || uploading}
                    value={Math.max(min, profile[key] ?? fallback)}
                    onChange={(e) =>
                      onChange({ ...profile, [key]: Number(e.target.value) })
                    }
                  />
                </label>
              ))}
              <button
                type="button"
                disabled={disabled || uploading}
                onClick={() => onChange({ ...profile, photoUrl: '' })}
              >
                <X size={14} />
                {t('Remover fotografia')}
              </button>
            </div>
          </details>
        )}
        {profile.coverUrl && (
          <details className="photo-adjustments">
            <summary>{t('Ajustar fotografia de capa')}</summary>
            <div className="photo-adjustment-fields">
              <label>
                {t('Enquadramento da capa')}
                <input
                  type="range"
                  min="0"
                  max="100"
                  disabled={disabled || uploading}
                  value={profile.coverPosition ?? 50}
                  onChange={(e) =>
                    onChange({
                      ...profile,
                      coverPosition: Number(e.target.value),
                    })
                  }
                />
              </label>
              <button
                type="button"
                disabled={disabled || uploading}
                onClick={() => onChange({ ...profile, coverUrl: '' })}
              >
                <X size={14} />
                {t('Remover capa')}
              </button>
            </div>
          </details>
        )}
        {error && <p role="alert">{t(error)}</p>}
      </div>
    </section>
  );
}
