import type { SandboxOrder } from './domain';

// Explicit public contract: new internal fields must never reach customers by default.
export function customerOrder(order: SandboxOrder, agentContact?: { name: string; phone: string }) {
  return {
    id: order.id,
    agentContact,
    productId: order.productId,
    productName: order.productName,
    amount: order.amount,
    status: order.status,
    paid: order.paid,
    agent: order.agent,
    refunded: order.refunded,
    qc: order.qc,
    proof: order.proof,
    version: order.version,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
    deliveryCity: order.deliveryCity,
    deliveryAddress: order.deliveryAddress,
    deliveryContact: order.deliveryContact,
    profileUsername: order.profileUsername,
    approvedProfileVersion: order.approvedProfileVersion,
    checkoutPlan: order.checkoutPlan,
    reservationExpiresAt: order.reservationExpiresAt,
    cancellationReason: order.cancellationReason,
  };
}
export type CustomerOrder = ReturnType<typeof customerOrder>;
