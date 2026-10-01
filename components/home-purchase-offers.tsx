import Link from '@/components/hard-link';
import { ProductMaterialGallery } from './product-material-gallery';
import { productPhotos } from '@/lib/product-gallery';
import { ArrowUpRight } from 'lucide-react';
import { getTranslations } from '@/lib/server-i18n';
import { money, type Product } from '@/lib/catalog';
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
  const photos = productPhotos(products);
  const cards = photos.filter((photo) => ['pvc', 'wood', 'metal'].includes(photo.id));
  const keychains = photos.filter((photo) => ['keychain', 'keychain-leather'].includes(photo.id));
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
      detail: 'Use o cartão nas reuniões e o porta-chaves no dia a dia. Ambos abrem o mesmo perfil.',
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
      {!checkoutAvailable && <p className="home-solution-notice">
        {t(
          'Compras temporariamente indisponíveis. Pode consultar os produtos e simular a configuração.',
        )}
      </p>}
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
              <ProductMaterialGallery name={t(offer.name)} frames={
                offer.id === 'card' ? cards.map((photo) => [photo]) :
                offer.id === 'keychain' ? keychains.map((photo) => [photo]) :
                cards.flatMap((card) => keychains.map((keychain) => [card, keychain]))
              } />
              <div className="home-solution-copy">
                <h3>{t(offer.name)}</h3>
                <p>{t(offer.detail)}</p>
                <div className="home-solution-price">
                  {estimate && <span className="home-starting-price">{t('A partir de')}</span>}
                  <strong>
                    {estimate
                      ? money(estimate.amount, t.locale)
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
                  {t(offer.id === 'card' ? 'Configurar cartão' : offer.id === 'kit' ? 'Configurar kit' : 'Configurar porta-chaves')}
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
