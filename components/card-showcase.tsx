import { cardArtwork, cardArtworkUrl } from '@/lib/card-art';
export function CardShowcase() {
  return (
    <div className="card-showcase">
      <img
        src={cardArtworkUrl(cardArtwork({ theme: 'navy-gold', side: 'front' }))}
        alt="Frente do cartão Framy em azul-marinho e dourado"
      />
      <img
        src={cardArtworkUrl(cardArtwork({ theme: 'navy-gold', side: 'back' }))}
        alt="Verso do cartão com espaço para nome, email e QR do perfil"
      />
    </div>
  );
}
