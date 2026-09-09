export function validateDelivery(input: Record<string, unknown>) {
  const city = input.deliveryCity,
    address = input.deliveryAddress ?? '';
  if (
    typeof city !== 'string' ||
    city.trim().length < 2 ||
    city.trim().length > 90 ||
    /[\u0000-\u001f]/.test(city)
  )
    throw Error(
      'Indique a cidade ou localidade de entrega (2 a 90 caracteres).',
    );
  if (
    typeof address !== 'string' ||
    address.trim().length > 300 ||
    /[\u0000-\u0008]/.test(address)
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
