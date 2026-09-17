import { SourceImage } from '@/components/source-image';
import { cardArtwork, cardArtworkUrl } from '@/lib/card-art';
export function CardShowcase() {
  return (
    <div className="card-showcase">
      <SourceImage
        src={cardArtworkUrl(cardArtwork({ theme: 'navy-gold', side: 'front' }))}
        alt="Frente do cartão Framy em azul-marinho e dourado"
      />
      <SourceImage
        src={cardArtworkUrl(cardArtwork({ theme: 'navy-gold', side: 'back' }))}
        alt="Verso do cartão com espaço para nome, email e QR do perfil"
      />
    </div>
  );
}
