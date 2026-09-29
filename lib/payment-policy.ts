// Gateway migration: never return the retired fixed-price link, including for old orders.
// A replacement must create a server-side session for the immutable order total.
export function paymentLink(_order: {
  productId: string;
  amount: number;
  status: string;
  paid: boolean;
  reservationExpiresAt?: string;
  createdAt?: string;
}): string | null {
  return null;
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
