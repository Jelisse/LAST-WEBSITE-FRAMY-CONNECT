'use client';
import { useI18n } from '@/components/language-provider';

import { useEffect, useState } from 'react';
import Link from '@/components/hard-link';
import { UserRound, ChevronDown, LayoutDashboard, Package, BriefcaseBusiness, ShieldCheck, LogOut, LogIn, UserPlus } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
export function AccountMenu({
  className = 'account-link',
}: {
  className?: string;
}) {
  const { t } = useI18n();
  const [dashboard, setDashboard] = useState('');
  useEffect(() => {
    void fetch('/api/session', { cache: 'no-store' })
      .then((r) => r.json() as Promise<{ dashboard?: string }>)
      .then((d) => setDashboard(d.dashboard || ''))
      .catch(() => {});
  }, []);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className={`account-menu-trigger ${className}`}>
        <UserRound size={17} />
        <span className="account-menu-label">{t(' Minha Conta ')}</span>
        <ChevronDown className="account-menu-chevron" size={14} />
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        sideOffset={10}
        className="account-menu-popup"
      >
        {dashboard ? (
          <>
            <DropdownMenuItem
              className="account-menu-option"
              render={<Link href={dashboard} />}
              nativeButton={false}
            >
              <LayoutDashboard size={18} aria-hidden="true" /><span>{t('Abrir o meu painel')}</span>
            </DropdownMenuItem>
            {dashboard === '/agent' && (
              <DropdownMenuItem
              className="account-menu-option"
                render={<Link href="/dashboard" />}
                nativeButton={false}
              >
                <Package size={18} aria-hidden="true" /><span>{t('Os meus pedidos e perfil')}</span>
              </DropdownMenuItem>
            )}
            <DropdownMenuItem
              className="account-menu-option"
              render={<Link href="/aplicar" />}
              nativeButton={false}
            >
              <BriefcaseBusiness size={18} aria-hidden="true" /><span>{t('A minha candidatura')}</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="account-menu-option"
              render={<Link href="/seguranca" />}
              nativeButton={false}
            >
              <ShieldCheck size={18} aria-hidden="true" /><span>{t('Segurança da conta')}</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="account-menu-option account-menu-signout"
              render={<Link href="/sair" />}
              nativeButton={false}
            >
              <LogOut size={18} aria-hidden="true" /><span>{t('Terminar sessão')}</span>
            </DropdownMenuItem>
          </>
        ) : (
          <>
            <DropdownMenuItem
              className="account-menu-option"
              render={<Link href="/entrar" />}
              nativeButton={false}
            >
              <LogIn size={18} aria-hidden="true" /><span>{t('Entrar')}</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="account-menu-option"
              render={<Link href="/entrar?mode=register" />}
              nativeButton={false}
            >
              <UserPlus size={18} aria-hidden="true" /><span>{t('Criar conta')}</span>
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
