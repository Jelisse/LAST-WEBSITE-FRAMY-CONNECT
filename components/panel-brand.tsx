'use client';
import Link from './hard-link';
import { SourceImage } from './source-image';
import { useI18n } from './language-provider';
export function PanelBrand() {
  const { t } = useI18n();
  return <Link href="/" className="panel-brand" aria-label={t('Framy Connect')}><SourceImage src="/brand/logo.svg" alt={t('Framy Connect')} width={130} height={60} /></Link>;
}
