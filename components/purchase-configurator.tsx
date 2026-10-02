'use client';
import { useEffect, useState } from 'react';
import {
  Package,
  CreditCard,
  UserRound,
  Layers,
  Palette,
  Truck,
  ClipboardList,
  KeyRound,
  MapPin,
  Upload,
  PenTool,
  BadgeCheck,
} from 'lucide-react';

import { PvcConfigurator, PvcPreview } from './pvc-configurator';
import { pvcModel, pvcPhoto, type PvcModel } from '@/lib/pvc-models';
import { LeatherConfigurator, LeatherPreview } from './leather-configurator';

import { defaultLeather, type LeatherDesign } from '@/lib/leather-design';

import { DeliverySelector } from './delivery-selector';
import { readFulfilment, fulfilmentQuote } from '@/lib/fulfilment';
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
import { designImageDefaults, type DesignImage } from '@/lib/design-images';

export function PurchaseConfigurator({
  initial = 'kit',
  prices,
  photos = [],

  leatherDimensions,

  designImages = designImageDefaults,
  pricing = null,
  paymentAvailable = false,
  signedIn = false,
}: {
  initial?: string;
  prices: HardwarePrice[];
  photos?: ProductPhoto[];

  leatherDimensions?: string;

  designImages?: DesignImage[];
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

  const [pvc, setPvc] = useState<PvcModel>('tiktok');
  const [pvcBack, setPvcBack] = useState(false);
  const isPvcStandard =
    format !== 'card' && keychain === 'PVC + epóxi' && design === 'standard';
  const [leatherPreview, setLeatherPreview] = useState('');
  const [leather, setLeather] = useState<LeatherDesign>(defaultLeather);

  const [leatherBusy, setLeatherBusy] = useState(false);

  const isLeather = format !== 'card' && keychain === 'Couro';

  const method = isLeather ? 'Logótipo personalizado' : 'PDF vectorial';

  const [contact, setContact] = useState('');
  const [address, setAddress] = useState('');
  const [delivery, setDelivery] = useState('pickup');
  const [city, setCity] = useState('');
  const [pickupPoint, setPickupPoint] = useState('');
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

        setLeather(draft.leather ?? defaultLeather);
        setPvc(draft.pvcModel ?? 'tiktok');

        setDelivery(draft.delivery);
        setCity(draft.city);
        setPickupPoint(draft.pickupPoint);
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
          version: 2,
          pvcModel: pvc,

          leather,

          expires: Date.now() + 1800000,
          card,
          keychain,
          design,
          delivery,
          city,
          pickupPoint,
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
    pvc,

    leather,

    initial,
    card,
    keychain,
    design,
    delivery,
    city,
    pickupPoint,
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
  const fulfilmentSettings = readFulfilment(pricing?.fulfilment_json);
  let fulfilment: ReturnType<typeof fulfilmentQuote> | null = null;
  try {
    fulfilment = fulfilmentQuote(fulfilmentSettings, {
      city,
      delivery,
      pickupPoint,
    });
  } catch {
    /* Incomplete selection or a service awaiting quotation. */
  }
  const total =
    estimate && designAmount !== null && fulfilment
      ? estimate.amount + designAmount + fulfilment.fee
      : null;
  const deliveryReady =
    !!fulfilment &&
    contact.trim().length >= 7 &&
    (delivery === 'pickup' || address.trim().length >= 8);
  return (
    <div className="purchase-configurator">
      <ol className="checkout-journey" aria-label={t('Etapas da compra')}>
        <li aria-current="step">
          <span>1</span>
          <strong>
            <Package className="purchase-icon" size={18} aria-hidden="true" />
            {t('Produto e entrega')}
          </strong>
        </li>
        <li>
          <span>2</span>
          <strong>
            <CreditCard
              className="purchase-icon"
              size={18}
              aria-hidden="true"
            />
            {t('Pagamento')}
          </strong>
        </li>
        <li>
          <span>3</span>
          <strong>
            <UserRound className="purchase-icon" size={18} aria-hidden="true" />
            {t('Configurar perfil')}
          </strong>
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
      <a className="purchase-summary-link" href="#purchase-summary">
        {t('A sua configuração')} →
      </a>
      <div className="purchase-layout">
        <div>
          <fieldset className="purchase-section">
            <legend>
              <Layers className="purchase-icon" size={20} aria-hidden="true" />
              {t('1. Materiais')}
            </legend>
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
            <legend>
              <Palette className="purchase-icon" size={20} aria-hidden="true" />
              {t('2. Design')}
            </legend>
            <details className="purchase-design-options">
              <summary>
                <span>
                  <Palette
                    className="purchase-icon"
                    size={18}
                    aria-hidden="true"
                  />
                  {t(selectedDesign.name)}
                </span>
                <span className="purchase-change-label">{t('Alterar')}</span>
              </summary>
              <div className="purchase-choices">
                {designServices.map((item) => (
                  <label
                    className={`purchase-choice purchase-design-choice ${design === item.id ? 'is-selected' : ''}`}
                    key={item.id}
                  >
                    <SourceImage
                      className={`purchase-design-image ${isLeather ? 'is-leather-photo' : ''}`}
                      src={
                        format !== 'card' &&
                        keychain === 'PVC + epóxi' &&
                        item.id === 'standard'
                          ? pvcPhoto(pvc)
                          : isLeather
                            ? `/products/leather/${leather.color}-${item.id !== 'standard' ? 'blank' : leather.color === 'black' ? 'symbol' : leather.logo}.png`
                            : (
                                designImages.find(
                                  (row) => row.id === item.id,
                                ) ??
                                designImageDefaults.find(
                                  (row) => row.id === item.id,
                                )!
                              ).image
                      }
                      alt={
                        format !== 'card' &&
                        keychain === 'PVC + epóxi' &&
                        item.id === 'standard'
                          ? t(pvcModel(pvc).name)
                          : isLeather
                            ? `Fotografia de referência · couro ${leather.color === 'black' ? 'preto' : 'castanho'}`
                            : (
                                designImages.find(
                                  (row) => row.id === item.id,
                                ) ??
                                designImageDefaults.find(
                                  (row) => row.id === item.id,
                                )!
                              ).alt
                      }
                      width={600}
                      height={400}
                    />
                    <input
                      type="radio"
                      name="design"
                      checked={design === item.id}
                      onChange={() => setDesign(item.id)}
                      onClick={(event) => {
                        const choices = event.currentTarget.closest('details');
                        if (choices) {
                          choices.open = false;
                          choices.querySelector('summary')?.focus();
                        }
                      }}
                    />
                    <strong>
                      {item.id === 'standard' ? (
                        <BadgeCheck
                          className="purchase-icon"
                          size={16}
                          aria-hidden="true"
                        />
                      ) : item.id === 'customer' ? (
                        <Upload
                          className="purchase-icon"
                          size={16}
                          aria-hidden="true"
                        />
                      ) : (
                        <PenTool
                          className="purchase-icon"
                          size={16}
                          aria-hidden="true"
                        />
                      )}
                      {t(item.name)}
                    </strong>
                    <p>
                      {isLeather && item.id === 'customer'
                        ? 'Carregue o seu logo em PDF, PNG ou JPG e veja a simulação.'
                        : t(item.description)}
                    </p>
                  </label>
                ))}
              </div>
            </details>
            {isPvcStandard && (
              <PvcConfigurator
                model={pvc}
                onChange={setPvc}
                back={pvcBack}
                onFaceChange={setPvcBack}
              />
            )}
            {isLeather && (
              <LeatherConfigurator
                value={leather}
                onChange={setLeather}
                onPreviewChange={setLeatherPreview}
                preview={leatherPreview}
                design={design}
                signedIn={signedIn}
                onBusy={setLeatherBusy}
                dimensions={leatherDimensions}
              />
            )}
            {(design === 'team' || (!isLeather && design === 'customer')) && (
              <label className="purchase-method">
                Instruções para o design
                <textarea
                  value={designInstructions}
                  onChange={(e) => setDesignInstructions(e.target.value)}
                  maxLength={2000}

                  placeholder="Descreva o logótipo, os textos e o estilo que pretende."
                />
                <small>
                  A equipa revê as suas instruções e contacta-o para preparar o
                  design. A produção começa após a sua aprovação.
                </small>
              </label>
            )}
          </fieldset>
          <section className="purchase-section">
            <h2>
              <Truck className="purchase-icon" size={20} aria-hidden="true" />
              3. Como pretende receber?
            </h2>
            <DeliverySelector
              settings={fulfilmentSettings}
              city={city}
              mode={delivery}
              point={pickupPoint}
              onCity={(id) => {
                setCity(id);
                setPickupPoint(
                  fulfilmentSettings?.points.find(
                    (p) => p.cityId === id && p.active,
                  )?.id ?? '',
                );
              }}
              onMode={setDelivery}
              onPoint={setPickupPoint}
            />
            {city && (
              <label>
                {delivery === 'pickup'
                  ? 'Contacto para o aviso de levantamento'
                  : 'Contacto do destinatário'}
                <input
                  type="tel"
                  value={contact}
                  onChange={(e) => setContact(e.target.value)}
                  maxLength={50}
                  autoComplete="tel"
                  placeholder="+258"
                />
              </label>
            )}
            {city && delivery !== 'pickup' && (
              <label>
                Bairro, morada e ponto de referência
                <textarea
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  maxLength={300}
                  autoComplete="street-address"
                />
              </label>
            )}
          </section>
        </div>
        <aside
          id="purchase-summary"
          className="configuration-summary"
          aria-label={t('A sua configuração')}
        >
          <h2>
            <ClipboardList
              className="purchase-icon"
              size={20}
              aria-hidden="true"
            />
            {t('A sua configuração')}
          </h2>
          {isLeather && (
            <p className="leather-summary">
              <span key={`${leather.color}-${t.locale}`}>
                {t(
                  leather.color === 'brown'
                    ? 'Couro · Castanho'
                    : 'Couro · Preto',
                )}
              </span>{' '}
              ·{' '}
              {design === 'standard'
                ? leather.logo === 'full'
                  ? 'Logo completo'
                  : 'Símbolo F'
                : design === 'customer'
                  ? 'O seu logótipo'
                  : 'Design pela equipa'}
            </p>
          )}
          {isPvcStandard && (
            <p className="pvc-selection" aria-live="polite">
              {t('Modelo')}: {t(pvcModel(pvc).name)}
            </p>
          )}
          <div className="configuration-photos">
            {preview.map((material) => {
              const photo = photos.find((item) => item.material === material);
              return (
                <figure key={material}>
                  {isLeather && material === 'Couro' ? (
                    <LeatherPreview
                      value={leather}
                      design={design}
                      preview={leatherPreview}
                    />
                  ) : isPvcStandard && material === 'PVC + epóxi' ? (
                    <PvcPreview model={pvc} back={pvcBack} />
                  ) : photo ? (
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
          <div
            aria-live="polite"
            key={`${format}-${card}-${keychain}-${design}-${t.locale}`}
          >
            <h3>{t(selected.name)}</h3>
            {format !== 'keychain' && (
              <p>
                <CreditCard
                  className="purchase-icon"
                  size={16}
                  aria-hidden="true"
                />
                {t('Cartão')}: {t(card)}
              </p>
            )}
            {format !== 'card' && (
              <p>
                <KeyRound
                  className="purchase-icon"
                  size={16}
                  aria-hidden="true"
                />
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
            <span
              aria-live="polite"
              key={`${card}-${keychain}-${estimate?.amount}-${t.locale}`}
            >
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
          {delivery === 'pickup' && fulfilment && (
            <p>
              <MapPin className="purchase-icon" size={16} aria-hidden="true" />
              Levantamento gratuito · {fulfilment.point?.name}
            </p>
          )}
          {delivery !== 'pickup' && city && (
            <p>
              Entrega{delivery === 'express' ? ' expressa' : ''}:{' '}
              {fulfilment ? money(fulfilment.fee, t.locale) : 'Sob cotação'}
            </p>
          )}
          <p className="purchase-total">
            <strong>
              Total a pagar:{' '}
              {total === null
                ? city
                  ? 'A confirmar'
                  : 'Seleccione como receber'
                : money(total, t.locale)}
            </strong>
          </p>
          <div className="purchase-next-step">
            <strong>
              <UserRound
                className="purchase-icon"
                size={18}
                aria-hidden="true"
              />
              {t('O perfil fica para depois do pagamento')}
            </strong>
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
          {signedIn && paymentAvailable && total !== null && !deliveryReady && (
            <p className="purchase-help">
              {delivery === 'pickup'
                ? 'Indique o contacto para o aviso de levantamento.'
                : 'Preencha o contacto e a morada para continuar.'}
            </p>
          )}
          <PaySuiteCheckout
            key={`${format}-${card}-${keychain}-${design}-${city}-${delivery}-${pickupPoint}-${total}-${isLeather ? JSON.stringify(leather) : ''}-${designInstructions}-${isPvcStandard ? pvc : ''}`}

            disabled={
              (isLeather &&
                (leatherBusy ||
                  (design === 'customer' && !leather.assetId) ||
                  (design === 'team' && !designInstructions.trim()))) ||
              !draftReady ||
              !signedIn ||
              !paymentAvailable ||
              total === null ||
              !deliveryReady
            }
            payload={{
              kind: 'product',
              format,
              card,
              keychain,
              design,
              delivery,
              city,
              pickupPoint,
              contact,
              address,
              designInstructions,

              ...(isPvcStandard ? { pvcModel: pvc } : {}),
              ...(isLeather ? { leather } : {}),

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
