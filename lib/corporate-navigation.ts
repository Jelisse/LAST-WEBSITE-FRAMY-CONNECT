export const corporateSections = [
  {
    id: 'reports',
    path: '/corporativo',
    label: 'Relatórios',
    title: 'Relatórios corporativos',
  },
  {
    id: 'team',
    path: '/corporativo/equipa',
    label: 'Equipa',
    title: 'Gestão da equipa',
  },
  {
    id: 'campaigns',
    path: '/corporativo/campanhas',
    label: 'Campanhas',
    title: 'Campanhas e eventos',
  },
  {
    id: 'contacts',
    path: '/corporativo/contactos',
    label: 'Contactos',
    title: 'Contactos recebidos',
  },
  {
    id: 'guide',
    path: '/corporativo/guia',
    label: 'Como funciona',
    title: 'Guia da equipa corporativa',
  },
] as const;
export type CorporateSection = (typeof corporateSections)[number]['id'];
export function corporateSectionURL(path: string, organisation: string) {
  return (
    path +
    (organisation ? '?' + new URLSearchParams({ organisation }).toString() : '')
  );
}
