import type { PublicProduct } from './catalog';
import type { Profile, PlanId, ManagedPlan } from './domain';
export type WorkspaceData = {
  products: PublicProduct[];
  plans: ManagedPlan[];
  canManageProducts: boolean;
  canManageOrders: boolean;
  profile: Profile | null;
  published: boolean;
  publishedUsername: string | null;
  profileVersion: number;
  membership: {
    terms: ManagedPlan;
    planId: PlanId;
    version: number;
    mode: 'trial' | 'paid';
    accessState?: import('./entitlement').AccessState;
    billingAvailable?: boolean;
    daysRemaining?: number | null;
    active: boolean;
    expiresAt: string | null;
    launchExtended?: boolean;
  };
  orders: import('./customer-order').CustomerOrder[];
  events: { id: string; orderId: string; action: string; createdAt: string }[];
};
