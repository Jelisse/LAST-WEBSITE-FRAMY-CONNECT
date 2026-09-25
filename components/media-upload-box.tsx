'use client';
import { useRef, useState, type ReactNode } from 'react';
import Image from 'next/image';
import {
  Camera,
  FileImage,
  FileText,
  Upload,
  X,
  LoaderCircle,
} from 'lucide-react';
import { useI18n } from './language-provider';
export function MediaUploadBox({
  title,
  hint,
  src,
  mediaType = 'image',
  fileName,
  accept,
  multiple = false,
  capture,
  disabled = false,
  onFiles,
  onRemove,
}: {
  title: string;
  hint?: ReactNode;
  src?: string;
  mediaType?: 'image' | 'video' | 'file';
  fileName?: string;
  accept: string;
  multiple?: boolean;
  capture?: 'user' | 'environment';
  disabled?: boolean;
  onFiles: (files: File[]) => void | Promise<void>;
  onRemove?: () => void;
}) {
  const { t } = useI18n();
  const picker = useRef<HTMLInputElement>(null),
    camera = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState(false);
  async function choose(input: HTMLInputElement) {
    const files = Array.from(input.files ?? []);
    input.value = '';
    if (!files.length) return;
    setPending(true);
    try {
      await onFiles(files);
    } finally {
      setPending(false);
    }
  }
  const locked = disabled || pending;
  return (
    <section
      className="media-upload-box"
      aria-label={title}
      aria-busy={pending}
    >
      <div className="media-upload-preview">
        {src && mediaType === 'video' ? (
          <video
            src={src}
            controls
            muted
            playsInline
            preload="metadata"
            aria-label={title}
          />
        ) : src && mediaType === 'image' ? (
          <Image src={src} alt={title} width={360} height={220} unoptimized />
        ) : (
          <div className="media-upload-empty">
            {mediaType === 'file' ? (
              <FileText size={32} />
            ) : (
              <FileImage size={32} />
            )}
            <span>{fileName || t('Pré-visualização')}</span>
          </div>
        )}
        {pending && (
          <output className="media-upload-progress">
            <LoaderCircle size={18} />
            {t('A carregar…')}
          </output>
        )}
      </div>
      <div className="media-upload-controls">
        <h3>{title}</h3>
        {fileName && src && (
          <small className="media-upload-filename">{fileName}</small>
        )}
        {hint && <small>{hint}</small>}
        <input
          ref={picker}
          className="sr-only"
          type="file"
          accept={accept}
          multiple={multiple}
          disabled={locked}
          aria-label={title}
          onChange={(e) => void choose(e.currentTarget)}
        />
        {capture && (
          <input
            ref={camera}
            className="sr-only"
            type="file"
            accept="image/*"
            capture={capture}
            disabled={locked}
            aria-label={t('Tirar fotografia')}
            onChange={(e) => void choose(e.currentTarget)}
          />
        )}
        <div className="media-upload-actions">
          <button
            type="button"
            disabled={locked}
            onClick={() => picker.current?.click()}
          >
            <Upload size={17} aria-hidden="true" />
            {t(
              multiple
                ? 'Adicionar fotografias'
                : src || fileName
                  ? 'Substituir ficheiro'
                  : 'Escolher ficheiro',
            )}
          </button>
          {capture && (
            <button
              type="button"
              disabled={locked}
              onClick={() => camera.current?.click()}
            >
              <Camera size={17} aria-hidden="true" />
              {t('Tirar fotografia')}
            </button>
          )}
          {onRemove && (src || fileName) && (
            <button type="button" disabled={locked} onClick={onRemove}>
              <X size={17} aria-hidden="true" />
              {t('Remover')}
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
