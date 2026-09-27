import type { Profile } from './domain';
import { whatsappURL } from './profile-business';
// Only currently published, explicit actions can be measured. Never store destination URLs.
export function engagementLabel(
  profile: Profile,
  target: unknown,
): string | null {
  if (target === 'enquiry' && profile.extras?.enquiries)
    return 'Pedido de informação';
  if (typeof target === 'string' && /^service:[0-5]$/.test(target)) {
    const offer = profile.extras?.services[Number(target.slice(8))];
    return offer?.url ? offer.title : null;
  }
  if (target === 'contact') return 'Descarregar contacto';
  if (target === 'whatsapp' && whatsappURL(profile.business)) return 'WhatsApp';
  if (target === 'directions' && profile.business?.address)
    return 'Como chegar';
  if (target === 'email' && profile.showEmail && profile.email) return 'Email';
  if (target === 'phone' && profile.showPhone && profile.phone)
    return 'Telefone';
  if (target === 'website' && profile.website) return 'Website';
  if (typeof target === 'string' && /^link:\d{1,2}$/.test(target))
    return profile.links?.[Number(target.slice(5))]?.label ?? null;
  return null;
}
