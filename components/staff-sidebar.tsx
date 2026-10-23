'use client';
import { useState } from 'react';
import { LayoutDashboard, Users, ShoppingBag, CreditCard } from 'lucide-react';
import { AppSidebarContents } from './app-sidebar';
import { managerSections } from './manager-sections';
import { AppSidebarDrawer } from './app-sidebar-drawer';
export function StaffSidebar({
  area,
  onSectionChange,
  activeSection,
}: {
  area: 'manager' | 'director';
  onSectionChange?: (section: string) => void;
  activeSection?: string;
}) {
  const [localActive, setActive] = useState('overview');
  const active = activeSection ?? localActive;
  const reveal = (id: string) => {
    const section = id.replace('director-', '');
    setActive(section);
    if (onSectionChange) {
      onSectionChange(section);
      return;
    }
    const target = document.getElementById(id);
    if (target instanceof HTMLDetailsElement) target.open = true;
    requestAnimationFrame(() =>
      target?.scrollIntoView({ block: 'start', behavior: 'smooth' }),
    );
  };
  const sidebar = (
    <AppSidebarContents
      badge={area === 'manager' ? 'Gestão' : 'Direcção'}
      groups={[
        {
          label: area === 'manager' ? 'Gestão Framy Connect' : 'Direcção',
          items:
            area === 'manager'
              ? [
                  ...managerSections.map(({ id, label, icon: Icon }) => ({
                    id,
                    label,
                    href:
                      id === 'overview' ? '/manager' : '/manager?section=' + id,
                    icon: <Icon size={21} />,
                  })),
                  {
                    id: 'payments',
                    label: 'Pagamentos',
                    href: '/manager/pagamentos',
                    active: true,
                    icon: <CreditCard size={21} />,
                  },
                ]
              : [
                  {
                    id: 'overview',
                    label: 'Visão geral',
                    href: '#director-overview',
                    active: active === 'overview',
                    icon: <LayoutDashboard size={21} />,
                    onSelect: () => reveal('director-overview'),
                  },
                  {
                    id: 'accounts',
                    label: 'Contas e acessos',
                    href: '#director-accounts',
                    active: active === 'accounts',
                    icon: <Users size={21} />,
                    onSelect: () => reveal('director-accounts'),
                  },
                  {
                    id: 'applications',
                    label: 'Candidaturas',
                    href: '#director-applications',
                    active: active === 'applications',
                    icon: <Users size={21} />,
                    onSelect: () => reveal('director-applications'),
                  },
                  {
                    id: 'products',
                    label: 'Produtos e planos',
                    href: '#director-products',
                    active: active === 'products',
                    icon: <ShoppingBag size={21} />,
                    onSelect: () => reveal('director-products'),
                  },
                ],
        },
      ]}
    />
  );
  return (
    <aside className="app-sidebar staff-app-sidebar">
      <AppSidebarDrawer>{sidebar}</AppSidebarDrawer>
      <div id="staff-sidebar-links">{sidebar}</div>
    </aside>
  );
}
