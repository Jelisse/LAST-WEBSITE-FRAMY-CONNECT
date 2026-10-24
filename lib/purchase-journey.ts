export const purchaseStageKeys = [
  'materials',
  'design',
  'personalise',
  'delivery',
  'buyer',
  'coupon',
  'review',
] as const;
export type PurchaseStep = (typeof purchaseStageKeys)[number];
export type PurchaseEditorStep = Exclude<PurchaseStep, 'review'>;
export const purchaseStages = [
  'Escolha o seu produto NFC',
  'Escolha o design',
  'Personalize o seu produto',
  'Escolha como receber',
  'Os seus dados',
  'O seu desconto',
  'Reveja e confirme',
] as const;
export function purchaseJourney(
  design: string,
  readyKit = false,
  cardOnly = false,
) {
  return purchaseStageKeys
    .filter((key) =>
      readyKit
        ? !['design', 'personalise'].includes(key)
        : key !== 'personalise' || design !== 'standard',
    )
    .filter((key) => !cardOnly || key !== 'design')
    .map((key) => ({
      key,
      label:
        readyKit && key === 'materials'
          ? 'Escolha o seu kit NFC'
          : purchaseStages[purchaseStageKeys.indexOf(key)],
    }));
}
export function purchaseResumeStep(
  format: string,
  design: string,
  step: PurchaseEditorStep,
): PurchaseEditorStep {
  if (format === 'kit' && (step === 'design' || step === 'personalise'))
    return 'materials';
  if (
    format === 'card' &&
    (step === 'design' || (step === 'personalise' && design === 'standard'))
  )
    return 'materials';
  if (step === 'personalise' && design === 'standard') return 'design';
  return step;
}
export function purchaseReceptionIssue(input: {
  city: string;
  locality?: string;
  address: string;
  delivery: string;
  fulfilmentReady: boolean;
  quotation: boolean;
}) {
  if (!input.city) return 'Escolha a cidade para continuar.';
  if (input.city === 'other' && !input.locality?.trim())
    return 'Indique a cidade ou localidade.';
  if (input.delivery !== 'pickup' && input.address.trim().length < 8)
    return 'Indique a morada e um ponto de referência.';
  if (!input.fulfilmentReady && !input.quotation)
    return 'Escolha uma forma de recepção disponível.';
  return '';
}
export function purchaseBuyerIssue(input: {
  buyerReady: boolean;
  contact: string;
}) {
  if (!input.buyerReady)
    return 'Preencha o nome e um email válido para continuar.';
  const length = input.contact.replace(/\D/g, '').length;
  if (length < 7 || length > 15) return 'Indique um número de contacto válido.';
  return '';
}
export function purchaseConfigurationIssue(
  input: {
    materialReady: boolean;
    allowQuotation?: boolean;
    artworkMissing: boolean;
    instructionsMissing: boolean;
    uploadBusy: boolean;
  },
  stage: 0 | 1,
) {
  if (!input.materialReady && !input.allowQuotation)
    return 'O preço deste produto precisa de confirmação. Escolha outro material ou contacte a Framy Connect.';
  if (stage === 1) {
    if (input.uploadBusy) return 'Aguarde o fim do carregamento do design.';
    if (input.artworkMissing)
      return 'Carregue o design de cada produto personalizado antes de continuar.';
    if (input.instructionsMissing)
      return 'Escreva as instruções para a equipa antes de continuar.';
  }
  return null;
}

export function purchaseMoney(minor: number, locale = 'pt-MZ') {
  return (
    new Intl.NumberFormat(locale, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(minor / 100) + ' MT'
  );
}

export function purchaseDeliveryIssue(input: {
  city: string;
  locality?: string;
  buyerReady: boolean;
  contact: string;
  address: string;
  delivery: string;
  fulfilmentReady: boolean;
  quotation: boolean;
}) {
  if (!input.city) return 'Escolha a cidade para continuar.';
  if (input.city === 'other' && !input.locality?.trim())
    return 'Indique a cidade ou localidade.';
  if (!input.buyerReady)
    return 'Preencha o nome e um email válido para continuar.';
  if (
    input.contact.replace(/\D/g, '').length < 7 ||
    input.contact.replace(/\D/g, '').length > 15
  )
    return 'Indique um número de contacto válido.';
  if (input.delivery !== 'pickup' && input.address.trim().length < 8)
    return 'Indique a morada e um ponto de referência.';
  if (!input.fulfilmentReady && !input.quotation)
    return 'Escolha uma forma de recepção disponível.';
  return '';
}
