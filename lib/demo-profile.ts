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
              {
                url: 'https://framyconnect.co.mz/',
                label: [
                  'Discover Framy',
                  'Conhecer a Framy',
                  '認識 Framy',
                  'Відкрийте Framy',
                  'Poznaj Framy',
                  'Découvrir Framy',
                  '认识 Framy',
                ][i],
              },
              {
                url: 'https://framyconnect.co.mz/produtos',
                label: [
                  'View products',
                  'Ver produtos',
                  '查看產品',
                  'Переглянути товари',
                  'Zobacz produkty',
                  'Voir les produits',
                  '查看产品',
                ][i],
              },
              {
                url: 'https://framyconnect.co.mz/contacto',
                label: [
                  'Contact us',
                  'Fale connosco',
                  '聯絡我們',
                  'Зв’яжіться з нами',
                  'Skontaktuj się z nami',
                  'Nous contacter',
                  '联系我们',
                ][i],
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
      { label: t('Conhecer a Framy'), url: 'https://framyconnect.co.mz/' },
      { label: t('Ver produtos'), url: 'https://framyconnect.co.mz/produtos' },
      { label: t('Fale connosco'), url: 'https://framyconnect.co.mz/contacto' },
    ],
    bio: t('Perfil fictício de demonstração. Fotografia gerada por IA.'),
  };
}
