'use client';
import { useI18n } from '@/components/language-provider';

import { useEffect, useState } from 'react';
import Link from '@/components/hard-link';
import {
  UserRound,
  ChevronDown,
  LayoutDashboard,
  Package,
  BriefcaseBusiness,
  ShieldCheck,
  LogOut,
  LogIn,
  UserPlus,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
export function AccountMenu({
  className = 'account-link',
  identity = false,
}: {
  className?: string;
  identity?: boolean;
}) {
  const { t } = useI18n();
  const [dashboard, setDashboard] = useState('');
  const [account, setAccount] = useState<{
    name: string;
    email: string;
  } | null>(null);
  useEffect(() => {
    void fetch('/api/session', { cache: 'no-store' })
      .then(
        (r) =>
          r.json() as Promise<{
            dashboard?: string;
            account?: { name: string; email: string } | null;
          }>,
      )
      .then((d) => {
        setDashboard(d.dashboard || '');
        setAccount(d.account ?? null);
      })
      .catch(() => {});
  }, []);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        id="framy-account-menu-trigger"
        aria-label={t('Minha Conta')}
        className={`account-menu-trigger ${className}${identity ? ' account-identity-trigger' : ''}`}
      >
        <span className="account-avatar">
          <UserRound size={17} />
        </span>
        {identity && account ? (
          <span className="account-identity-text">
            <strong>{account.name}</strong>
            <small>{account.email}</small>
          </span>
        ) : (
          <span className="account-menu-label">{t(' Minha Conta ')}</span>
        )}
        <ChevronDown className="account-menu-chevron" size={14} />
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        sideOffset={10}
        className="account-menu-popup"
      >
        {identity && account && (
          <div className="account-popup-identity">
            <strong>{account.name}</strong>
            <small>{account.email}</small>
          </div>
        )}
        {dashboard ? (
          <>
            <DropdownMenuItem
              className="account-menu-option"
              render={<Link href={dashboard} />}
              nativeButton={false}
            >
              <LayoutDashboard size={18} aria-hidden="true" />
              <span>{t('Abrir o meu painel')}</span>
            </DropdownMenuItem>
            {dashboard === '/agent' && (
              <DropdownMenuItem
                className="account-menu-option"
                render={<Link href="/dashboard" />}
                nativeButton={false}
              >
                <Package size={18} aria-hidden="true" />
                <span>{t('Os meus pedidos e perfil')}</span>
              </DropdownMenuItem>
            )}
            <DropdownMenuItem
              className="account-menu-option"
              render={<Link href="/aplicar" />}
              nativeButton={false}
            >
              <BriefcaseBusiness size={18} aria-hidden="true" />
              <span>{t('A minha candidatura')}</span>
            </DropdownMenuItem>
            <DropdownMenuItem
              className="account-menu-option"
              render={<Link href="/perfil?billing=1" />}
              nativeButton={false}
            >
              <Package size={18} aria-hidden="true" />
              <span>{t('Plano e facturação')}</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="account-menu-option"
              render={<Link href="/seguranca" />}
              nativeButton={false}
            >
              <ShieldCheck size={18} aria-hidden="true" />
              <span>{t('Segurança da conta')}</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="account-menu-option account-menu-signout"
              render={<Link href="/sair" />}
              nativeButton={false}
            >
              <LogOut size={18} aria-hidden="true" />
              <span>{t('Terminar sessão')}</span>
            </DropdownMenuItem>
          </>
        ) : (
          <>
            <DropdownMenuItem
              className="account-menu-option"
              render={<Link href="/entrar" />}
              nativeButton={false}
            >
              <LogIn size={18} aria-hidden="true" />
              <span>{t('Entrar')}</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="account-menu-option"
              render={<Link href="/entrar?mode=register" />}
              nativeButton={false}
            >
              <UserPlus size={18} aria-hidden="true" />
              <span>{t('Criar conta')}</span>
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
