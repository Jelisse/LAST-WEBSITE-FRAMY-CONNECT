'use client';
import { SourceImage } from './source-image';
import { useI18n } from './language-provider';

import { cardArtwork } from '@/lib/card-artwork';
export { cardArtwork } from '@/lib/card-artwork';

export function CardMaterialImage({
  material,
  back,
  eager = false,
}: {
  material: string;
  back: boolean;
  eager?: boolean;
}) {
  const { t } = useI18n();
  const sources = cardArtwork[material];
  if (!sources) return null;
  return (
    <span className="card-material-art">
      <span className="card-material-surface" data-material={material}>
        <SourceImage
          src={sources[back ? 1 : 0]}
          loading={eager ? 'eager' : 'lazy'}
          alt={`Angela Khossa · ${t(material)} · ${t(back ? 'Verso' : 'Frente')}`}
          width={600}
          height={960}
        />
        {back && (
          <SourceImage
            className="card-material-qr"
            src="/home/demo-profile-qr.svg"
            alt=""
            aria-hidden="true"
            width={256}
            height={256}
          />
        )}
      </span>
    </span>
  );
}
