import { expiryDate, profileAccess, type Membership } from './entitlement.ts';

export function renewalLink(origin = 'https://framyconnect.co.mz') {
  return origin.replace(/\/$/, '') + '/perfil?plans=1';
}

export function whatsappReminderURL(phone: string, message: string) {
  const normalized = phone.trim().replace(/[ ()-]/g, '').replace(/^00/, '+');
  if (!/^\+[1-9]\d{7,14}$/.test(normalized)) return null;
  return `https://wa.me/${normalized.slice(1)}?text=${encodeURIComponent(message)}`;
}

export function manualRenewal(
  member: Membership & { name: string },
  daysBefore = 7,
  now = Date.now(),
) {
  const expiry = expiryDate(member);
  const state = profileAccess(member, now);
  if (!expiry || state === 'inactive' || state === 'launch' ||
      (member.plan_id === 'free-30' && member.billing_enabled !== 1) ||
      member.next_starts_at || Date.parse(expiry) - now > daysBefore * 86400000) return null;
  let plan = ({ personal: 'Individual', 'professional-v2': 'Profissional', 'free-30': 'Experiência gratuita de 30 dias' } as Record<string,string>)[member.plan_id] ?? member.plan_id;
  try { plan = JSON.parse(member.terms_json ?? '{}').name || plan; } catch { /* Legacy terms. */ }
  const expired = Date.parse(expiry) <= now;
  const date = new Date(expiry).toLocaleDateString('pt-MZ', { timeZone: 'Africa/Maputo' });
  return {
    expiry, expired, plan,
    message: `Olá, ${member.name}. O seu pacote ${plan} ${expired ? 'terminou' : 'termina'} em ${date}. Consulte os pacotes e renove aqui: ${renewalLink()}. A renovação depende da confirmação do pagamento; não há débito automático. Framy Connect.`,
  };
}
