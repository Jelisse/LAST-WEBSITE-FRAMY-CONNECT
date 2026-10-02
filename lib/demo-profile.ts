import { blankProfile } from './domain';

// Fictional identity shared by the home preview and the full example profile.
export const demoIdentity = {
  name: 'Angela Khossa',
  title: 'Criadora de conteúdos',
  photo: '/home/ana-matavele.webp',
};
export function demoProfile(t: (text: string) => string) {
  return {
    ...blankProfile,
    name: demoIdentity.name,
    username: 'exemplo',
    title: t(demoIdentity.title),
    photoUrl: demoIdentity.photo,
    photoPosition: 35,
    links: [
      { label: t('Conhecer a Framy'), url: 'https://framyconnect.co.mz/' },
      { label: t('Ver produtos'), url: 'https://framyconnect.co.mz/produtos' },
      { label: t('Fale connosco'), url: 'https://framyconnect.co.mz/contacto' },
    ],
    bio: t('Perfil fictício de demonstração. Fotografia gerada por IA.'),
  };
}
