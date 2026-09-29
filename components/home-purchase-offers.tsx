import Link from '@/components/hard-link';
import { SourceImage } from './source-image';
import { ArrowUpRight } from 'lucide-react';
import { getTranslations } from '@/lib/server-i18n';
import { money, type Product } from '@/lib/catalog';
import { hardwareEstimate, hardwarePrices } from '@/lib/hardware-pricing';
import { designServices, type PurchaseFormat } from '@/lib/purchase-structure';

export async function HomePurchaseOffers({
  products,
}: {
  products: Product[];
}) {
  const t = await getTranslations();
  const prices = hardwarePrices(products);
  const photo = (id: string) =>
    products.find((p) => p.id === id && p.published !== false)?.imageUrl;
  const offers: {
    id: PurchaseFormat;
    name: string;
    detail: string;
    materials: string;
    photos: string[];
  }[] = [
    {
      id: 'card',
      name: 'Cartão NFC',
      detail: 'Partilhe contactos em reuniões, eventos e atendimentos.',
      materials: 'PVC · Madeira · Metal',
      photos: ['pvc'],
    },
    {
      id: 'kit',
      name: 'Kit: cartão + porta-chaves',
      detail: 'Use o cartão nas reuniões e o porta-chaves no dia a dia. Ambos abrem o mesmo perfil.',
      materials: 'Cartão PVC + porta-chaves PVC com epóxi',
      photos: ['pvc', 'keychain'],
    },
    {
      id: 'keychain',
      name: 'Porta-chaves NFC',
      detail: 'Partilhe contactos com um produto que leva junto às chaves.',
      materials: 'PVC com epóxi · Couro',
      photos: ['keychain'],
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
      <p className="home-solution-notice">
        {t(
          'Compras temporariamente indisponíveis. Pode consultar os produtos e simular a configuração.',
        )}
      </p>
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
              <div
                className={`home-solution-photo${offer.id === 'kit' ? ' is-pair' : ''}`}
              >
                {offer.photos.map((id) =>
                  photo(id) ? (
                    <SourceImage
                      key={id}
                      src={photo(id)!}
                      alt={t(
                        id === 'pvc' ? 'Cartão NFC em PVC' : 'Porta-chaves NFC',
                      )}
                      width={600}
                      height={600}
                      sizes="(max-width: 700px) 90vw, 400px"
                      loading="lazy"
                    />
                  ) : (
                    <div className="home-photo-placeholder" key={id}>
                      {t('Fotografia do produto em preparação')}
                    </div>
                  ),
                )}
              </div>
              <div className="home-solution-copy">
                <h3>{t(offer.name)}</h3>
                <p>{t(offer.detail)}</p>
                <p className="home-solution-materials">{t(offer.materials)}</p>
                <div className="home-solution-price">
                  <strong>
                    {estimate
                      ? money(estimate.amount, t.locale)
                      : t('Preço a confirmar')}
                  </strong>
                  <span>{t('Pagamento único · versão PVC')}</span>
                </div>
                {!!estimate?.saving && (
                  <p className="home-solution-saving">
                    {t('Poupa {0} face aos produtos separados.', [
                      money(estimate.saving, t.locale),
                    ])}
                  </p>
                )}
                <p className="home-solution-included">
                  {t('Design FramyConnect incluído.')}
                </p>
                <Link
                  className={
                    offer.id === 'kit' ? 'home-primary' : 'home-secondary'
                  }
                  href={`/comprar?formato=${offer.id}`}
                >
                  {t('Ver opções')}
                  <ArrowUpRight size={18} />
                </Link>
              </div>
            </article>
          );
        })}
      </div>
      <p className="home-disclosure">
        {t(
          'O preço apresentado corresponde à versão PVC. Outros materiais, personalização e entrega podem alterar o total.',
        )}
      </p>
      <div className="home-design-heading">
        <h3>{t('Escolha o design do seu produto')}</h3>
        <p>{t('Três opções de design para cartões e porta-chaves.')}</p>
      </div>
      <div className="home-design-options">
        {designServices.map((service, index) => (
          <article key={service.id}>
            <span>{String(index + 1).padStart(2, '0')}</span>
            <h4>{t(service.name)}</h4>
            <p>{t(service.description)}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
