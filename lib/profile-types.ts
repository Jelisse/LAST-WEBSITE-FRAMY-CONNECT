import type { PublicProduct } from './catalog';
import type { Profile, SandboxOrder, PlanId } from './domain';
export type WorkspaceData = {
  products: PublicProduct[];
  canManageProducts: boolean;
  profile: Profile | null;
  published: boolean;
  publishedUsername: string | null;
  profileVersion: number;
  membership: { planId: PlanId; version: number; mode: 'sandbox' };
  orders: SandboxOrder[];
  events: { id: string; orderId: string; action: string; createdAt: string }[];
};
