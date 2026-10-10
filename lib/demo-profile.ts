import { blankProfile, type Profile } from './domain';
import { defaultBusiness } from './profile-business';
import { defaultExtras } from './profile-growth';

// Fictional identity shared by the home preview and the full example profile.
export const demoIdentity = {
  name: 'Angela Khossa',
  title: 'Criadora de conteúdos',
  photo: '/home/angela-portrait-cutout.png',
};
export function demoProfile(t: (text: string) => string): Profile {
  return {
    ...blankProfile,
    name: demoIdentity.name,
    username: 'exemplo',
    title: t(demoIdentity.title),
    photoUrl: demoIdentity.photo,
    photoPosition: 40,
    photoPositionX: 50,
    photoScale: 105,
    photoCutout: true,
    photoHeadEscape: true,
    photoShape: 'circle',
    photoShapeColor: '#168c96',
    photoPattern: 'waves',
    photoPatternColor: '#d4f3ef',
    photoPatternScale: 110,
    photoPatternStrength: 80,
    photoOutlineColor: '#ff9c5b',
    photoOutlineWidth: 7,
    photoGlowColor: '#168c96',
    photoGlowStrength: 24,
    business: { ...defaultBusiness, accent: 'black' },
    extras: {
      ...defaultExtras,
      english: {
        title: 'Content creator',
        bio: 'Fictional demonstration profile. AI-generated photograph.',
        hours: '',
      },
    },
    links: [
      { label: t('Conhecer a Framy'), url: 'https://framyconnect.co.mz/' },
      { label: t('Ver produtos'), url: 'https://framyconnect.co.mz/produtos' },
      { label: t('Fale connosco'), url: 'https://framyconnect.co.mz/contacto' },
    ],
    bio: t('Perfil fictício de demonstração. Fotografia gerada por IA.'),
  };
}
