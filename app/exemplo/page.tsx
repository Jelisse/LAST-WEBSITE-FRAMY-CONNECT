import { MobileProfile } from '@/components/mobile-profile';
import { blankProfile } from '@/lib/domain';
export const metadata = {
  title: 'Perfil de demonstração',
  robots: { index: false, follow: false },
};
export default function ExampleProfile() {
  return (
    <main id="main" className="standalone-mobile-profile">
      <MobileProfile
        published
        profile={{
          ...blankProfile,
          name: 'Firmino Chambale',
          username: 'exemplo',
          title: 'Arquitecto e Planeador Físico',
          photoUrl: '/home/demo-portrait.jpg',
          photoPosition: 35,
          links: [
            { label: 'Conhecer a Framy', url: '/' },
            { label: 'Ver produtos', url: '/produtos' },
            { label: 'Fale connosco', url: '/contacto' },
          ],
          bio: 'Perfil de demonstração Framy Connect.',
        }}
      />
    </main>
  );
}
