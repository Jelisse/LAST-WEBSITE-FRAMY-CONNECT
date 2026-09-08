import type { Profile, SandboxOrder } from './domain';
export type WorkspaceData = {
  profile: Profile | null;
  published: boolean;
  publishedUsername: string | null;
  profileVersion: number;
  orders: SandboxOrder[];
  events: { id: string; orderId: string; action: string; createdAt: string }[];
};
