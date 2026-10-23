export type ContactPurpose = 'support' | 'sales' | 'partnerships';
export const supportContacts = {
  email: 'info@framyconnect.co.mz',
  sales: 'sales@framyconnect.co.mz',
  whatsapp: '258846847629',
  whatsappDisplay: '+258 84 684 7629',
  founders: [
    {
      name: 'Firmino Chambale',
      role: 'CTO',
      email: 'firminochambale@framyconnect.co.mz',
    },
    {
      name: 'Jelisse Langa',
      role: 'CEO',
      email: 'jelisselanga@framyconnect.co.mz',
    },
  ],
} as const;
export function contactLinks(
  purpose: ContactPurpose,
  subject: string,
  message = '',
  reference = '',
) {
  const email =
    purpose === 'sales' ? supportContacts.sales : supportContacts.email;
  const ref = purpose === 'support' ? reference.trim().slice(0, 80) : '';
  const body = [
    subject.slice(0, 120),
    ref ? `Ref: ${ref}` : '',
    message.trim().slice(0, 1800),
  ]
    .filter(Boolean)
    .join('\n\n');
  return {
    email,
    mailto: `mailto:${email}?subject=${encodeURIComponent(subject.slice(0, 120))}&body=${encodeURIComponent(body)}`,
    whatsapp: `https://wa.me/${supportContacts.whatsapp}?text=${encodeURIComponent(body)}`,
  };
}

export function isDashboardSupportPath(path: string) {
  return (
    /^\/(?:dashboard|perfil|preview|manager|agent|cofounder|operations|finance)(?:\/|$)/.test(
      path,
    ) ||
    /^\/corporativo(?:$|\/(?:configurar|cartoes|equipa|campanhas|contactos|assinaturas|fundos|directorio|integracoes|guia)(?:\/|$))/.test(
      path,
    )
  );
}
