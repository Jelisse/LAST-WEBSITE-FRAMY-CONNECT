import type { Profile } from './domain.ts';
export type ShowcaseItem = {
  englishTitle?: string;
  englishDescription?: string;
  englishPrice?: string;
  title: string;
  description: string;
  price: string;
  url: string;
};
export type ProfileExtras = {
  services: ShowcaseItem[];
  enquiries: boolean;
  english: { title: string; bio: string; hours: string };
  visibleLinks: string[] | null;
  primaryContact: string;
};
export const defaultExtras: ProfileExtras = {
  services: [],
  enquiries: false,
  english: { title: '', bio: '', hours: '' },
  visibleLinks: null,
  primaryContact: '',
};
export function cleanText(
  value: unknown,
  max: number,
  required = false,
): string {
  if (
    typeof value !== 'string' ||
    value.length > max ||
    Array.from(value).some(
      (c) => c.charCodeAt(0) < 32 && !['\n', '\r', '\t'].includes(c),
    )
  )
    throw Error('Texto inválido ou demasiado longo.');
  const text = value.trim();
  if (required && !text) throw Error('Preencha os campos obrigatórios.');
  return text;
}
export function safeLink(value: unknown): string {
  const text = cleanText(value, 300);
  if (!text) return '';
  const u = new URL(text);
  if (u.protocol !== 'https:' || u.username || u.password)
    throw Error('Use um endereço HTTPS sem credenciais.');
  return u.href;
}
export function validateExtras(value: unknown): ProfileExtras {
  if (value === undefined)
    return {
      ...defaultExtras,
      services: [],
      english: { ...defaultExtras.english },
    };
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw Error('Conteúdo adicional inválido.');
  const b = value as Record<string, unknown>;
  const services = b.services ?? [];
  if (!Array.isArray(services) || services.length > 6)
    throw Error('Pode apresentar até 6 produtos ou serviços.');
  const english = (b.english ?? {}) as Record<string, unknown>;
  const visible = b.visibleLinks ?? null;
  if (
    visible !== null &&
    (!Array.isArray(visible) ||
      visible.length > 50 ||
      visible.some((x) => typeof x !== 'string' || x.length > 300) ||
      new Set(visible).size !== visible.length)
  )
    throw Error('Selecção de links inválida.');
  if (typeof (b.enquiries ?? false) !== 'boolean')
    throw Error('Preferência de contacto inválida.');
  return {
    services: services.map((s) => ({
      title: cleanText(s?.title, 80, true),
      englishTitle: cleanText(s?.englishTitle ?? '', 80),
      englishDescription: cleanText(s?.englishDescription ?? '', 300),
      englishPrice: cleanText(s?.englishPrice ?? '', 60),
      description: cleanText(s?.description ?? '', 300),
      price: cleanText(s?.price ?? '', 60),
      url: safeLink(s?.url ?? ''),
    })),
    enquiries: b.enquiries === true,
    english: {
      title: cleanText(english.title ?? '', 120),
      bio: cleanText(english.bio ?? '', 600),
      hours: cleanText(english.hours ?? '', 240),
    },
    visibleLinks: visible as string[] | null,
    primaryContact: cleanText(b.primaryContact ?? '', 300),
  };
}
export function visibleProfileLinks(p: Profile, limit: number) {
  const selected = p.extras?.visibleLinks;
  return (p.links ?? [])
    .filter(
      (l) =>
        selected === null || selected === undefined || selected.includes(l.url),
    )
    .slice(0, limit);
}
export function calendarMonthAfter(value: string): string {
  const d = new Date(value);
  if (!Number.isFinite(d.getTime())) throw Error('Data inválida.');
  const day = d.getUTCDate();
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() + 1);
  const last = new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0),
  ).getUTCDate();
  d.setUTCDate(Math.min(day, last));
  return d.toISOString();
}
export function validateHostname(value: unknown): string {
  const h = cleanText(value, 253, true).toLowerCase();
  if (
    !/^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/.test(h) ||
    h.endsWith('.local') ||
    h.endsWith('.localhost') ||
    h.endsWith('.workers.dev') ||
    h.endsWith('.pages.dev') ||
    h === 'framyconnect.co.mz' ||
    h.endsWith('.framyconnect.co.mz')
  )
    throw Error('Indique um domínio público seu, sem https:// ou caminhos.');
  return h;
}
