import type { CompanyCard, CompanyTemplate } from './company-cards.ts';
import { profileColorHex } from './profile-business.ts';

export type ToolSettings = {
  signature: 'compact' | 'qr';
  background: 'warm' | 'dark';
  corner: 'left' | 'right';
};
export const defaultToolSettings: ToolSettings = {
  signature: 'qr',
  background: 'warm',
  corner: 'right',
};
export function toolSettings(value: unknown): ToolSettings {
  const v = value as ToolSettings;
  if (
    !v ||
    !['compact', 'qr'].includes(v.signature) ||
    !['warm', 'dark'].includes(v.background) ||
    !['left', 'right'].includes(v.corner)
  )
    throw Error('Dados inválidos.');
  return { signature: v.signature, background: v.background, corner: v.corner };
}
export type DirectoryCard = {
  id: string;
  account: string;
  team: string;
  name: string;
  title: string;
  email: string;
  phone: string;
  photo: string;
  url: string;
};
export function directoryCard(
  id: string,
  account: string,
  team: string,
  card: CompanyCard,
  origin: string,
): DirectoryCard {
  return {
    id,
    account,
    team,
    name: card.name,
    title: card.title,
    email: card.showEmail ? card.email : '',
    phone: card.showPhone ? card.phone : '',
    photo: card.photoUrl || '',
    url: origin + '/equipa/' + encodeURIComponent(id),
  };
}
export const escapeHTML = (value: string) =>
  value.replace(
    /[&<>"']/g,
    (c) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[
        c
      ]!,
  );
export function signatureHTML(
  card: DirectoryCard,
  template: CompanyTemplate,
  settings: ToolSettings,
  origin: string,
  label = 'Ver cartão',
) {
  // Data arrives through published-card validation. Every inserted value is escaped, including URLs.
  const e = escapeHTML,
    link = (url: string, text: string) =>
      `<a href="${e(url)}" style="color:#333333;text-decoration:none">${e(text)}</a>`;
  const logo = template.logoUrl
    ? `<img src="${e(origin + template.logoUrl)}" width="96" alt="${e(template.company)}" style="display:block;max-width:96px;height:auto;border:0;margin-bottom:12px">`
    : '';
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="font-family:Arial,sans-serif;font-size:13px;line-height:1.6;color:#333333"><tr><td style="padding:0 20px 0 0;border-right:3px solid ${profileColorHex(template.accent)};vertical-align:top">${logo}<strong style="font-size:17px">${e(card.name)}</strong><br>${e(card.title)}<br><strong>${e(template.company)}</strong>${card.email ? '<br>' + link('mailto:' + card.email, card.email) : ''}${card.phone ? '<br>' + link('tel:' + card.phone.replace(/\s/g, ''), card.phone) : ''}${template.website ? '<br>' + link(template.website, template.website.replace(/^https:\/\//, '')) : ''}<br>${link(card.url, label)}</td>${settings.signature === 'qr' ? `<td style="padding-left:18px;vertical-align:top"><a href="${e(card.url)}"><img src="${e(origin)}/api/company-tools/qr/${encodeURIComponent(card.id)}" width="100" height="100" alt="QR" style="display:block;border:0"></a></td>` : ''}</tr></table>`;
}
export function signatureText(card: DirectoryCard, company: string) {
  return [card.name, card.title, company, card.email, card.phone, card.url]
    .filter(Boolean)
    .join('\n');
}
