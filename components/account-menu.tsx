'use client';

import Link from 'next/link';
import {
  UserRound,
  ChevronDown,
  Settings2,
  BriefcaseBusiness,
  ChartNoAxesCombined,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';

const dashboards = [
  {
    href: '/dashboard',
    label: 'Cliente',
    description: 'Identidade e acompanhamento de pedidos',
    icon: UserRound,
  },
  {
    href: '/manager',
    label: 'Manager',
    description: 'Operações, catálogo e finanças',
    icon: Settings2,
  },
  {
    href: '/agent',
    label: 'Agente',
    description: 'Produção e entregas',
    icon: BriefcaseBusiness,
  },
  {
    href: '/cofounder',
    label: 'Direcção',
    description: 'Visão global do negócio',
    icon: ChartNoAxesCombined,
  },
];

export function AccountMenu({
  className = 'account-link',
}: {
  className?: string;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className={`account-menu-trigger ${className}`}>
        <UserRound size={17} aria-hidden="true" /> Minha Conta{' '}
        <ChevronDown size={14} aria-hidden="true" />
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        sideOffset={10}
        className="account-menu-popup"
      >
        <DropdownMenuGroup>
          <DropdownMenuLabel className="account-menu-label">
            Escolher dashboard
          </DropdownMenuLabel>
          {dashboards.map(({ href, label, description, icon: Icon }) => (
            <DropdownMenuItem
              key={href}
              render={<Link href={href} />}
              nativeButton={false}
              className="account-menu-option"
            >
              <Icon size={20} aria-hidden="true" />
              <span>
                <strong>{label}</strong>
                <small>{description}</small>
              </span>
            </DropdownMenuItem>
          ))}
          <DropdownMenuItem render={<Link href="/sair" />} nativeButton={false} className="account-menu-option">
            Terminar sessão / trocar de conta
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
