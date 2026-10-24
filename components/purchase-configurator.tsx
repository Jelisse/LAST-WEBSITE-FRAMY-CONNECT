'use client';
import { PurchaseStageProgress } from './purchase-stage-progress';
import {
  purchaseStages,
  purchaseConfigurationIssue,
} from '@/lib/purchase-journey';
import { PhoneInput } from './phone-input';
import { ProductArtworkPreview } from './product-artwork-preview';
import { useCallback, useEffect, useState } from 'react';
import {
  Layers,
  Palette,
  Truck,
  ClipboardList,
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
} from '@/lib/purchase-structure';
import { money } from '@/lib/catalog';
import { hardwareEstimate, type HardwarePrice } from '@/lib/hardware-pricing';
import { purchaseAmounts } from '@/lib/purchase-amounts';
import { AmbassadorCodeInput } from './ambassador-dashboard';
import { PaySuiteCheckout } from './paysuite-checkout';
import type { CheckoutPricing } from '@/lib/checkout-pricing';
import { CardMaterialImage, cardArtwork } from './card-material-image';
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
  useEffect(() => {
    const header = document.querySelector<HTMLElement>('.public-header');
    if (!header) return;
    const journey = document.querySelector<HTMLElement>(
      '.purchase-stage-progress',
    );
    const measure = () => {
      document.documentElement.style.setProperty(
        '--site-header-height',
        `${header.getBoundingClientRect().height}px`,
      );
      if (journey)
        document.documentElement.style.setProperty(
          '--checkout-journey-height',
          `${journey.getBoundingClientRect().height}px`,
        );
    };
    const observer = new ResizeObserver(measure);
    observer.observe(header);
    if (journey) observer.observe(journey);
    measure();
    return () => {
      observer.disconnect();
      document.documentElement.style.removeProperty('--site-header-height');
      document.documentElement.style.removeProperty(
        '--checkout-journey-height',
      );
    };
  }, []);
  const selection = purchaseSelection(initial);
  const format = selection.format;
  const [ambassadorCode, setAmbassadorCode] = useState('');
  const [referralReady, setReferralReady] = useState(true);
  const [restoredCode, setRestoredCode] = useState('');
  const changeReferral = useCallback((code: string, ready: boolean) => {
    setAmbassadorCode(code);
    setReferralReady(ready);
  }, []);
  const [card, setCard] = useState<string>(selection.card);
  const [keychain, setKeychain] = useState<string>(selection.keychain);
  const [design, setDesign] = useState('standard');
  const [stageError, setStageError] = useState('');
  const [activeConfiguration, setActiveConfiguration] = useState<
    'materials' | 'design' | 'delivery'
  >('materials');

  const [paymentStep, setPaymentStep] = useState(false);
  const [deliveryAttempted, setDeliveryAttempted] = useState(false);
  const [cardBack, setCardBack] = useState(false);
  const [cardPaused, setCardPaused] = useState(true);
  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (cardPaused || design !== 'standard') return;
    const timer = window.setInterval(() => {
      if (!document.hidden && !query.matches) setCardBack((value) => !value);
    }, 6000);
    return () => window.clearInterval(timer);
  }, [cardPaused, design]);
  const [pvc, setPvc] = useState<PvcModel>('tiktok');
  const [pvcBack, setPvcBack] = useState(false);
  const isPvcStandard =
    format !== 'card' && keychain === 'PVC + epóxi' && design === 'standard';
  const [cardArtworkValue, setCardArtworkValue] =
    useState<LeatherDesign>(defaultLeather);
  const [pvcArtworkValue, setPvcArtworkValue] =
    useState<LeatherDesign>(defaultLeather);
  const [cardCustomPreview, setCardCustomPreview] = useState('');
  const [pvcCustomPreview, setPvcCustomPreview] = useState('');
  const [cardBusy, setCardBusy] = useState(false);
  const [pvcBusy, setPvcBusy] = useState(false);
  const [leatherPreview, setLeatherPreview] = useState('');
  const [leather, setLeather] = useState<LeatherDesign>(defaultLeather);

  const [leatherBusy, setLeatherBusy] = useState(false);

  const isLeather = format !== 'card' && keychain === 'Couro';

  const method = isLeather ? 'Logótipo personalizado' : 'PDF, PNG ou JPG';

  const [buyerName, setBuyerName] = useState('');
  const [buyerEmail, setBuyerEmail] = useState('');
  const [guestReady, setGuestReady] = useState(signedIn);
  const [guestError, setGuestError] = useState(false);
  async function prepareGuest() {
    setGuestError(false);
    try {
      const r = await fetch('/api/guest-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{}',
      });
      if (!r.ok) throw Error();
      setGuestReady(true);
    } catch {
      setGuestError(true);
    }
  }
  useEffect(() => {
    if (!signedIn)
      queueMicrotask(() => {
        void prepareGuest();
      });
  }, [signedIn]);
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
        if (draft.ambassadorCode) {
          setRestoredCode(draft.ambassadorCode);
          setReferralReady(false);
        }
        setCard(draft.card);
        setKeychain(draft.keychain);
        setDesign(draft.design);

        setCardArtworkValue(draft.cardArtwork ?? defaultLeather);
        setPvcArtworkValue(draft.pvcArtwork ?? defaultLeather);
        setLeather(draft.leather ?? defaultLeather);
        setPvc(draft.pvcModel ?? 'tiktok');

        setDelivery(draft.delivery);
        setCity(draft.city);
        setPickupPoint(draft.pickupPoint);
        setContact(draft.contact);
        setAddress(draft.address);
        setDesignInstructions(draft.designInstructions);
        setBuyerName(draft.buyerName ?? '');
        setBuyerEmail(draft.buyerEmail ?? '');
        setActiveConfiguration(
          (['materials', 'design', 'delivery'] as const)[
            Math.min(draft.stage ?? 0, 2)
          ],
        );
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
          stage: paymentStep
            ? 2
            : activeConfiguration === 'materials'
              ? 0
              : activeConfiguration === 'design'
                ? 1
                : 2,
          buyerName,
          buyerEmail,
          ambassadorCode:
            ambassadorCode || (!referralReady ? restoredCode : ''),
          pvcModel: pvc,

          leather,
          cardArtworkValue,
          pvcArtworkValue,
          cardArtwork: cardArtworkValue,
          pvcArtwork: pvcArtworkValue,

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
    activeConfiguration,
    paymentStep,
    buyerName,
    buyerEmail,
    cardArtworkValue,
    pvcArtworkValue,
    ambassadorCode,
    referralReady,
    restoredCode,
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
  const discount =
    estimate && ambassadorCode ? Math.round(estimate.amount / 10) : 0;
  const { subtotal, total } = purchaseAmounts(
    estimate?.amount ?? null,
    discount,
    designAmount,
    fulfilment?.fee ?? null,
  );
  const artworkMissing =
    design === 'customer' &&
    ((format !== 'keychain' && !cardArtworkValue.assetId) ||
      (format !== 'card' &&
        keychain === 'PVC + epóxi' &&
        !pvcArtworkValue.assetId) ||
      (isLeather && !leather.assetId));
  const instructionsMissing = design === 'team' && !designInstructions.trim();
  const uploadBusy = cardBusy || pvcBusy || (isLeather && leatherBusy);
  const buyerReady =
    signedIn ||
    (guestReady &&
      buyerName.trim().length >= 2 &&
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(buyerEmail));
  const deliveryReady =
    buyerReady &&
    !!fulfilment &&
    contact.trim().length >= 7 &&
    (delivery === 'pickup' || address.trim().length >= 8);
  const currentStage = paymentStep
    ? 3
    : activeConfiguration === 'materials'
      ? 0
      : activeConfiguration === 'design'
        ? 1
        : 2;
  const focusStage = () =>
    requestAnimationFrame(() => {
      const heading = document.getElementById('purchase-stage-title');
      heading?.scrollIntoView({ block: 'start', behavior: 'instant' });
      heading?.focus({ preventScroll: true });
    });
  const moveTo = (stage: number) => {
    setStageError('');
    setPaymentStep(false);
    setActiveConfiguration(
      (['materials', 'design', 'delivery'] as const)[stage],
    );
    focusStage();
  };
  const validConfiguration = (stage: 0 | 1) => {
    const issue = purchaseConfigurationIssue(
      {
        materialReady: !!estimate,
        artworkMissing,
        instructionsMissing,
        uploadBusy,
      },
      stage,
    );
    if (issue) {
      setStageError(issue);
      requestAnimationFrame(() =>
        document.getElementById('purchase-stage-error')?.focus(),
      );
      return false;
    }
    return true;
  };
  const goToDesign = () => {
    if (validConfiguration(0)) moveTo(1);
  };
  const goToDelivery = () => {
    if (validConfiguration(1)) moveTo(2);
  };
  const showSummary = () => {
    if (!validConfiguration(1)) return;
    if (!deliveryReady) {
      setDeliveryAttempted(true);
      requestAnimationFrame(() =>
        document.getElementById('delivery-validation')?.focus(),
      );
      return;
    }
    setStageError('');
    setPaymentStep(true);
    focusStage();
  };
  useEffect(() => {
    const previous = document.title;
    document.title =
      t('Etapa {0} de {1}', [String(currentStage + 1), '4']) +
      ' · ' +
      t(purchaseStages[currentStage]) +
      ' · Framy Connect';
    return () => {
      document.title = previous;
    };
  }, [currentStage, t]);
  const materialPresentation = (
    material: string,
    kind: 'card' | 'keychain',
  ) => {
    const photo =
      photos.find((item) => item.material === material)?.src ??
      (material === 'Couro'
        ? '/products/leather/brown-full.png'
        : material === 'PVC + epóxi'
          ? pvcPhoto(pvc)
          : null);
    const price = hardwareEstimate(prices, kind, material, material);
    return (
      <>
        {kind === 'card' ? (
          <CardMaterialImage material={material} back={cardBack} />
        ) : photo ? (
          <SourceImage
            className="material-photo"
            src={photo}
            alt={t(material)}
            width={240}
            height={240}
          />
        ) : (
          <span className="material-photo-placeholder">
            {t('Fotografia do produto em preparação')}
          </span>
        )}
        <small className="material-price">
          {price ? money(price.amount, t.locale) : t('Preço a confirmar')}
        </small>
      </>
    );
  };
  const totalLabel =
    total === null ? t('Subtotal dos produtos') : t('Total a pagar');
  const displayAmount = total ?? subtotal;
  const amountText =
    displayAmount == null
      ? t('Preço a confirmar')
      : money(displayAmount, t.locale);
  return (
    <div
      className="purchase-configurator"
      data-purchase-step={paymentStep ? 'review' : activeConfiguration}
    >
      <PurchaseStageProgress step={currentStage} onBackTo={moveTo} />
      {currentStage === 0 && (
        <p className="purchase-stage-intro">
          {t(
            'Cartão, porta-chaves ou kit — para partilhar o seu perfil num toque.',
          )}{' '}
          <strong>{t(selected.name)}</strong> ·{' '}
          <Link href="/produtos">{t('Alterar produto')}</Link>
        </p>
      )}
      {stageError && (
        <div
          className="purchase-stage-error"
          id="purchase-stage-error"
          tabIndex={-1}
          role="alert"
        >
          <p>{t(stageError)}</p>
          <Link href="/contacto?assunto=encomenda">
            {t('Pedir ajuda para encomendar')}
          </Link>
        </div>
      )}
      {!paymentAvailable && (
        <p className="purchase-availability-note">
          {t(
            'Compras temporariamente indisponíveis. Pode consultar os produtos e simular a configuração.',
          )}{' '}
          <Link href="/contacto?assunto=encomenda">
            {t('Pedir ajuda para encomendar')}
          </Link>
        </p>
      )}
      <div className="purchase-layout">
        <div>
          <fieldset
            id="materials-panel"
            className="purchase-section configuration-panel"
            hidden={paymentStep || activeConfiguration !== 'materials'}
          >
            <legend>
              <Layers className="purchase-icon" size={20} aria-hidden="true" />
              {t('Materiais')}
            </legend>
            <div className="purchase-materials">
              {format !== 'keychain' && (
                <fieldset className="material-option-group">
                  <legend>{t('Cartão')}</legend>
                  <div
                    className="card-view-controls"
                    aria-label={t('Fotografias do produto')}
                  >
                    <button
                      type="button"
                      aria-pressed={!cardBack}
                      onClick={() => {
                        setCardBack(false);
                        setCardPaused(true);
                      }}
                    >
                      {t('Frente')}
                    </button>
                    <button
                      type="button"
                      aria-pressed={cardBack}
                      onClick={() => {
                        setCardBack(true);
                        setCardPaused(true);
                      }}
                    >
                      {t('Verso')}
                    </button>
                    <button
                      type="button"
                      onClick={() => setCardPaused(!cardPaused)}
                    >
                      {t(
                        cardPaused
                          ? 'Retomar fotografias'
                          : 'Pausar fotografias',
                      )}
                    </button>
                  </div>
                  <p className="card-simulation-note">
                    {t('Simulação ilustrativa')}
                  </p>
                  <div className="material-options">
                    {cardMaterials.map((item) => (
                      <label
                        key={item}
                        className={card === item ? 'is-selected' : ''}
                      >
                        <input
                          type="radio"
                          name="card-material"
                          value={item}
                          checked={card === item}
                          onChange={() => setCard(item)}
                        />
                        <span>{t(item)}</span>
                        {materialPresentation(item, 'card')}
                      </label>
                    ))}
                  </div>
                </fieldset>
              )}
              {format !== 'card' && (
                <fieldset className="material-option-group">
                  <legend>{t('Porta-chaves')}</legend>
                  <div className="material-options">
                    {keychainMaterials.map((item) => (
                      <label
                        key={item}
                        className={keychain === item ? 'is-selected' : ''}
                      >
                        <input
                          type="radio"
                          name="keychain-material"
                          value={item}
                          checked={keychain === item}
                          onChange={() => setKeychain(item)}
                        />
                        <span>{t(item)}</span>
                        {materialPresentation(item, 'keychain')}
                      </label>
                    ))}
                  </div>
                </fieldset>
              )}
            </div>
            <button
              type="button"
              className="btn btn-primary material-continue"
              onClick={goToDesign}
            >
              {t('Continuar para personalização')} →
            </button>
          </fieldset>
          <fieldset
            id="design-panel"
            className="purchase-section configuration-panel"
            hidden={paymentStep || activeConfiguration !== 'design'}
          >
            <legend>
              <Palette className="purchase-icon" size={20} aria-hidden="true" />
              {t('Design')}
            </legend>
            <div className="purchase-design-options">
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
                            ? t('Fotografia de referência · couro {0}', [
                                leather.color === 'black'
                                  ? t('preto')
                                  : t('castanho'),
                              ])
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
                    <small className="purchase-design-cost">
                      {pricing
                        ? item.id === 'standard'
                          ? t('Incluído')
                          : '+ ' +
                            money(
                              item.id === 'customer'
                                ? pricing.customer_design
                                : pricing.team_design,
                              t.locale,
                            )
                        : t('Sob consulta')}
                    </small>
                    <p>
                      {isLeather && item.id === 'customer'
                        ? t(
                            'Carregue o seu logo em PDF, PNG ou JPG e veja a simulação.',
                          )
                        : t(item.description)}
                    </p>
                  </label>
                ))}
              </div>
            </div>
            {format !== 'keychain' && design === 'standard' && (
              <fieldset className="card-design-selection">
                <legend>{t('Design do cartão')}</legend>
                <p>{t('Veja a frente e o verso do cartão que escolheu.')}</p>
                <div className="card-view-controls">
                  {[false, true].map((back) => (
                    <button
                      type="button"
                      key={String(back)}
                      aria-pressed={cardBack === back}
                      onClick={() => {
                        setCardBack(back);
                        setCardPaused(true);
                      }}
                    >
                      {t(back ? 'Verso' : 'Frente')}
                    </button>
                  ))}
                </div>
                <div className="material-options">
                  {[card].map((material) => (
                    <label
                      key={material}
                      className={card === material ? 'is-selected' : ''}
                    >
                      <CardMaterialImage material={material} back={cardBack} />
                      <span>
                        {t(material)}
                        {material !== 'Madeira' && (
                          <> · {t(material === 'PVC' ? 'Laranja' : 'Preto')}</>
                        )}
                      </span>
                    </label>
                  ))}
                </div>
              </fieldset>
            )}
            <div className="purchase-active-design">
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
                  signedIn={signedIn || guestReady}
                  onBusy={setLeatherBusy}
                  dimensions={leatherDimensions}
                />
              )}
              {design !== 'standard' && format !== 'keychain' && (
                <LeatherConfigurator
                  value={cardArtworkValue}
                  onChange={setCardArtworkValue}
                  preview={cardCustomPreview}
                  onPreviewChange={setCardCustomPreview}
                  design={design}
                  signedIn={signedIn || guestReady}
                  onBusy={setCardBusy}
                  product={card}
                  renderPreview={(back) => (
                    <ProductArtworkPreview
                      material={card}
                      value={cardArtworkValue}
                      preview={cardCustomPreview}
                      back={back}
                    />
                  )}
                />
              )}
              {design !== 'standard' &&
                format !== 'card' &&
                keychain === 'PVC + epóxi' && (
                  <LeatherConfigurator
                    value={pvcArtworkValue}
                    onChange={setPvcArtworkValue}
                    preview={pvcCustomPreview}
                    onPreviewChange={setPvcCustomPreview}
                    design={design}
                    signedIn={signedIn || guestReady}
                    onBusy={setPvcBusy}
                    product={keychain}
                    renderPreview={(back) => (
                      <ProductArtworkPreview
                        material={keychain}
                        value={pvcArtworkValue}
                        preview={pvcCustomPreview}
                        back={back}
                      />
                    )}
                  />
                )}
              {(design === 'team' || (!isLeather && design === 'customer')) && (
                <label className="purchase-method">
                  {t('Instruções para o design')}
                  <textarea
                    value={designInstructions}
                    onChange={(e) => setDesignInstructions(e.target.value)}
                    maxLength={2000}

                    placeholder={t(
                      'Descreva o logótipo, os textos e o estilo que pretende.',
                    )}
                  />
                  <small>
                    {t(
                      'A equipa revê as suas instruções e contacta-o para preparar o design. A produção começa após a sua aprovação.',
                    )}
                  </small>
                </label>
              )}
              <div className="purchase-step-actions">
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => moveTo(0)}
                >
                  {t('Voltar')}
                </button>
                <button
                  type="button"
                  className="btn btn-primary configuration-next"
                  onClick={goToDelivery}
                >
                  {t('Continuar para entrega')} →
                </button>
              </div>
            </div>
          </fieldset>
          <section
            id="delivery-panel"
            aria-labelledby="delivery-control"
            className="purchase-section configuration-panel"
            hidden={paymentStep || activeConfiguration !== 'delivery'}
          >
            <h2 className="configuration-panel-heading">
              <Truck className="purchase-icon" size={20} aria-hidden="true" />
              {t('Como pretende receber?')}
            </h2>
            {deliveryAttempted && !deliveryReady && (
              <p
                id="delivery-validation"
                tabIndex={-1}
                role="alert"
                className="flow-inline-error"
              >
                {t(
                  !buyerReady
                    ? 'Indique o seu nome e um email válido.'
                    : 'Confirme a entrega e preencha os dados de contacto.',
                )}
              </p>
            )}
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
            {!signedIn && (
              <div className="purchase-guest-note">
                <p>
                  {t(
                    'Compre sem conta. Receberá uma referência para acompanhar a encomenda.',
                  )}
                </p>
                <Link
                  href={
                    '/entrar?return_to=' +
                    encodeURIComponent('/comprar?formato=' + initial)
                  }
                >
                  {t('Já tem conta? Entrar')}
                </Link>
                {guestError && (
                  <p role="alert">
                    {t('Não foi possível preparar a compra. Tente novamente.')}{' '}
                    <button type="button" onClick={() => void prepareGuest()}>
                      {t('Tentar novamente')}
                    </button>
                  </p>
                )}
              </div>
            )}
            {!signedIn && (
              <div className="guest-buyer-fields">
                <label>
                  {t('Nome do comprador')}
                  <input
                    autoComplete="name"
                    value={buyerName}
                    maxLength={100}
                    onChange={(e) => setBuyerName(e.target.value)}
                  />
                </label>
                <label>
                  {t('Email para a referência e confirmação')}
                  <input
                    type="email"
                    autoComplete="email"
                    value={buyerEmail}
                    maxLength={254}
                    onChange={(e) => setBuyerEmail(e.target.value)}
                  />
                </label>
              </div>
            )}
            {city && (
              <label>
                {delivery === 'pickup'
                  ? t('Contacto para o aviso de levantamento')
                  : t('Contacto do destinatário')}
                <PhoneInput
                  value={contact}
                  onValueChange={setContact}
                  maxLength={50}
                  autoComplete="tel"
                  placeholder="+258"
                />
              </label>
            )}
            {city && delivery !== 'pickup' && (
              <label>
                {t('Bairro, morada e ponto de referência')}
                <textarea
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  maxLength={300}
                  autoComplete="street-address"
                />
              </label>
            )}
            <div className="purchase-step-actions">
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => moveTo(1)}
              >
                {t('Voltar')}
              </button>
              <button
                type="button"
                className="btn btn-primary configuration-next"
                onClick={showSummary}
              >
                {t('Rever a minha encomenda')} →
              </button>
            </div>
          </section>
        </div>
        {paymentStep && (
          <section
            id="purchase-summary"
            tabIndex={-1}
            className="configuration-summary"
            aria-label={t('A sua encomenda')}
          >
            <h2>
              <ClipboardList
                className="purchase-icon"
                size={20}
                aria-hidden="true"
              />
              {t('A sua encomenda')}
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
                    ? t('Logo completo')
                    : t('Símbolo F')
                  : design === 'customer'
                    ? t('O seu logótipo')
                    : t('Design pela equipa')}
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
                    {design !== 'standard' && cardArtwork[material] ? (
                      <ProductArtworkPreview
                        material={material}
                        value={cardArtworkValue}
                        preview={cardCustomPreview}
                        back={false}
                      />
                    ) : design !== 'standard' && material === 'PVC + epóxi' ? (
                      <ProductArtworkPreview
                        material={material}
                        value={pvcArtworkValue}
                        preview={pvcCustomPreview}
                        back={false}
                      />
                    ) : cardArtwork[material] ? (
                      <CardMaterialImage material={material} back={cardBack} />
                    ) : isLeather && material === 'Couro' ? (
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
                    {preview.length > 1 && (
                      <figcaption>{t(material)}</figcaption>
                    )}
                  </figure>
                );
              })}
            </div>
            <div
              aria-live="polite"
              key={`${format}-${card}-${keychain}-${design}-${t.locale}`}
            >
              <h3>{t(selected.name)}</h3>
              <p>
                {!isLeather && t(selectedDesign.name)}
                {design === 'customer' ? ` · ${t(method)}` : ''}
              </p>
            </div>
            <div className="purchase-review-edits">
              <button type="button" onClick={() => moveTo(0)}>
                {t('Editar produto')}
              </button>
              <button type="button" onClick={() => moveTo(1)}>
                {t('Editar personalização')}
              </button>
            </div>
            <div hidden={!paymentStep} className="purchase-review-details">
              <section className="purchase-delivery-review">
                <div>
                  <h3>{t('Entrega')}</h3>
                  <button type="button" onClick={goToDelivery}>
                    {t('Editar')}
                  </button>
                </div>
                <p>
                  {
                    fulfilmentSettings?.cities.find((item) => item.id === city)
                      ?.name
                  }
                  {' · '}
                  {t(delivery === 'pickup' ? 'Levantamento' : 'Entrega')}
                </p>
                <p>
                  {delivery === 'pickup' ? fulfilment?.point?.name : address}
                </p>
                <p>{contact}</p>
                {!signedIn && (
                  <small>
                    {buyerName} · {buyerEmail}
                  </small>
                )}
              </section>

              <AmbassadorCodeInput
                initialCode={restoredCode}
                onChange={changeReferral}
              />
              <dl className="purchase-price-breakdown">
                <div>
                  <dt>{t('Produtos')}</dt>
                  <dd>
                    {estimate
                      ? money(estimate.amount, t.locale)
                      : t('Preço a confirmar')}
                  </dd>
                </div>
                {ambassadorCode && estimate && (
                  <div>
                    <dt>{t('Desconto embaixador (10%)')}</dt>
                    <dd>−{money(discount, t.locale)}</dd>
                  </div>
                )}
                <div>
                  <dt>{t('Design')}</dt>
                  <dd>
                    {designAmount === null
                      ? t('Sob consulta')
                      : money(designAmount, t.locale)}
                  </dd>
                </div>
                <div>
                  <dt>
                    {t(delivery === 'pickup' ? 'Levantamento' : 'Entrega')}
                  </dt>
                  <dd>
                    {fulfilment
                      ? money(fulfilment.fee, t.locale)
                      : t('Sob cotação')}
                  </dd>
                </div>
              </dl>
              {delivery === 'pickup' && fulfilment && (
                <small>{fulfilment.point?.name}</small>
              )}
              {!!estimate?.saving && (
                <small>
                  {t('Poupa {0} face aos produtos separados.', [
                    money(estimate.saving, t.locale),
                  ])}
                </small>
              )}
            </div>
            <div className="purchase-total" aria-live="polite">
              <strong>
                {totalLabel}: {amountText}
              </strong>
              {total === null && (
                <small>
                  {t(
                    'Design e entrega apresentados separadamente. O total final depende da configuração e da entrega.',
                  )}
                </small>
              )}
            </div>
            <div hidden={!paymentStep} className="purchase-payment-stage">
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => moveTo(2)}
              >
                {t('Voltar à entrega')}
              </button>
              <details className="purchase-next-step">
                <summary>{t('Perfil após o pagamento')}</summary>
                <p>
                  {t(
                    'Após a confirmação, crie o seu perfil ou continue com o que já tem. O cartão e o porta-chaves podem partilhar o mesmo perfil.',
                  )}
                </p>
                <small>
                  {t(
                    'O plano Individual é gratuito. A compra do produto não inclui uma subscrição Profissional ou Corporativa.',
                  )}
                </small>
              </details>

              {paymentAvailable && total !== null && !deliveryReady && (
                <p className="purchase-help">
                  {!buyerReady
                    ? t(
                        'Preencha o nome e o email do comprador na etapa de entrega.',
                      )
                    : delivery === 'pickup'
                      ? t('Indique o contacto para o aviso de levantamento.')
                      : t('Preencha o contacto e a morada para continuar.')}
                </p>
              )}
              {paymentAvailable && !deliveryReady && (
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={goToDelivery}
                >
                  {t('Completar entrega para pagar')}
                </button>
              )}
              {paymentAvailable &&
                (artworkMissing ||
                  instructionsMissing ||
                  uploadBusy ||
                  !estimate) && (
                  <div className="purchase-help" aria-live="polite">
                    <p>
                      {t(
                        uploadBusy
                          ? 'Aguarde o fim do carregamento do design.'
                          : artworkMissing
                            ? 'Carregue o design de cada produto personalizado antes de pagar.'
                            : instructionsMissing
                              ? 'Escreva as instruções para a equipa antes de pagar.'
                              : 'O preço deste produto precisa de confirmação. Escolha outro material ou contacte a Framy Connect.',
                      )}
                    </p>
                    {(artworkMissing || instructionsMissing) && (
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={() => {
                          moveTo(1);
                        }}
                      >
                        {t('Completar design')}
                      </button>
                    )}
                  </div>
                )}
              {paymentAvailable ? (
                <PaySuiteCheckout
                  compact

                  disabled={
                    uploadBusy ||
                    artworkMissing ||
                    instructionsMissing ||
                    !referralReady ||
                    !draftReady ||
                    (!signedIn &&
                      (!guestReady ||
                        buyerName.trim().length < 2 ||
                        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(buyerEmail))) ||
                    !paymentAvailable ||
                    total === null ||
                    !deliveryReady
                  }
                  payload={{
                    kind: 'product',
                    ...(!signedIn ? { buyerName, buyerEmail } : {}),
                    ambassadorCode,
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

                    ...(design === 'customer' && format !== 'keychain'
                      ? { cardArtwork: cardArtworkValue }
                      : {}),
                    ...(design === 'customer' &&
                    format !== 'card' &&
                    keychain === 'PVC + epóxi'
                      ? { pvcArtwork: pvcArtworkValue }
                      : {}),
                    ...(isPvcStandard ? { pvcModel: pvc } : {}),
                    ...(isLeather ? { leather } : {}),

                    expectedAmount: total,
                    pricingVersion: pricing?.version,
                  }}
                />
              ) : (
                <p className="purchase-help">
                  {t(
                    'Compras temporariamente indisponíveis. Pode consultar os produtos e simular a configuração.',
                  )}{' '}
                  <Link href="/contacto?assunto=encomenda">
                    {t('Pedir ajuda para encomendar')}
                  </Link>
                </p>
              )}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
