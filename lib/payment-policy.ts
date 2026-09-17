import { PAYMENT_URL } from './customisation';
// This merchant checkout has a fixed price. Never use it for another amount/product.
export function paymentLink(order: {
  productId: string;
  amount: number;
  status: string;
  paid: boolean;
  reservationExpiresAt?: string;
  createdAt?: string;
}) {
  if (
    order.reservationExpiresAt &&
    Date.parse(order.reservationExpiresAt) <= Date.now()
  )
    return null;
  if (
    !order.reservationExpiresAt &&
    order.createdAt &&
    Date.parse(order.createdAt) + 86400000 <= Date.now()
  )
    return null;
  return order.productId === 'keychain' &&
    order.amount === 50000 &&
    order.status === 'PENDING_PAYMENT' &&
    !order.paid
    ? PAYMENT_URL
    : null;
}
export function validatePaymentEvidence(
  input: Record<string, unknown>,
  amount: number,
) {
  const reference =
    typeof input.paymentReference === 'string'
      ? input.paymentReference.trim()
      : '';
  if (!/^[A-Za-z0-9][A-Za-z0-9._:/-]{5,119}$/.test(reference))
    throw Error(
      'Indique a referência única da transacção no prestador (6–120 caracteres).',
    );
  if (
    input.verifiedInProvider !== true ||
    input.verifiedAmount !== amount ||
    input.currency !== 'MZN'
  )
    throw Error(
      'Confirme no prestador a referência, o valor exacto e a moeda MZN antes de registar.',
    );
  return reference;
}
