'use client';
import { AppSidebarContents } from './app-sidebar';
import { AppSidebarDrawer } from './app-sidebar-drawer';
import {
  Mail,
  Image,
  BookUser,
  Plug,
  BarChart3,
  Users,
  Megaphone,
  ContactRound,
  CircleHelp,
  Building2,
  UserRound,
} from 'lucide-react';
import {
  corporateSections,
  corporateSectionURL,
  type CorporateSection,
} from '@/lib/corporate-navigation';
const icons = {
  signatures: Mail,
  backgrounds: Image,
  directory: BookUser,
  integrations: Plug,
  cards: Building2,
  reports: BarChart3,
  team: Users,
  campaigns: Megaphone,
  contacts: ContactRound,
  visitors: BookUser,
  guide: CircleHelp,
};
export function CorporateSidebar({
  current,
  organisation = '',
}: {
  current: CorporateSection | 'company';
  organisation?: string;
}) {
  const sidebar = (
    <AppSidebarContents
      badge="Corporativo"
      groups={[
        {
          label: 'Criar e partilhar',
          items: corporateSections
            .filter((s) =>
              ['cards', 'signatures', 'backgrounds'].includes(s.id),
            )
            .map((section) => {
              const Icon = icons[section.id];
              return {
                id: section.id,
                label: section.label,
                href: corporateSectionURL(section.path, organisation),
                icon: <Icon size={21} />,
                active: current === section.id,
              };
            }),
        },
        {
          label: 'Gerir a equipa',
          items: corporateSections
            .filter(
              (s) =>
                !['cards', 'signatures', 'backgrounds', 'guide'].includes(s.id),
            )
            .map((section) => {
              const Icon = icons[section.id];
              return {
                id: section.id,
                label: section.label,
                href: corporateSectionURL(section.path, organisation),
                icon: <Icon size={21} />,
                active: current === section.id,
              };
            }),
        },
        {
          label: 'A minha conta',
          items: [
            {
              id: 'company',
              label: 'Empresa',
              href: '/corporativo/configurar',
              active: current === 'company',
              icon: <Building2 size={21} />,
            },
            {
              id: 'profile',
              label: 'Perfil',
              href: '/perfil',
              icon: <UserRound size={21} />,
            },
            {
              id: 'guide',
              label: 'Como funciona',
              href: '/corporativo/guia',
              icon: <CircleHelp size={21} />,
            },
          ],
        },
      ]}
    />
  );
  return (
    <aside className="corporate-sidebar">
      <AppSidebarDrawer>{sidebar}</AppSidebarDrawer>
      <div id="corporate-side-links" className="app-sidebar">
        {sidebar}
      </div>
    </aside>
  );
}
