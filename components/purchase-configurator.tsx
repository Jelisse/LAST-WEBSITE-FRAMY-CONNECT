'use client';
import { useEffect, useState } from 'react';
import { readPurchaseDraft } from '@/lib/purchase-draft';
import Link from '@/components/hard-link';
import { useI18n } from './language-provider';
import {
  purchaseFormats,
  purchaseSelection,
  cardMaterials,
  keychainMaterials,
  designServices,
  checkoutMaintenanceMessage,
} from '@/lib/purchase-structure';
import { money } from '@/lib/catalog';
import { hardwareEstimate, type HardwarePrice } from '@/lib/hardware-pricing';
import { PaySuiteCheckout } from './paysuite-checkout';
import type { CheckoutPricing } from '@/lib/checkout-pricing';
import { SourceImage } from './source-image';
import type { ProductPhoto } from '@/lib/product-gallery';

export function PurchaseConfigurator({
  initial = 'kit',
  prices,
  photos = [],
  pricing = null,
  paymentAvailable = false,
  signedIn = false,
}: {
  initial?: string;
  prices: HardwarePrice[];
  photos?: ProductPhoto[];
  pricing?: CheckoutPricing | null;
  paymentAvailable?: boolean;
  signedIn?: boolean;
}) {
  const { t } = useI18n();
  const selection = purchaseSelection(initial);
  const format = selection.format;
  const [card, setCard] = useState<string>(selection.card);
  const [keychain, setKeychain] = useState<string>(selection.keychain);
  const [design, setDesign] = useState('standard');
  const method = 'PDF vectorial';
  const [contact, setContact] = useState('');
  const [address, setAddress] = useState('');
  const [delivery, setDelivery] = useState('maputo');
  const [designInstructions, setDesignInstructions] = useState('');
  const [draftReady, setDraftReady] = useState(false);
  useEffect(() => {
    let draft: ReturnType<typeof readPurchaseDraft> = null;
    try {
      draft = readPurchaseDraft(
        sessionStorage.getItem('framy-checkout:configuration:' + initial),
      );
    } catch {
      /* Optional restoration. */
    }
    queueMicrotask(() => {
      if (draft) {
        setCard(draft.card);
        setKeychain(draft.keychain);
        setDesign(draft.design);
        setDelivery(draft.delivery);
        setContact(draft.contact);
        setAddress(draft.address);
        setDesignInstructions(draft.designInstructions);
      }
      setDraftReady(true);
    });
  }, [initial]);
  useEffect(() => {
    if (!draftReady) return;
    try {
      sessionStorage.setItem(
        'framy-checkout:configuration:' + initial,
        JSON.stringify({
          version: 1,
          expires: Date.now() + 1800000,
          card,
          keychain,
          design,
          delivery,
          contact,
          address,
          designInstructions,
        }),
      );
    } catch {
      /* Checkout also works with browser storage disabled. */
    }
  }, [
    draftReady,
    initial,
    card,
    keychain,
    design,
    delivery,
    contact,
    address,
    designInstructions,
  ]);
  const selected = purchaseFormats.find((item) => item.id === format)!;
  const selectedDesign = designServices.find((item) => item.id === design)!;
  const estimate = hardwareEstimate(prices, format, card, keychain);
  const preview = [
    ...(format !== 'keychain' ? [card] : []),
    ...(format !== 'card' ? [keychain] : []),
  ];
  const designAmount = pricing
    ? design === 'standard'
      ? 0
      : design === 'customer'
        ? pricing.customer_design
        : pricing.team_design
    : null;
  const total =
    estimate && designAmount !== null && pricing && delivery === 'maputo'
      ? estimate.amount + designAmount + pricing.maputo_delivery
      : null;
  return (
    <div className="purchase-configurator">
      <ol className="checkout-journey" aria-label={t('Etapas da compra')}>
        <li aria-current="step">
          <span>1</span>
          <strong>{t('Produto e entrega')}</strong>
        </li>
        <li>
          <span>2</span>
          <strong>{t('Pagamento')}</strong>
        </li>
        <li>
          <span>3</span>
          <strong>{t('Configurar perfil')}</strong>
        </li>
      </ol>
      {!paymentAvailable && (
        <div className="purchase-maintenance">
          <strong>{t('Checkout em manutenção')}</strong>
          <p>{t(checkoutMaintenanceMessage)}</p>
          <p>
            {t(
              'Explore a nova configuração. Os preços e a disponibilidade serão confirmados antes da reabertura.',
            )}
          </p>
        </div>
      )}
      <div className="purchase-layout">
        <div>
          <fieldset className="purchase-section">
            <legend>{t('1. Materiais')}</legend>
            <div className="purchase-materials">
              {format !== 'keychain' && (
                <label>
                  {t('Cartão')}
                  <select
                    value={card}
                    onChange={(e) => setCard(e.target.value)}
                  >
                    {cardMaterials.map((item) => (
                      <option key={item} value={item}>
                        {t(item)}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              {format !== 'card' && (
                <label>
                  {t('Porta-chaves')}
                  <select
                    value={keychain}
                    onChange={(e) => setKeychain(e.target.value)}
                  >
                    {keychainMaterials.map((item) => (
                      <option key={item} value={item}>
                        {t(item)}
                      </option>
                    ))}
                  </select>
                </label>
              )}
            </div>
          </fieldset>
          <fieldset className="purchase-section">
            <legend>{t('2. Design')}</legend>
            <div className="purchase-choices">
              {designServices.map((item) => (
                <label
                  className={`purchase-choice ${design === item.id ? 'is-selected' : ''}`}
                  key={item.id}
                >
                  <input
                    type="radio"
                    name="design"
                    checked={design === item.id}
                    onChange={() => setDesign(item.id)}
                  />
                  <strong>{t(item.name)}</strong>
                  <p>{t(item.description)}</p>
                </label>
              ))}
            </div>
            {design !== 'standard' && (
              <label className="purchase-method">
                Instruções para o design
                <textarea
                  value={designInstructions}
                  onChange={(e) => setDesignInstructions(e.target.value)}
                  maxLength={2000}
                  placeholder="Nome, cores e informações a incluir"
                />
                <small>
                  Após o pedido, a equipa contacta-o para receber o PDF
                  vectorial ou preparar o design. O editor online ainda não está
                  disponível. A produção começa após a sua aprovação.
                </small>
              </label>
            )}
          </fieldset>
          <section className="purchase-section">
            <h2>{t('3. Entrega')}</h2>
            <label>
              Local de entrega
              <select
                value={delivery}
                onChange={(e) => setDelivery(e.target.value)}
              >
                <option value="maputo">Cidade de Maputo</option>
                <option value="other">Outra localidade — sob consulta</option>
              </select>
            </label>
            {delivery === 'other' ? (
              <p>
                <Link href="/contacto">Solicitar proposta de entrega</Link>
              </p>
            ) : (
              <>
                <label>
                  Contacto de entrega
                  <input
                    value={contact}
                    onChange={(e) => setContact(e.target.value)}
                    maxLength={50}
                    autoComplete="tel"
                  />
                </label>
                <label>
                  Morada e ponto de referência
                  <textarea
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    maxLength={300}
                    autoComplete="street-address"
                  />
                </label>
              </>
            )}
          </section>
        </div>
        <aside
          className="configuration-summary"
          aria-label={t('A sua configuração')}
        >
          <h2>{t('A sua configuração')}</h2>
          <div className="configuration-photos">
            {preview.map((material) => {
              const photo = photos.find((item) => item.material === material);
              return (
                <figure key={material}>
                  {photo ? (
                    <SourceImage
                      src={photo.src}
                      alt={t(material)}
                      width={240}
                      height={240}
                    />
                  ) : (
                    <span>{t('Fotografia do produto em preparação')}</span>
                  )}
                  <figcaption>{t(material)}</figcaption>
                </figure>
              );
            })}
          </div>
          <div aria-live="polite">
            <h3>{t(selected.name)}</h3>
            {format !== 'keychain' && (
              <p>
                {t('Cartão')}: {t(card)}
              </p>
            )}
            {format !== 'card' && (
              <p>
                {t('Porta-chaves')}: {t(keychain)}
              </p>
            )}
            <p>
              {t(selectedDesign.name)}
              {design === 'customer' ? ` · ${t(method)}` : ''}
            </p>
          </div>
          <hr />
          <p>
            <strong>{t('Produtos · pagamento único')}</strong>
            <br />
            <span aria-live="polite">
              {estimate
                ? money(estimate.amount, t.locale)
                : t('Preço a confirmar')}
            </span>
          </p>
          {!!estimate?.saving && (
            <p>
              {t('Poupa {0} face aos produtos separados.', [
                money(estimate.saving, t.locale),
              ])}
            </p>
          )}
          <p>
            Design:{' '}
            {designAmount === null
              ? 'Sob consulta'
              : money(designAmount, t.locale)}
          </p>
          <p>
            Entrega:{' '}
            {pricing && delivery === 'maputo'
              ? money(pricing.maputo_delivery, t.locale)
              : 'Sob consulta'}
          </p>
          <p className="purchase-total">
            <strong>
              Total a pagar:{' '}
              {total === null ? 'Sob consulta' : money(total, t.locale)}
            </strong>
          </p>
          <div className="purchase-next-step">
            <strong>{t('O perfil fica para depois do pagamento')}</strong>
            <p>
              {t(
                'Após a confirmação, crie o seu perfil ou continue com o que já tem. O cartão e o porta-chaves podem partilhar o mesmo perfil.',
              )}
            </p>
            <small>
              {t(
                'A compra do produto não inclui uma subscrição paga nem renova a experiência gratuita.',
              )}
            </small>
          </div>
          {!paymentAvailable && (
            <p>
              Valores propostos, sujeitos a publicação pelo gestor. Pagamentos
              ainda indisponíveis.
            </p>
          )}
          {!signedIn && (
            <div className="purchase-signin">
              <p>
                {t(
                  'Entre ou crie uma conta para guardar a encomenda. O perfil será configurado depois do pagamento.',
                )}
              </p>
              <Link
                className="btn btn-primary"
                href={
                  '/entrar?return_to=' +
                  encodeURIComponent('/comprar?formato=' + initial)
                }
              >
                {t('Entrar ou criar conta para continuar')}
              </Link>
            </div>
          )}
          {signedIn &&
            paymentAvailable &&
            total !== null &&
            (contact.trim().length < 7 || address.trim().length < 8) && (
              <p className="purchase-help">
                {t('Preencha o contacto e a morada para continuar.')}
              </p>
            )}
          <PaySuiteCheckout
            key={`${format}-${card}-${keychain}-${design}-${delivery}-${total}`}
            disabled={
              !draftReady ||
              !signedIn ||
              !paymentAvailable ||
              total === null ||
              contact.trim().length < 7 ||
              address.trim().length < 8
            }
            payload={{
              kind: 'product',
              format,
              card,
              keychain,
              design,
              delivery,
              contact,
              address,
              designInstructions,
              expectedAmount: total,
              pricingVersion: pricing?.version,
            }}
          />
          <Link href="/dashboard">{t('Acompanhar o pedido')}</Link>
        </aside>
      </div>
    </div>
  );
}
