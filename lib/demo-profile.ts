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
    coverUrl: '/home/card-packaging-orange.jpg',
    email: 'angela@example.com',
    phone: '+12025550100', // Reserved fictional number, never a customer contact.
    showPhone: true,
    showEmail: true,
    website: 'https://framyconnect.co.mz/',
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
    contentLanguage: 'pt-MZ',
    translations: Object.fromEntries(
      (['en', 'pt-MZ', 'zh-Hant', 'uk', 'pl', 'fr', 'zh-Hans'] as const).map(
        (locale, i) => [
          locale,
          {
            title: [
              'Content creator',
              'Criadora de conteúdos',
              '內容創作者',
              'Авторка контенту',
              'Twórczyni treści',
              'Créatrice de contenu',
              '内容创作者',
            ][i],
            bio: [
              'Fictional demonstration profile. AI-generated photograph.',
              'Perfil fictício de demonstração. Fotografia gerada por IA.',
              '虛構示範個人檔案。照片由 AI 生成。',
              'Вигаданий демонстраційний профіль. Фото створене ШІ.',
              'Fikcyjny profil demonstracyjny. Zdjęcie wygenerowane przez AI.',
              'Profil de démonstration fictif. Photographie générée par IA.',
              '虚构演示个人资料。照片由 AI 生成。',
            ][i],
            hours: '',
            address: '',
            services: [],
            links: [
              { label: 'Instagram', url: 'https://www.instagram.com/' },
              { label: 'Facebook', url: 'https://www.facebook.com/' },
              { label: 'LinkedIn', url: 'https://www.linkedin.com/' },
              { label: 'TikTok', url: 'https://www.tiktok.com/' },
              { label: 'WhatsApp', url: 'https://www.whatsapp.com/' },
              {
                label: 'Portfolio',
                url: 'https://framyconnect.co.mz/produtos',
              },
            ],
          },
        ],
      ),
    ),
    extras: {
      ...defaultExtras,
      english: {
        title: 'Content creator',
        bio: 'Fictional demonstration profile. AI-generated photograph.',
        hours: '',
      },
    },
    links: [
      { label: 'Instagram', url: 'https://www.instagram.com/' },
      { label: 'Facebook', url: 'https://www.facebook.com/' },
      { label: 'LinkedIn', url: 'https://www.linkedin.com/' },
      { label: 'TikTok', url: 'https://www.tiktok.com/' },
      { label: 'WhatsApp', url: 'https://www.whatsapp.com/' },
      { label: 'Portfolio', url: 'https://framyconnect.co.mz/produtos' },
    ],
    bio: t('Perfil fictício de demonstração. Fotografia gerada por IA.'),
  };
}
