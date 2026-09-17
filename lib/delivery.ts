export function validateDelivery(input: Record<string, unknown>) {
  const city = input.deliveryCity,
    address = input.deliveryAddress ?? '';
  if (
    typeof city !== 'string' ||
    city.trim().length < 2 ||
    city.trim().length > 90 ||
    Array.from(city).some((c) => c.charCodeAt(0) < 32)
  )
    throw Error(
      'Indique a cidade ou localidade de entrega (2 a 90 caracteres).',
    );
  if (
    typeof address !== 'string' ||
    address.trim().length > 300 ||
    Array.from(address).some((c) => c.charCodeAt(0) < 9)
  )
    throw Error('Os detalhes da entrega devem ter até 300 caracteres.');
  return { deliveryCity: city.trim(), deliveryAddress: address.trim() };
}
export function canEditDelivery(order: {
  status: string;
  agent: string;
  deliveryCity?: string;
}) {
  return (
    !['DELIVERED', 'CANCELLED'].includes(order.status) &&
    (!order.agent || !order.deliveryCity)
  );
}
