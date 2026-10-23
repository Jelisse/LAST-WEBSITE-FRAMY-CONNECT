export type PurchasePayment = {
  id: string;
  paymentReference: string;
  orderReference?: string | null;
  kind: string;
  amount: number;
  status: string;
  cycle: string;
  created_at?: string;
  orderStatus?: string | null;
  product?: { name: string; image: string; selection: string } | null;
};
// Only expose a short product description; artwork, profile snapshots and addresses stay private.
export function purchaseProduct(raw: string | null | undefined) {
  try {
    const value = JSON.parse(raw || '{}');
    if (value.format === 'card')
      return {
        name: 'Cartão NFC',
        image: '/home/card-packaging-orange-cutout.webp',
        selection:
          value.card === 'Madeira'
            ? 'wood'
            : value.card === 'Metal'
              ? 'metal'
              : 'card',
      };
    if (value.format === 'keychain')
      return {
        name: 'Porta-chaves NFC',
        image:
          value.keychain === 'Couro'
            ? '/products/leather/brown-full.png'
            : '/products/pvc/pattern-front.png',
        selection: value.keychain === 'Couro' ? 'keychain-leather' : 'keychain',
      };
    if (value.format === 'kit')
      return {
        name: 'Kit: cartão + porta-chaves',
        image: '/home/kit-gift-box-cutout.webp',
        selection: 'kit',
      };
  } catch {
    /* Historical records may not contain a configuration. */
  }
  return null;
}
export function purchaseHistory(payments: PurchasePayment[]) {
  const grouped = new Map<string, PurchasePayment>();
  const priority: Record<string, number> = {
    paid: 5,
    review: 4,
    pending: 3,
    creating: 2,
    failed: 1,
  };
  for (const payment of payments) {
    const key = payment.orderReference || payment.id;
    const previous = grouped.get(key);
    if (
      !previous ||
      (priority[payment.status] ?? 0) > (priority[previous.status] ?? 0)
    )
      grouped.set(key, payment);
  }
  return [...grouped.values()].sort((a, b) =>
    (b.created_at || '').localeCompare(a.created_at || ''),
  );
}
export const purchaseStatus: Record<string, string> = {
  paid: 'Pagamento confirmado',
  pending: 'A aguardar pagamento',
  failed: 'Pagamento não concluído',
  creating: 'A verificar pagamento',
  review: 'Pagamento em revisão pela equipa',
};
