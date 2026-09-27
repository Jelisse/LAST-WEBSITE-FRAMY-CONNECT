import { database } from './server-db';
import { profileForAccess, type Membership } from './entitlement';
import type { Profile } from './domain';
export async function profileMembership(owner: string) {
  return database()
    .prepare('SELECT * FROM profile_membership_view WHERE owner_id=?')
    .bind(owner)
    .first<Membership & { version: number }>();
}
export async function publishedProfile(owner: string, profile: Profile) {
  return profileForAccess(profile, await profileMembership(owner));
}
