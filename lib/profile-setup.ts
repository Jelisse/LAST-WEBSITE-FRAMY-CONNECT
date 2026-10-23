import { validateProfile, type Profile } from './domain.ts';

export function profileIssueLocation(message: string) {
  if (/utilizador|username/i.test(message))
    return { step: 0, field: 'username' };
  if (/seu nome|campo name/i.test(message)) return { step: 0, field: 'name' };
  if (/email/i.test(message)) return { step: 1, field: 'email' };
  if (/telefone|campo phone/i.test(message)) return { step: 1, field: 'phone' };
  if (/website/i.test(message)) return { step: 1, field: 'website' };
  if (/link/i.test(message)) return { step: 1, field: '' };
  return { step: 2, field: '' };
}
export function profileSetupIssue(profile: Profile) {
  try {
    validateProfile(profile);
    return null;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Perfil inválido.';
    return { message, ...profileIssueLocation(message) };
  }
}
export function resumeProfileStep(profile: Profile | null) {
  if (!profile?.name.trim() || !profile.username) return 0;
  if (
    !profile.email &&
    !profile.phone &&
    !profile.website &&
    !profile.links?.length
  )
    return 1;
  return 2;
}
