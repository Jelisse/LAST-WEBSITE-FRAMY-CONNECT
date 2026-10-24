'use client';
import { DesignReferenceUpload } from './design-reference-upload';
import {
  validateDesignReferences,
  type DesignReferences,
} from '@/lib/design-references';
import { PurchasePreview } from './purchase-preview';
import { PurchaseQuotation } from './purchase-quotation';
import { PurchaseStageProgress } from './purchase-stage-progress';
import {
  purchaseJourney,
  purchaseReceptionIssue,
  purchaseBuyerIssue,
  type PurchaseEditorStep,
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
import { purchaseMoney as money } from '@/lib/purchase-journey';
import { hardwareEstimate, type HardwarePrice } from '@/lib/hardware-pricing';
import { purchaseAmounts } from '@/lib/purchase-amounts';
import { PurchaseCouponStep } from './purchase-coupon-step';
import {
  purchaseCouponFromSearch,
  couponQueryKeys,
} from '@/lib/purchase-coupon';
import { PaySuiteCheckout } from './paysuite-checkout';
import type { CheckoutPricing } from '@/lib/checkout-pricing';
import { CardMaterialImage, cardArtwork } from './card-material-image';
import { SourceImage } from './source-image';
import type { ProductPhoto } from '@/lib/product-gallery';

function setPurchaseDocumentTitle(title: string) {
  document.title = title;
}

export function PurchaseConfigurator({
  initial = 'kit',
  prices,
  photos = [],

  leatherDimensions,

  availability = {},
  pricing = null,
  paymentAvailable = false,
  signedIn = false,
  accountBuyer,
}: {
  initial?: string;
  prices: HardwarePrice[];
  photos?: ProductPhoto[];

  leatherDimensions?: string;

  availability?: Record<string, boolean>;
  pricing?: CheckoutPricing | null;
  paymentAvailable?: boolean;
  signedIn?: boolean;
  accountBuyer?: { name: string; email: string };
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
  const [format, setFormat] = useState(selection.format);
  const [productChoicesOpen, setProductChoicesOpen] = useState(false);
  const [editingReview, setEditingReview] = useState(false);
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
  const [locality, setLocality] = useState('');
  const [activeConfiguration, setActiveConfiguration] =
    useState<PurchaseEditorStep>('materials');

  const [paymentStep, setPaymentStep] = useState(false);
  const [deliveryAttempted, setDeliveryAttempted] = useState(false);
  const [buyerAttempted, setBuyerAttempted] = useState(false);
  const [cardBack, setCardBack] = useState(false);
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

  const [buyerName, setBuyerName] = useState(accountBuyer?.name ?? '');
  const [buyerEmail, setBuyerEmail] = useState(accountBuyer?.email ?? '');
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
  const [designReferences, setDesignReferences] = useState<DesignReferences>({
    assets: [],
    url: '',
  });
  const [referencesBusy, setReferencesBusy] = useState(false);
  const [kitEditor, setKitEditor] = useState<'card' | 'keychain'>('card');
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
    const linkedCode = purchaseCouponFromSearch(window.location.search);
    if (linkedCode) {
      const url = new URL(window.location.href);
      for (const key of couponQueryKeys) url.searchParams.delete(key);
      window.history.replaceState(
        window.history.state,
        '',
        url.pathname + url.search + url.hash,
      );
    }
    queueMicrotask(() => {
      const coupon = linkedCode || draft?.ambassadorCode;
      if (coupon) {
        setRestoredCode(coupon);
        setReferralReady(false);
      }
      if (draft) {
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
        setDesignReferences(draft.designReferences ?? { assets: [], url: '' });
        setFormat(draft.format ?? selection.format);
        setLocality(draft.locality ?? '');
        setBuyerName(accountBuyer?.name ?? draft.buyerName ?? '');
        setBuyerEmail(accountBuyer?.email ?? draft.buyerEmail ?? '');
        const step =
          draft.step ??
          (['materials', 'design', 'delivery', 'coupon'] as const)[
            Math.min(draft.stage ?? 0, 3)
          ];
        setActiveConfiguration(
          step === 'personalise' && draft.design === 'standard'
            ? 'design'
            : step,
        );
      }
      setDraftReady(true);
    });
  }, [initial, selection.format, accountBuyer?.name, accountBuyer?.email]);
  useEffect(() => {
    if (!draftReady) return;
    try {
      sessionStorage.setItem(
        'framy-checkout:configuration:' + initial,
        JSON.stringify({
          version: 3,
          format,
          locality,
          step: paymentStep ? 'coupon' : activeConfiguration,
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
          designReferences,
        }),
      );
    } catch {
      /* Checkout also works with browser storage disabled. */
    }
  }, [
    draftReady,
    format,
    locality,
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
    designReferences,
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
  const uploadBusy =
    cardBusy ||
    pvcBusy ||
    (isLeather && leatherBusy) ||
    (design === 'team' && referencesBusy);
  const buyerReady =
    signedIn ||
    (guestReady &&
      buyerName.trim().length >= 2 &&
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(buyerEmail.trim()));
  const selectedIds = [
    ...(format !== 'keychain'
      ? [{ PVC: 'pvc', Madeira: 'wood', Metal: 'metal' }[card] ?? '']
      : []),
    ...(format !== 'card'
      ? [keychain === 'Couro' ? 'keychain-leather' : 'keychain']
      : []),
  ];
  const unavailable = selectedIds.some((id) => availability[id] === false);
  const quotation =
    unavailable ||
    !estimate ||
    designAmount === null ||
    (!!city && !fulfilment);
  const deliveryIssue = purchaseReceptionIssue({
    city,
    locality,
    address,
    delivery,
    fulfilmentReady: !!fulfilment,
    quotation,
  });
  const buyerIssue = purchaseBuyerIssue({
    buyerReady: quotation
      ? signedIn ||
        (buyerName.trim().length >= 2 &&
          /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(buyerEmail.trim()))
      : buyerReady,
    contact,
  });
  const deliveryReady = !deliveryIssue && !buyerIssue;
  const route = purchaseJourney(design);
  const currentKey = paymentStep ? 'review' : activeConfiguration;
  const currentStage = route.findIndex((item) => item.key === currentKey);
  const stageCount = route.length;
  const stageLabel = route[currentStage]?.label ?? route[0].label;
  const productTitle =
    format === 'kit'
      ? 'Configure o seu kit NFC'
      : format === 'card'
        ? 'Configure o seu cartão NFC'
        : 'Configure o seu porta-chaves NFC';
  const focusStage = () =>
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        window.scrollTo({ top: 0, behavior: 'instant' });
        document
          .getElementById('purchase-stage-title')
          ?.focus({ preventScroll: true });
      }),
    );
  const moveTo = (stage: PurchaseEditorStep) => {
    setStageError('');
    setDeliveryAttempted(false);
    setBuyerAttempted(false);
    setPaymentStep(false);
    setActiveConfiguration(stage);
    focusStage();
  };
  const editStage = (stage: PurchaseEditorStep) => {
    setEditingReview(true);
    moveTo(stage);
  };
  const validConfiguration = (stage: 0 | 1) => {
    if (stage === 1 && design === 'team') {
      try {
        validateDesignReferences(designReferences);
      } catch (e) {
        setStageError(
          e instanceof Error ? e.message : 'Referências inválidas.',
        );
        requestAnimationFrame(() =>
          document.getElementById('purchase-stage-error')?.focus(),
        );
        return false;
      }
    }
    let issue = purchaseConfigurationIssue(
      {
        materialReady: !!estimate,
        allowQuotation: true,
        artworkMissing,
        instructionsMissing,
        uploadBusy,
      },
      stage,
    );
    if (stage === 1 && artworkMissing && format === 'kit') {
      const missingCard = !cardArtworkValue.assetId;
      setKitEditor(missingCard ? 'card' : 'keychain');
      issue = missingCard
        ? 'Carregue a arte do cartão para continuar.'
        : 'Carregue a arte do porta-chaves para continuar.';
    }
    if (issue) {
      setStageError(issue);
      requestAnimationFrame(() =>
        document.getElementById('purchase-stage-error')?.focus(),
      );
      return false;
    }
    return true;
  };
  const checkReception = () => {
    if (!deliveryIssue) return true;
    setPaymentStep(false);
    setActiveConfiguration('delivery');
    setDeliveryAttempted(true);
    requestAnimationFrame(() =>
      document.getElementById('delivery-validation')?.focus(),
    );
    return false;
  };
  const checkBuyer = () => {
    if (!buyerIssue) return true;
    setPaymentStep(false);
    setActiveConfiguration('buyer');
    setBuyerAttempted(true);
    requestAnimationFrame(() =>
      document.getElementById('buyer-validation')?.focus(),
    );
    return false;
  };
  const showSummary = (skipCoupon = false) => {
    if (!validConfiguration(1)) {
      setPaymentStep(false);
      setActiveConfiguration(design === 'standard' ? 'design' : 'personalise');
      return;
    }
    if (!checkReception() || !checkBuyer()) return;
    if (!referralReady && !skipCoupon) {
      moveTo('coupon');
      return;
    }
    setEditingReview(false);
    setStageError('');
    setPaymentStep(true);
    focusStage();
  };
  const canReturnToReview =
    editingReview &&
    referralReady &&
    deliveryReady &&
    !artworkMissing &&
    !instructionsMissing &&
    !uploadBusy;
  const continueDelivery = () => {
    if (!checkReception()) return;
    if (canReturnToReview) showSummary();
    else moveTo('buyer');
  };
  const continueBuyer = () => {
    if (!checkReception() || !checkBuyer()) return;
    if (canReturnToReview) showSummary();
    else moveTo('coupon');
  };
  const goToDesign = () => {
    if (validConfiguration(0)) {
      if (canReturnToReview) showSummary();
      else moveTo('design');
    }
  };
  const continueDesign = () => {
    if (design !== 'standard') {
      moveTo('personalise');
      return;
    }
    if (canReturnToReview) showSummary();
    else moveTo('delivery');
  };
  const goToDelivery = () => {
    if (validConfiguration(1)) {
      if (canReturnToReview) showSummary();
      else moveTo('delivery');
    }
  };
  const artworkNotes = (
    <label className="purchase-method artwork-notes">
      {t('Notas para a equipa (opcional)')}
      <textarea
        className="design-brief-textarea"
        rows={4}
        maxLength={2000}
        value={designInstructions}
        onChange={(event) => setDesignInstructions(event.target.value)}
        placeholder={t(
          'Há algum detalhe que a equipa deva saber sobre a sua arte?',
        )}
      />
    </label>
  );
  const quotationSummary = [
    t(selected.name),
    ...(format !== 'keychain' ? [t('Cartão') + ': ' + t(card)] : []),
    ...(format !== 'card'
      ? [
          t('Porta-chaves') +
            ': ' +
            t(keychain) +
            (isPvcStandard
              ? ' · ' + t(pvcModel(pvc).name)
              : isLeather
                ? ' · ' +
                  t(leather.color === 'brown' ? 'Castanho' : 'Preto') +
                  ' · ' +
                  t(
                    design === 'standard'
                      ? leather.logo === 'full'
                        ? 'Logo completo'
                        : 'Símbolo F'
                      : selectedDesign.name,
                  )
                : ''),
        ]
      : []),
    t('Design') + ': ' + t(selectedDesign.name),
    ambassadorCode ? t('Cupão para verificação') + ': ' + ambassadorCode : '',
    t('Cidade') +
      ': ' +
      (fulfilmentSettings?.cities.find((item) => item.id === city)?.name ??
        (locality || t('Outra cidade / localidade'))),
    t('Entrega') +
      ': ' +
      t(
        delivery === 'pickup'
          ? 'Levantamento'
          : delivery === 'express'
            ? 'Expresso'
            : 'Normal',
      ),
    delivery === 'pickup' && fulfilment?.point
      ? t('Ponto de levantamento') + ': ' + fulfilment.point.name
      : '',
    ...(design === 'team'
      ? designReferences.assets.map(
          (asset) => t('Referências de inspiração') + ': ' + asset.fileName,
        )
      : []),
    design === 'team' && designReferences.url
      ? t('Link de referência (opcional)') + ': ' + designReferences.url
      : '',
    t('Contacto') + ': ' + contact,
    buyerName ? t('Nome do comprador') + ': ' + buyerName : '',
    buyerEmail ? 'Email: ' + buyerEmail : '',
    address && delivery !== 'pickup' ? t('Morada') + ': ' + address : '',
    design !== 'standard' && designInstructions
      ? t('Instruções para o design') + ': ' + designInstructions.slice(0, 500)
      : '',
  ]
    .filter(Boolean)
    .join('\n');
  useEffect(() => {
    const previous = document.title;
    setPurchaseDocumentTitle(
      t('Etapa {0} de {1}', [String(currentStage + 1), String(stageCount)]) +
        ' · ' +
        t(
          currentStage === 0
            ? productTitle
            : currentKey === 'review' && quotation
              ? 'Reveja o pedido de cotação'
              : stageLabel,
        ) +
        ' · Framy Connect',
    );
    return () => {
      setPurchaseDocumentTitle(previous);
    };
  }, [
    currentStage,
    currentKey,
    stageCount,
    stageLabel,
    productTitle,
    quotation,
    t,
  ]);
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
        <small className="purchase-material-benefit">
          {t(
            material === 'Madeira'
              ? 'Acabamento natural'
              : material === 'Metal'
                ? 'Presença e resistência'
                : material === 'Couro'
                  ? 'Toque clássico'
                  : material === 'PVC + epóxi'
                    ? 'Leve e brilhante'
                    : 'Leve para o dia a dia',
          )}
        </small>
        <small className="material-price">
          {price ? money(price.amount, t.locale) : t('Sob consulta')}
          {availability[
            kind === 'card'
              ? ({ PVC: 'pvc', Madeira: 'wood', Metal: 'metal' }[material] ??
                '')
              : material === 'Couro'
                ? 'keychain-leather'
                : 'keychain'
          ] === false && (
            <span className="purchase-stock-note">
              {t('Disponibilidade a confirmar')}
            </span>
          )}
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
      data-purchase-format={format}
      data-purchase-step={paymentStep ? 'review' : activeConfiguration}
    >
      <span id="purchase-stage-anchor" aria-hidden="true" />
      <PurchaseStageProgress
        stages={route.map((item) => item.label)}
        step={currentStage}
        title={
          currentStage === 0
            ? productTitle
            : currentKey === 'review' && quotation
              ? 'Reveja o pedido de cotação'
              : undefined
        }
        onBackTo={(stage) => {
          setEditingReview(paymentStep || editingReview);
          const step = route[stage]?.key;
          if (step && step !== 'review') moveTo(step);
        }}
      />
      {currentStage === 0 && (
        <div className="purchase-stage-intro">
          <p>
            {t(
              format === 'kit'
                ? 'Escolha o material do cartão e do porta-chaves.'
                : 'Escolha o material que combina consigo.',
            )}
          </p>
          <button
            type="button"
            className="purchase-secondary-link"
            aria-expanded={productChoicesOpen}
            onClick={() => setProductChoicesOpen(!productChoicesOpen)}
          >
            {t('Alterar produto')}
          </button>
          {productChoicesOpen && (
            <fieldset
              className="purchase-switch-bar"
              aria-label={t('Escolher produto NFC')}
            >
              {purchaseFormats.map((item) => (
                <button
                  type="button"
                  key={item.id}
                  aria-pressed={format === item.id}
                  onClick={() => {
                    setFormat(item.id);
                    setEditingReview(false);
                    setStageError('');
                  }}
                >
                  {t(item.name)}
                </button>
              ))}
            </fieldset>
          )}
          <small>
            {t(
              'As escolhas ficam guardadas neste navegador durante 30 minutos após a última alteração.',
            )}
          </small>
        </div>
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
      {!paymentAvailable && !quotation && !paymentStep && currentStage < 3 && (
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
                      }}
                    >
                      {t('Frente')}
                    </button>
                    <button
                      type="button"
                      aria-pressed={cardBack}
                      onClick={() => {
                        setCardBack(true);
                      }}
                    >
                      {t('Verso')}
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
            {quotation && (
              <p className="purchase-quotation-notice">
                {t(
                  'Esta escolha requer cotação. Pode continuar a configurar; o preço e a disponibilidade serão confirmados antes de pagar.',
                )}
              </p>
            )}
            <button
              type="button"
              className="btn btn-primary material-continue"
              onClick={goToDesign}
            >
              {t(
                canReturnToReview
                  ? 'Guardar alterações'
                  : 'Continuar para o design',
              )}{' '}
              →
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
              <fieldset
                className="purchase-switch-bar"
                aria-label={t('Como pretende personalizar?')}
              >
                {designServices.map((item) => (
                  <button
                    type="button"
                    key={item.id}
                    aria-pressed={design === item.id}
                    onClick={() => {
                      setDesign(item.id);
                      setStageError('');
                    }}
                  >
                    {item.id === 'standard' ? (
                      <BadgeCheck size={18} aria-hidden="true" />
                    ) : item.id === 'customer' ? (
                      <Upload size={18} aria-hidden="true" />
                    ) : (
                      <PenTool size={18} aria-hidden="true" />
                    )}
                    <span>
                      {t(
                        item.id === 'standard'
                          ? 'Design Framy'
                          : item.id === 'customer'
                            ? 'O meu design'
                            : 'Criar com a Framy',
                      )}
                    </span>
                  </button>
                ))}
              </fieldset>
              <div className="purchase-service-description" aria-live="polite">
                <strong>
                  {designAmount === 0
                    ? t('Incluído')
                    : designAmount === null
                      ? t('Sob consulta')
                      : '+ ' + money(designAmount, t.locale)}
                </strong>
                <p>
                  {t(
                    design === 'standard'
                      ? 'Escolha um dos modelos Framy disponíveis.'
                      : design === 'customer'
                        ? 'No próximo passo, envie a sua arte e ajuste a posição e o tamanho.'
                        : 'No próximo passo, descreva a sua ideia e adicione referências. A equipa prepara o design para a sua aprovação.',
                  )}
                </p>
                {format === 'kit' && design !== 'standard' && (
                  <small>
                    {t(
                      'O valor de design apresentado aplica-se a esta encomenda do kit.',
                    )}
                  </small>
                )}
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
                      }}
                    >
                      {t(back ? 'Verso' : 'Frente')}
                    </button>
                  ))}
                </div>
                <div className="material-options">
                  {[card].map((material) => (
                    <div
                      key={material}
                      className={card === material ? 'is-selected' : ''}
                    >
                      <PurchasePreview
                        kind="product"
                        label={t('Cartão') + ' · ' + t(material)}
                      >
                        <CardMaterialImage
                          material={material}
                          back={cardBack}
                        />
                      </PurchasePreview>
                      <span>
                        {t(material)}
                        {material !== 'Madeira' && (
                          <> · {t(material === 'PVC' ? 'Laranja' : 'Preto')}</>
                        )}
                      </span>
                    </div>
                  ))}
                </div>
              </fieldset>
            )}
            {isPvcStandard && (
              <PvcConfigurator
                model={pvc}
                onChange={setPvc}
                back={pvcBack}
                onFaceChange={setPvcBack}
              />
            )}
            {isLeather && design === 'standard' && (
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
            <div className="purchase-step-actions">
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => moveTo('materials')}
              >
                {t('Voltar')}
              </button>
              <button
                type="button"
                className="btn btn-primary configuration-next"
                onClick={continueDesign}
              >
                {t(
                  design === 'customer'
                    ? 'Enviar o meu design'
                    : design === 'team'
                      ? 'Descrever a minha ideia'
                      : canReturnToReview
                        ? 'Guardar alterações'
                        : 'Continuar para entrega',
                )}{' '}
                →
              </button>
            </div>
          </fieldset>
          <fieldset
            id="personalise-panel"
            className="purchase-section configuration-panel"
            hidden={paymentStep || activeConfiguration !== 'personalise'}
          >
            <legend>{t('Personalize o seu produto')}</legend>
            {guestError && (
              <p role="alert" className="flow-inline-error">
                {t(
                  'Não foi possível preparar o carregamento. Tente novamente.',
                )}{' '}
                <button type="button" onClick={() => void prepareGuest()}>
                  {t('Tentar novamente')}
                </button>
              </p>
            )}
            {format === 'kit' && design !== 'standard' && (
              <fieldset
                className="purchase-switch-bar kit-editor-tabs"
                aria-label={t('Produto a personalizar')}
              >
                <button
                  type="button"
                  aria-pressed={kitEditor === 'card'}
                  onClick={() => setKitEditor('card')}
                >
                  {t('Cartão')}
                  {cardArtworkValue.assetId ? ' ✓' : ''}
                </button>
                <button
                  type="button"
                  aria-pressed={kitEditor === 'keychain'}
                  onClick={() => setKitEditor('keychain')}
                >
                  {t('Porta-chaves')}
                  {(isLeather ? leather.assetId : pvcArtworkValue.assetId)
                    ? ' ✓'
                    : ''}
                </button>
              </fieldset>
            )}
            <div className="purchase-active-design">
              <div className={design === 'team' ? 'team-design-workspace' : ''}>
                <div>
                  {design === 'team' && format === 'kit' && (
                    <p>
                      {t(
                        'Explique o que pretende no cartão e no porta-chaves.',
                      )}
                    </p>
                  )}
                  {isLeather && design === 'customer' && (
                    <div
                      className="kit-editor-pane"
                      hidden={format === 'kit' && kitEditor !== 'keychain'}
                    >
                      <LeatherConfigurator
                        notes={artworkNotes}
                        value={leather}
                        onChange={setLeather}
                        onPreviewChange={setLeatherPreview}
                        preview={leatherPreview}
                        design={design}
                        signedIn={signedIn || guestReady}
                        onBusy={setLeatherBusy}
                        dimensions={leatherDimensions}
                      />
                    </div>
                  )}
                  {design === 'customer' && format !== 'keychain' && (
                    <div
                      className="kit-editor-pane"
                      hidden={format === 'kit' && kitEditor !== 'card'}
                    >
                      <LeatherConfigurator
                        notes={artworkNotes}
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
                    </div>
                  )}
                  {design === 'customer' &&
                    format !== 'card' &&
                    keychain === 'PVC + epóxi' && (
                      <div
                        className="kit-editor-pane"
                        hidden={format === 'kit' && kitEditor !== 'keychain'}
                      >
                        <LeatherConfigurator
                          notes={artworkNotes}
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
                      </div>
                    )}
                  {design === 'team' && (
                    <label className="purchase-method">
                      {t(
                        design === 'team'
                          ? 'Descreva a sua ideia'
                          : 'Notas para a equipa (opcional)',
                      )}
                      <textarea
                        value={designInstructions}
                        onChange={(e) => setDesignInstructions(e.target.value)}
                        maxLength={2000}
                        rows={5}
                        className="design-brief-textarea"

                        placeholder={t(
                          design === 'team'
                            ? 'Que textos, cores e estilo pretende? Indique também o que deve aparecer no cartão e no porta-chaves.'
                            : 'Há algum detalhe que a equipa deva saber sobre a sua arte?',
                        )}
                      />
                      <small>
                        {t(
                          'A equipa revê as suas instruções e contacta-o para preparar o design. A produção começa após a sua aprovação.',
                        )}
                      </small>
                    </label>
                  )}
                  {design === 'team' && (
                    <DesignReferenceUpload
                      value={designReferences}
                      onChange={setDesignReferences}
                      onBusy={setReferencesBusy}
                      ready={signedIn || guestReady}
                    />
                  )}
                </div>
                {design === 'team' && (
                  <aside className="team-product-preview">
                    <h3>{t('O seu produto')}</h3>
                    <div className="team-reference-surface">
                      {(format === 'keychain' ||
                        (format === 'kit' && kitEditor === 'keychain')) &&
                      isLeather ? (
                        <LeatherPreview value={leather} design="team" />
                      ) : (
                        <ProductArtworkPreview
                          material={
                            format === 'keychain' ||
                            (format === 'kit' && kitEditor === 'keychain')
                              ? keychain
                              : card
                          }
                          value={defaultLeather}
                        />
                      )}
                    </div>
                    <p>
                      {t(
                        'A sua ideia será adaptada a este produto. A equipa apresenta a arte para aprovação antes da produção.',
                      )}
                    </p>
                  </aside>
                )}
              </div>
              <div className="purchase-step-actions">
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => moveTo('design')}
                >
                  {t('Voltar')}
                </button>
                <button
                  type="button"
                  className="btn btn-primary configuration-next"
                  onClick={goToDelivery}
                >
                  {t(
                    canReturnToReview
                      ? 'Guardar alterações'
                      : 'Continuar para entrega',
                  )}{' '}
                  →
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
            <h2 id="delivery-control" className="configuration-panel-heading">
              <Truck className="purchase-icon" size={20} aria-hidden="true" />
              {t('Como pretende receber?')}
            </h2>
            {deliveryAttempted && !!deliveryIssue && (
              <p
                id="delivery-validation"
                tabIndex={-1}
                role="alert"
                className="flow-inline-error"
              >
                {t(deliveryIssue)}
              </p>
            )}
            <DeliverySelector
              invalid={deliveryAttempted && !city}
              settings={fulfilmentSettings}
              city={city}
              mode={delivery}
              point={pickupPoint}
              onCity={(id) => {
                setCity(id);
                const nextPoint =
                  fulfilmentSettings?.points.find(
                    (p) => p.cityId === id && p.active,
                  )?.id ?? '';
                setPickupPoint(nextPoint);
                if (delivery === 'pickup' && !nextPoint)
                  setDelivery('standard');
              }}
              onMode={setDelivery}
              onPoint={setPickupPoint}
            />
            {city === 'other' && (
              <label>
                {t('Cidade ou localidade')}
                <input
                  value={locality}
                  maxLength={100}
                  onChange={(e) => setLocality(e.target.value)}
                  aria-invalid={deliveryAttempted && !locality.trim()}
                />
              </label>
            )}
            {city && delivery !== 'pickup' && (
              <label>
                {t('Bairro, morada e ponto de referência')}
                <textarea
                  value={address}
                  aria-invalid={deliveryAttempted && address.trim().length < 8}
                  aria-describedby={
                    deliveryAttempted &&
                    deliveryIssue ===
                      'Indique a morada e um ponto de referência.'
                      ? 'delivery-validation'
                      : undefined
                  }
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
                onClick={() =>
                  moveTo(design === 'standard' ? 'design' : 'personalise')
                }
              >
                {t('Voltar')}
              </button>
              <button
                type="button"
                className="btn btn-primary configuration-next"
                onClick={continueDelivery}
              >
                {t(
                  canReturnToReview
                    ? 'Guardar alterações'
                    : 'Continuar para os dados',
                )}{' '}
                →
              </button>
            </div>
          </section>
          <section
            id="buyer-panel"
            className="purchase-section configuration-panel"
            hidden={paymentStep || activeConfiguration !== 'buyer'}
            aria-label={t('Os seus dados')}
          >
            <h2 className="configuration-panel-heading">
              {t('Os seus dados')}
            </h2>
            <p>{t('Indique os dados para acompanhar a sua encomenda.')}</p>
            {buyerAttempted && buyerIssue && (
              <p
                id="buyer-validation"
                tabIndex={-1}
                role="alert"
                className="flow-inline-error"
              >
                {t(buyerIssue)}
              </p>
            )}
            {!signedIn && (
              <div className="purchase-guest-note">
                <p>{t('Não precisa de criar conta para comprar.')}</p>
                <Link
                  href={
                    '/entrar?return_to=' +
                    encodeURIComponent('/comprar?formato=' + format)
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
            <div className="guest-buyer-fields">
              <label>
                {t('Nome do comprador')}
                <input
                  readOnly={signedIn}
                  autoComplete="name"
                  aria-invalid={buyerAttempted && buyerName.trim().length < 2}
                  aria-describedby={
                    buyerAttempted && !buyerReady
                      ? 'buyer-validation'
                      : undefined
                  }
                  value={buyerName}
                  maxLength={100}
                  onChange={(e) => setBuyerName(e.target.value)}
                />
              </label>
              <label>
                {t('Email para a referência e confirmação')}
                <input
                  readOnly={signedIn}
                  type="email"
                  aria-invalid={
                    buyerAttempted &&
                    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(buyerEmail.trim())
                  }
                  aria-describedby={
                    buyerAttempted && !buyerReady
                      ? 'buyer-validation'
                      : undefined
                  }
                  autoComplete="email"
                  value={buyerEmail}
                  maxLength={254}
                  onChange={(e) => setBuyerEmail(e.target.value)}
                />
              </label>
            </div>
            <label>
              {delivery === 'pickup'
                ? t('Contacto para o aviso de levantamento')
                : t('Contacto do destinatário')}
              <PhoneInput
                value={contact}
                aria-invalid={
                  buyerAttempted &&
                  (contact.replace(/\D/g, '').length < 7 ||
                    contact.replace(/\D/g, '').length > 15)
                }
                aria-describedby={
                  buyerAttempted &&
                  buyerIssue === 'Indique um número de contacto válido.'
                    ? 'buyer-validation'
                    : undefined
                }
                onValueChange={setContact}
                maxLength={50}
                autoComplete="tel"
                placeholder="+258"
              />
            </label>
            <div className="purchase-step-actions">
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => moveTo('delivery')}
              >
                {t('Voltar')}
              </button>
              <button
                type="button"
                className="btn btn-primary configuration-next"
                onClick={continueBuyer}
              >
                {t(
                  canReturnToReview
                    ? 'Guardar alterações'
                    : 'Continuar para o desconto',
                )}{' '}
                →
              </button>
            </div>
          </section>
          <section
            id="coupon-panel"
            className="purchase-section configuration-panel"
            hidden={paymentStep || activeConfiguration !== 'coupon'}
            aria-label={t('O seu desconto')}
          >
            <PurchaseCouponStep
              initialCode={restoredCode}
              appliedCode={ambassadorCode}
              savings={discount}
              quotation={quotation}
              onChange={changeReferral}
              onContinue={() => showSummary()}
              onSkip={() => {
                setRestoredCode('');
                changeReferral('', true);
                showSummary(true);
              }}
              onBack={() => moveTo('buyer')}
            />
          </section>
        </div>
        {paymentStep && (
          <section
            id="purchase-summary"
            tabIndex={-1}
            className="configuration-summary"
            aria-label={t(
              quotation ? 'O seu pedido de cotação' : 'A sua encomenda',
            )}
          >
            <h2>
              <ClipboardList
                className="purchase-icon"
                size={20}
                aria-hidden="true"
              />
              {t(quotation ? 'O seu pedido de cotação' : 'A sua encomenda')}
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
                    {design === 'customer' && cardArtwork[material] ? (
                      <ProductArtworkPreview
                        material={material}
                        value={cardArtworkValue}
                        preview={cardCustomPreview}
                        back={false}
                      />
                    ) : design === 'customer' && material === 'PVC + epóxi' ? (
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
                        preview={
                          design === 'customer' ? leatherPreview : undefined
                        }
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
                    <figcaption>
                      {t(material)} · {t('Quantidade')}: 1
                    </figcaption>
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
                {t(selectedDesign.name)}
                {design === 'customer' ? ` · ${t(method)}` : ''}
              </p>
            </div>
            <p className="purchase-preview-note">
              {t(
                design === 'standard'
                  ? 'Este é o modelo escolhido. O perfil digital é configurado após o pagamento.'
                  : 'Pré-visualização da arte personalizada. O perfil digital é configurado depois da compra; a equipa confirma a arte física antes da produção.',
              )}
            </p>
            {design === 'team' && (
              <p className="purchase-preview-note">
                {t('O design será preparado pela equipa para a sua aprovação.')}
              </p>
            )}
            {design !== 'standard' && designInstructions && (
              <details className="purchase-review-instructions">
                <summary>{t('Instruções para o design')}</summary>
                <p>{designInstructions}</p>
              </details>
            )}
            {design === 'team' &&
              (designReferences.assets.length > 0 || designReferences.url) && (
                <section className="purchase-review-references">
                  <h3>{t('Referências de inspiração')}</h3>
                  <p>
                    {t(
                      'Referências para orientar o design, não para impressão.',
                    )}
                  </p>
                  <ul className="design-reference-list">
                    {designReferences.assets.map((asset) => (
                      <li key={asset.assetId}>
                        {/\.pdf$/i.test(asset.fileName) ? (
                          <span>PDF</span>
                        ) : (
                          <SourceImage
                            src={'/api/design-assets/' + asset.assetId}
                            alt={asset.fileName}
                            width={100}
                            height={80}
                          />
                        )}
                        <span>{asset.fileName}</span>
                      </li>
                    ))}
                  </ul>
                  {designReferences.url && (
                    <a
                      href={designReferences.url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {t('Abrir referência')}
                    </a>
                  )}
                  {quotation && (
                    <p>
                      {t(
                        'Os ficheiros de referência não são anexados automaticamente à mensagem de cotação.',
                      )}
                    </p>
                  )}
                </section>
              )}
            <div className="purchase-review-edits">
              <button type="button" onClick={() => editStage('materials')}>
                {t('Editar produto')}
              </button>
              <button type="button" onClick={() => editStage('design')}>
                {t('Editar design')}
              </button>
              {design !== 'standard' && (
                <button type="button" onClick={() => editStage('personalise')}>
                  {t('Editar personalização')}
                </button>
              )}
            </div>
            <div hidden={!paymentStep} className="purchase-review-details">
              <section className="purchase-delivery-review">
                <div>
                  <h3>{t('Entrega')}</h3>
                  <button
                    type="button"
                    aria-label={t('Editar entrega')}
                    onClick={() => editStage('delivery')}
                  >
                    {t('Editar')}
                  </button>
                </div>
                <p>
                  {fulfilmentSettings?.cities.find((item) => item.id === city)
                    ?.name ??
                    (locality || t('Outra cidade / localidade'))}
                  {' · '}
                  {t(
                    delivery === 'pickup'
                      ? 'Levantamento'
                      : delivery === 'express'
                        ? 'Expresso'
                        : 'Entrega',
                  )}
                </p>
                <p>
                  {delivery === 'pickup' ? fulfilment?.point?.name : address}
                </p>
              </section>
              <section className="purchase-delivery-review">
                <div>
                  <h3>{t('Os seus dados')}</h3>
                  <button type="button" onClick={() => editStage('buyer')}>
                    {t('Editar dados')}
                  </button>
                </div>
                <p>
                  {buyerName} · {buyerEmail}
                </p>
                <p>{contact}</p>
              </section>

              <div className="purchase-review-coupon">
                <div>
                  <h3>{t('O seu desconto')}</h3>
                  <button
                    type="button"
                    className="purchase-secondary-link"
                    onClick={() => editStage('coupon')}
                  >
                    {t('Editar cupão')}
                  </button>
                </div>
                <p>
                  {ambassadorCode
                    ? t(
                        quotation
                          ? 'Cupão para verificação'
                          : 'Cupão aplicado!',
                      ) +
                      ' · ' +
                      ambassadorCode
                    : t('Sem cupão aplicado.')}
                </p>
              </div>
              {quotation && <h3>{t('Valores de referência')}</h3>}
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
                    <dt>{t('Desconto do cupão')}</dt>
                    <dd>
                      {quotation
                        ? t('A confirmar na cotação')
                        : '−' + money(discount, t.locale)}
                    </dd>
                  </div>
                )}
                <div>
                  <dt>{t('Design')}</dt>
                  <dd>
                    {designAmount === null
                      ? t('Sob consulta')
                      : designAmount === 0
                        ? t('Incluído')
                        : money(designAmount, t.locale)}
                  </dd>
                </div>
                <div>
                  <dt>
                    {t(
                      delivery === 'pickup'
                        ? 'Levantamento'
                        : delivery === 'express'
                          ? 'Expresso'
                          : 'Entrega',
                    )}
                  </dt>
                  <dd>
                    {fulfilment
                      ? fulfilment.fee === 0
                        ? t('Gratuito')
                        : money(fulfilment.fee, t.locale)
                      : t('Sob cotação')}
                  </dd>
                </div>
              </dl>
              {!quotation && !!estimate?.saving && (
                <p className="purchase-saving">
                  {t('Poupa {0} face aos produtos separados.', [
                    money(estimate.saving, t.locale),
                  ])}
                </p>
              )}
            </div>
            {!quotation && (
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
            )}
            <div hidden={!paymentStep} className="purchase-payment-stage">
              <button
                type="button"
                className="purchase-secondary-link"
                onClick={() => editStage('coupon')}
              >
                {t('Voltar ao desconto')}
              </button>
              {paymentAvailable && total !== null && !deliveryReady && (
                <p className="purchase-help">
                  {!buyerReady
                    ? t('Preencha o nome e o email na etapa dos seus dados.')
                    : delivery === 'pickup'
                      ? t('Indique o contacto para o aviso de levantamento.')
                      : t('Preencha o contacto e a morada para continuar.')}
                </p>
              )}
              {paymentAvailable && !deliveryReady && (
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    if (!checkReception()) return;
                    checkBuyer();
                  }}
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
                          moveTo('personalise');
                        }}
                      >
                        {t('Completar design')}
                      </button>
                    )}
                  </div>
                )}
              {quotation ? (
                <PurchaseQuotation summary={quotationSummary} />
              ) : paymentAvailable ? (
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
                        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
                          buyerEmail.trim(),
                        ))) ||
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
                    designInstructions:
                      design === 'standard' ? '' : designInstructions,
                    ...(design === 'team' ? { designReferences } : {}),

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
