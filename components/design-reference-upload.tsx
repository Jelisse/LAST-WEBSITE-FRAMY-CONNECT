'use client';
import { useRef, useState } from 'react';
import { Upload, FileText, X } from 'lucide-react';
import { useI18n } from './language-provider';
import { SourceImage } from './source-image';
import type { DesignReferences } from '@/lib/design-references';
export function DesignReferenceUpload({
  value,
  onChange,
  onBusy,
  ready,
}: {
  value: DesignReferences;
  onChange: (value: DesignReferences) => void;
  onBusy: (busy: boolean) => void;
  ready: boolean;
}) {
  const { t } = useI18n();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const field = useRef<HTMLInputElement>(null);
  async function upload(files: FileList | null) {
    if (!files?.length) return;
    if (files.length + value.assets.length > 3) {
      setError(t('Adicione até 3 referências.'));
      return;
    }
    setBusy(true);
    onBusy(true);
    setError('');
    let assets = [...value.assets];
    try {
      for (const file of Array.from(files)) {
        if (file.size > 8 * 1024 * 1024) throw Error(t('Máximo: 8 MB.'));
        if (!['image/png', 'image/jpeg', 'application/pdf'].includes(file.type))
          throw Error(t('Use PDF, PNG ou JPG.'));
        const response = await fetch('/api/design-assets', {
          method: 'POST',
          headers: { 'Content-Type': file.type },
          body: file,
        });
        const data = (await response.json()) as { id: string; error?: string };
        if (!response.ok)
          throw Error(data.error || t('Não foi possível guardar o ficheiro.'));
        assets = [
          ...assets,
          { assetId: data.id, fileName: file.name.slice(0, 150) },
        ];
        onChange({ ...value, assets });
      }
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : t('Não foi possível guardar o ficheiro.'),
      );
    } finally {
      setBusy(false);
      onBusy(false);
      if (field.current) field.current.value = '';
    }
  }
  return (
    <section
      className="design-reference-upload"
      aria-label={t('Referências de inspiração')}
    >
      <h3>
        {t('Referências de inspiração')} <small>{t('Opcional')}</small>
      </h3>
      <p>
        {t(
          'Adicione um exemplo ou imagem de inspiração. Estes ficheiros orientam a equipa; não são a arte final para impressão.',
        )}
      </p>
      <label className="artwork-dropzone">
        <Upload size={22} aria-hidden="true" />
        <strong>{t('Adicionar referências')}</strong>
        <span>
          {t('Até 3 ficheiros · PNG, JPG ou PDF · 8 MB por ficheiro')}
        </span>
        <input
          ref={field}
          type="file"
          multiple
          accept="image/png,image/jpeg,application/pdf"
          disabled={busy || !ready || value.assets.length >= 3}
          onChange={(e) => void upload(e.target.files)}
        />
      </label>
      {!ready && <output>{t('A preparar o carregamento seguro…')}</output>}
      {busy && <output>{t('A guardar referências…')}</output>}
      {error && (
        <p role="alert" className="flow-inline-error">
          {error}
        </p>
      )}
      <ul className="design-reference-list">
        {value.assets.map((asset) => (
          <li key={asset.assetId}>
            {/\.pdf$/i.test(asset.fileName) ? (
              <FileText size={30} aria-hidden="true" />
            ) : (
              <SourceImage
                src={'/api/design-assets/' + asset.assetId}
                alt={asset.fileName}
                width={100}
                height={80}
              />
            )}
            <span>
              {asset.fileName}
              <small>{t('Referência guardada')}</small>
            </span>
            <button
              type="button"
              disabled={busy}
              aria-label={t('Remover referência: {0}', [asset.fileName])}
              onClick={() =>
                onChange({
                  ...value,
                  assets: value.assets.filter(
                    (item) => item.assetId !== asset.assetId,
                  ),
                })
              }
            >
              <X size={18} />
            </button>
          </li>
        ))}
      </ul>
      <label>
        {t('Link de referência (opcional)')}
        <input
          type="url"
          value={value.url}
          maxLength={1000}
          placeholder="https://"
          disabled={busy}
          onChange={(e) => onChange({ ...value, url: e.target.value })}
        />
      </label>
    </section>
  );
}
