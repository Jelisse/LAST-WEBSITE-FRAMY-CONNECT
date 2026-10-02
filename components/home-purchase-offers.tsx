import Link from '@/components/hard-link';
import { ProductMaterialGallery } from './product-material-gallery';
import type { ProductPhoto } from '@/lib/product-gallery';
import { cardArtwork } from '@/lib/card-artwork';
import { pvcModels, pvcPhoto } from '@/lib/pvc-models';
import { ArrowUpRight } from 'lucide-react';
import { getTranslations } from '@/lib/server-i18n';
import { type Product } from '@/lib/catalog';
import { hardwareEstimate, hardwarePrices } from '@/lib/hardware-pricing';
import { type PurchaseFormat } from '@/lib/purchase-structure';

export async function HomePurchaseOffers({
  products,
  checkoutAvailable = false,
}: {
  products: Product[];
  checkoutAvailable?: boolean;
}) {
  const t = await getTranslations();
  const prices = hardwarePrices(products);
  const published = (id: string) =>
    products.some(
      (product) => product.id === id && product.published !== false,
    );
  // Homepage photography is independent of the customer's configurator selection.
  const cards: ProductPhoto[] = [
    ...['PVC', 'Madeira', 'Metal'].flatMap((material) =>
      (['front', 'back'] as const).map((cardSide, side) => ({
        id: `card-${material}-${cardSide}`,
        material,
        src: cardArtwork[material][side],
        cardSide,
        detail: `${t(material)} · ${t(side ? 'Verso' : 'Frente')}`,
      })),
    ),
    {
      id: 'card-orange-packaging',
      material: 'Cartão NFC',
      src: '/home/card-packaging-orange-cutout.webp',
      detail: `${t('Embalagens do cartão · imagens ilustrativas')} · ${t('Laranja')}`,
    },
    {
      id: 'card-black-packaging',
      material: 'Cartão NFC',
      src: '/home/card-packaging-black-cutout.webp',
      detail: `${t('Embalagens do cartão · imagens ilustrativas')} · ${t('Preto')}`,
    },
  ];
  const kit: ProductPhoto[] = [
    {
      id: 'kit-gift-box',
      material: 'Kit: cartão + porta-chaves',
      src: '/home/kit-gift-box-cutout.webp',
      detail: t('Preto'),
    },
    {
      id: 'kit-white-orange',
      material: 'Kit: cartão + porta-chaves',
      src: '/home/kit-white-orange-cutout.webp',
      detail: `${t('Branco')} · ${t('Laranja')} · ${t('Simulação ilustrativa')}`,
    },
  ];
  const keychains: ProductPhoto[] = published('keychain')
    ? pvcModels.flatMap((model) =>
        [false, true].map((back) => ({
          id: `${model.id}-${back ? 'back' : 'front'}`,
          material: 'PVC + epóxi',
          src: pvcPhoto(model.id, back),
          detail: `${t(model.name)} · ${t(back ? 'Verso' : 'Frente')}`,
        })),
      )
    : [];
  const offers: {
    id: PurchaseFormat;
    name: string;
    detail: string;
  }[] = [
    {
      id: 'card',
      name: 'Cartão NFC',
      detail: 'Partilhe contactos em reuniões, eventos e atendimentos.',
    },
    {
      id: 'kit',
      name: 'Kit: cartão + porta-chaves',
      detail:
        'Use o cartão nas reuniões e o porta-chaves no dia a dia. Ambos abrem o mesmo perfil.',
    },
    {
      id: 'keychain',
      name: 'Porta-chaves NFC',
      detail: 'Partilhe contactos com um produto que leva junto às chaves.',
    },
  ];
  return (
    <section className="home-products home-solutions" id="produtos">
      <div className="home-section-heading">
        <div>
          <span className="home-solution-eyebrow">
            {t('CARTÕES E PORTA-CHAVES NFC')}
          </span>
          <h2>{t('Escolha o seu cartão, porta-chaves ou kit')}</h2>
          <p>
            {t(
              'Produto: pagamento único. Perfil digital: plano mensal, com uma única subscrição para o cartão e o porta-chaves.',
            )}
          </p>
        </div>
      </div>
      {!checkoutAvailable && (
        <p className="home-solution-notice">
          {t(
            'Compras temporariamente indisponíveis. Pode consultar os produtos e simular a configuração.',
          )}
        </p>
      )}
      <div className="home-solutions-grid">
        {offers.map((offer) => {
          const estimate = hardwareEstimate(
            prices,
            offer.id,
            'PVC',
            'PVC + epóxi',
          );
          return (
            <article
              className={`home-solution${offer.id === 'kit' ? ' is-recommended' : ''}`}
              key={offer.id}
            >
              <div className="home-solution-label">
                {offer.id === 'kit'
                  ? t('Recomendado · dois produtos, um perfil')
                  : t('Disponível em separado')}
              </div>
              <ProductMaterialGallery
                name={t(offer.name)}
                frames={
                  offer.id === 'card'
                    ? cards.map((photo) => [photo])
                    : offer.id === 'keychain'
                      ? keychains.map((photo) => [photo])
                      : kit.map((photo) => [photo])
                }
              />
              <div className="home-solution-copy">
                <h3>{t(offer.name)}</h3>
                <p>{t(offer.detail)}</p>
                <div className="home-solution-price">
                  {estimate && (
                    <span className="home-starting-price">
                      {t('A partir de')}
                    </span>
                  )}
                  <strong>
                    {estimate
                      ? new Intl.NumberFormat(t.locale, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        }).format(estimate.amount / 100) + ' MT'
                      : t('Preço a confirmar')}
                  </strong>
                  <span>{t('Pagamento único · plano digital à parte')}</span>
                </div>
                <ul className="home-solution-included">
                  <li>{t('Design FramyConnect incluído.')}</li>
                  <li>{t('O seu design em PDF vectorial.')}</li>
                  <li>{t('Design criado pela nossa equipa.')}</li>
                </ul>
                <Link
                  className={
                    offer.id === 'kit' ? 'home-primary' : 'home-secondary'
                  }
                  href={`/comprar?formato=${offer.id}`}
                >
                  {t(
                    offer.id === 'card'
                      ? 'Configurar cartão'
                      : offer.id === 'kit'
                        ? 'Configurar kit'
                        : 'Configurar porta-chaves',
                  )}
                  <ArrowUpRight size={18} />
                </Link>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
