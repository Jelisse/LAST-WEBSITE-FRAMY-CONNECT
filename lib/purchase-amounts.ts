// Amounts are integer MZN minor units. Discount only reduces physical hardware.
export function purchaseAmounts(
  hardware: number | null,
  discount: number,
  design: number | null,
  delivery: number | null,
) {
  if (
    !Number.isSafeInteger(discount) ||
    discount < 0 ||
    (hardware !== null &&
      (!Number.isSafeInteger(hardware) ||
        hardware <= 0 ||
        discount > hardware)) ||
    [design, delivery].some(
      (value) => value !== null && (!Number.isSafeInteger(value) || value < 0),
    )
  )
    throw Error('Preço inválido.');
  const subtotal = hardware === null ? null : hardware - discount;
  const total =
    subtotal !== null && design !== null && delivery !== null
      ? subtotal + design + delivery
      : null;
  if (total !== null && (!Number.isSafeInteger(total) || total <= 0))
    throw Error('Preço inválido.');
  return { subtotal, total };
}
