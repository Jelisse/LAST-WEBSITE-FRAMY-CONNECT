import type { LeatherDesign } from '@/lib/leather-design';
import { SourceImage } from './source-image';
import { useI18n } from './language-provider';

/** Blank production surfaces keep customer artwork separate from reference photos. */
export function ProductArtworkPreview({ material, value, preview, back = false }: {
  material: string; value: LeatherDesign; preview?: string; back?: boolean;
}) {
  const { t } = useI18n();
  const pvc = material === 'PVC + epóxi';
  return <div className={`product-artwork product-artwork--${pvc ? 'keychain' : 'card'}`} data-material={material}>
    {pvc && <span className="product-artwork-hole" />}
    {back ? <div className="product-artwork-back"><strong>NFC</strong><span>{t('Um toque para conectar')}</span></div>
      : preview ? <SourceImage src={preview} alt={t('Pré-visualização do seu logótipo')} width={600} height={600}
        style={{ width: `${value.scale}%`, height: `${value.scale}%`, objectFit: 'contain', position: 'absolute', left: `${50 + value.x}%`, top: `${50 + value.y}%`, transform: 'translate(-50%, -50%)' }} />
      : <span className="product-artwork-placeholder">{t('O seu design')}</span>}
  </div>;
}
