export const corporateSections = [
  {
    id: 'cards',
    path: '/corporativo/cartoes',
    label: 'Cartões da empresa',
    title: 'Modelos e activação de cartões',
  },
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
    id: 'signatures',
    path: '/corporativo/assinaturas',
    label: 'Assinaturas de email',
    title: 'Assinaturas de email',
  },
  {
    id: 'backgrounds',
    path: '/corporativo/fundos',
    label: 'Fundos virtuais',
    title: 'Fundos virtuais',
  },
  {
    id: 'directory',
    path: '/corporativo/directorio',
    label: 'Directório da empresa',
    title: 'Directório da empresa',
  },
  {
    id: 'integrations',
    path: '/corporativo/integracoes',
    label: 'Integrações',
    title: 'Integrações',
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
