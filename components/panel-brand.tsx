import Link from './hard-link';
import { SourceImage } from './source-image';
export function PanelBrand() {
  return <Link href="/" className="panel-brand" aria-label="Framy Connect"><SourceImage src="/brand/logo.svg" alt="Framy Connect" width={130} height={60} /></Link>;
}
