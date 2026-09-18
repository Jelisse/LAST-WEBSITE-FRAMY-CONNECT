'use client';
import { useI18n } from '@/components/language-provider';

import { useEffect, useState } from 'react';
import Link from '@/components/hard-link';
import { UserRound, ChevronDown } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
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
        {t(' Minha Conta ')}
        <ChevronDown size={14} />
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        sideOffset={10}
        className="account-menu-popup"
      >
        {dashboard ? (
          <>
            <DropdownMenuItem
              render={<Link href={dashboard} />}
              nativeButton={false}
            >
              {t('Abrir o meu painel')}
            </DropdownMenuItem>
            {dashboard === '/agent' && (
              <DropdownMenuItem
                render={<Link href="/dashboard" />}
                nativeButton={false}
              >
                {t('Os meus pedidos e perfil')}
              </DropdownMenuItem>
            )}
            <DropdownMenuItem
              render={<Link href="/aplicar" />}
              nativeButton={false}
            >
              {t('A minha candidatura')}
            </DropdownMenuItem>
            <DropdownMenuItem
              render={<Link href="/seguranca" />}
              nativeButton={false}
            >
              {t('Segurança da conta')}
            </DropdownMenuItem>
            <DropdownMenuItem
              render={<Link href="/sair" />}
              nativeButton={false}
            >
              {t('Terminar sessão')}
            </DropdownMenuItem>
          </>
        ) : (
          <>
            <DropdownMenuItem
              render={<Link href="/entrar" />}
              nativeButton={false}
            >
              {t('Entrar')}
            </DropdownMenuItem>
            <DropdownMenuItem
              render={<Link href="/entrar?mode=register" />}
              nativeButton={false}
            >
              {t('Criar conta')}
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
