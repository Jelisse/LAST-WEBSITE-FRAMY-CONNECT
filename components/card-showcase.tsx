import { getTranslations } from '@/lib/server-i18n';
import { SourceImage } from '@/components/source-image';
import { cardArtwork, cardArtworkUrl } from '@/lib/card-art';
export async function CardShowcase() {
  const t = await getTranslations();
  return (
    <div className="card-showcase">
      <SourceImage
        src={cardArtworkUrl(cardArtwork({ theme: 'navy-gold', side: 'front' }))}
        alt={t('Frente do cartão Framy em azul-marinho e dourado')}
      />
      <SourceImage
        src={cardArtworkUrl(cardArtwork({ theme: 'navy-gold', side: 'back' }))}
        alt={t('Verso do cartão com espaço para nome, email e QR do perfil')}
      />
    </div>
  );
}
