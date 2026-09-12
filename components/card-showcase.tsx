import { cardArtwork, cardArtworkUrl } from '@/lib/card-art';
export function CardShowcase() {
  return (
    <div className="card-showcase">
      <img
        src={cardArtworkUrl(cardArtwork({ theme: 'forest', side: 'front' }))}
        alt="Frente do cartão Framy em verde degradê"
      />
      <img
        src={cardArtworkUrl(cardArtwork({ theme: 'forest', side: 'back' }))}
        alt="Verso do cartão com espaço para nome, email e QR do perfil"
      />
    </div>
  );
}
