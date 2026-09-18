'use client';
import { useI18n } from '@/components/language-provider';

import { useRef, useState } from 'react';
import Image from 'next/image';
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
  async function upload(file?: File) {
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
      onChange({ ...profile, photoUrl: result.photoUrl, photoPosition: 35 });
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
              objectFit: 'cover',
              objectPosition: `center ${profile.photoPosition ?? 35}%`,
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
            'Use um retrato vertical. A fotografia preenche o topo do seu perfil.',
          )}
        </p>
        <input
          ref={input}
          type="file"
          className="sr-only"
          aria-label={t('Escolher fotografia de perfil')}
          accept="image/jpeg,image/png,image/webp"
          disabled={disabled || uploading}
          onChange={(event) => {
            void upload(event.target.files?.[0]);
          }}
        />
        <div>
          <Button
            type="button"
            variant="outline"
            disabled={disabled || uploading}
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
              variant="ghost"
              disabled={disabled || uploading}
              onClick={() =>
                onChange({ ...profile, photoUrl: '', photoPosition: 35 })
              }
            >
              <X size={16} />
              {t(' Remover')}
            </Button>
          )}
        </div>
        <small>{t('JPG, PNG ou WebP · até 5 MB')}</small>
        {profile.photoUrl && (
          <div>
            <span id="photo-position-label">{t('Enquadramento vertical')}</span>
            <Slider
              aria-labelledby="photo-position-label"
              min={0}
              max={100}
              step={1}
              value={[profile.photoPosition ?? 35]}
              disabled={disabled || uploading}
              onValueChange={(value) =>
                onChange({
                  ...profile,
                  photoPosition: Array.isArray(value) ? value[0] : value,
                })
              }
            />
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
