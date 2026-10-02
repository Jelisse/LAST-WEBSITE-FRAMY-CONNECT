'use client';
import { SourceImage } from './source-image';
import { useI18n } from './language-provider';

export const cardArtwork: Record<string, [string, string]> = {
  PVC: [
    '/products/cards/orange-front.webp',
    '/products/cards/orange-back.webp',
  ],
  Madeira: [
    '/products/cards/wood-front.webp',
    '/products/cards/wood-back.webp',
  ],
  Metal: ['/home/solange-card-front.webp', '/home/angela-card.webp'],
};

export function CardMaterialImage({
  material,
  back,
}: {
  material: string;
  back: boolean;
}) {
  const { t } = useI18n();
  const sources = cardArtwork[material];
  if (!sources) return null;
  return (
    <span className="card-material-art">
      <span className="card-material-surface" data-material={material}>
        <SourceImage
          src={sources[back ? 1 : 0]}
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
