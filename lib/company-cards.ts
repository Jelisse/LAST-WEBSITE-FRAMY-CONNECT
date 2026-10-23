import {
  blankProfile,
  validateProfile,
  publicProfile,
  type Profile,
} from './domain.ts';
import { defaultBusiness, isProfileColor } from './profile-business.ts';
export type CompanyTemplate = {
  company: string;
  headline: string;
  website: string;
  accent: string;
  design?: 'mountain' | 'minimal' | 'editorial';
  logoUrl?: string;
  coverUrl?: string;
  internalName?: string;
  editable?: string[];
};
export type CompanyCard = {
  internalName?: string;
  name: string;
  title: string;
  email: string;
  phone: string;
  showEmail: boolean;
  showPhone: boolean;
  photoUrl?: string;
  whatsapp?: string;
  links?: { label: string; url: string }[];
};
function hasControls(value: string, multiline = false) {
  for (let i = 0; i < value.length; i++) {
    const code = value.charCodeAt(i);
    if (code < 32 && !(multiline && [9, 10, 13].includes(code))) return true;
  }
  return false;
}
const text = (v: unknown, max: number, multiline = false) => {
  if (typeof v !== 'string' || v.length > max || hasControls(v, multiline))
    throw Error('Dados inválidos.');
  return v.trim();
};
export function companyTemplate(input: unknown): CompanyTemplate {
  if (!input || typeof input !== 'object' || Array.isArray(input))
    throw Error('Dados inválidos.');
  const b = input as Record<string, unknown>,
    company = text(b.company, 90),
    headline = text(b.headline ?? '', 200, true),
    website = text(b.website ?? '', 300),
    accent = text(b.accent ?? 'orange', 20);
  if (company.length < 2 || !isProfileColor(accent))
    throw Error('Dados inválidos.');
  const clean = validateProfile({
    ...blankProfile,
    name: company,
    username: 'company_template',
    website,
    photoUrl: b.logoUrl ?? '',
    coverUrl: b.coverUrl ?? '',
  });
  const design = b.design ?? 'mountain';
  if (
    typeof design !== 'string' ||
    !['mountain', 'minimal', 'editorial'].includes(design)
  )
    throw Error('Design inválido.');
  const editable = b.editable ?? [
    'name',
    'title',
    'email',
    'phone',
    'photoUrl',
    'whatsapp',
    'links',
  ];
  if (
    !Array.isArray(editable) ||
    editable.some(
      (k) =>
        ![
          'name',
          'title',
          'email',
          'phone',
          'photoUrl',
          'whatsapp',
          'links',
        ].includes(k),
    )
  )
    throw Error('Permissões inválidas.');
  return {
    company,
    headline,
    website: clean.website,
    accent,
    design: design as CompanyTemplate['design'],
    logoUrl: clean.photoUrl,
    coverUrl: clean.coverUrl,
    internalName: text(b.internalName ?? company, 90),
    editable: [...new Set(editable)],
  };
}
export function companyCard(input: unknown): CompanyCard {
  if (!input || typeof input !== 'object' || Array.isArray(input))
    throw Error('Dados inválidos.');
  const b = input as Record<string, unknown>;
  if (typeof b.showEmail !== 'boolean' || typeof b.showPhone !== 'boolean')
    throw Error('Dados inválidos.');
  if (Array.isArray(b.links) && b.links.length > 12)
    throw Error('Máximo de 12 redes sociais.');
  const p = validateProfile({
    ...blankProfile,
    name: text(b.name, 90),
    username: 'company_card',
    title: text(b.title ?? '', 120),
    email: text(b.email ?? '', 160),
    phone: text(b.phone ?? '', 24),
    showEmail: b.showEmail,
    showPhone: b.showPhone,
    photoUrl: b.photoUrl ?? '',
    links: b.links ?? [],
    business: { ...defaultBusiness, whatsapp: b.whatsapp ?? '' },
  });
  return {
    internalName: text(b.internalName ?? p.name, 90),
    name: p.name,
    title: p.title,
    email: p.email,
    phone: p.phone,
    showEmail: p.showEmail,
    showPhone: p.showPhone,
    photoUrl: p.photoUrl,
    whatsapp: p.business?.whatsapp ?? '',
    links: p.links,
  };
}
export function companyCardProfile(
  card: CompanyCard,
  template: CompanyTemplate,
  id: string,
): Profile {
  return publicProfile({
    ...blankProfile,
    name: card.name,
    email: card.email,
    phone: card.phone,
    showEmail: card.showEmail,
    showPhone: card.showPhone,
    photoUrl: card.photoUrl || '',
    links: card.links || [],
    username: 'equipa/' + id,
    title: [card.title, template.company].filter(Boolean).join(' · '),
    bio: template.headline,
    coverUrl: template.coverUrl || '',
    website: template.website,
    business: {
      ...defaultBusiness,
      whatsapp: card.whatsapp || '',
      accent: template.accent as typeof defaultBusiness.accent,
    },
  });
}
export const followupStatuses = {
  new: 'Novo',
  progress: 'Em seguimento',
  waiting: 'A aguardar resposta',
  done: 'Concluído',
  archived: 'Arquivado',
} as const;
export function companyFollowup(input: Record<string, unknown>) {
  if (
    !Object.hasOwn(followupStatuses, String(input.status)) ||
    typeof input.note !== 'string' ||
    input.note.length > 1000 ||
    hasControls(input.note, true)
  )
    throw Error('Dados inválidos.');
  const due = text(input.dueDate ?? '', 10);
  if (
    due &&
    (!/^\d{4}-\d{2}-\d{2}$/.test(due) ||
      !Number.isFinite(Date.parse(due + 'T00:00:00Z')) ||
      new Date(due + 'T00:00:00Z').toISOString().slice(0, 10) !== due)
  )
    throw Error('Data inválida.');
  return {
    status: String(input.status),
    note: input.note.trim(),
    dueDate: due,
    tags: text(input.tags ?? '', 200),
    assignee: text(input.assignee ?? '', 80),
  };
}

export function companyPresentation(
  template: CompanyTemplate,
): CompanyTemplate {
  const { company, headline, website, accent, design, logoUrl, coverUrl } =
    template;
  return { company, headline, website, accent, design, logoUrl, coverUrl };
}
