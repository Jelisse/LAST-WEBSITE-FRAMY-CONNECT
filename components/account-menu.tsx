'use client';
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
        <UserRound size={17} /> Minha Conta <ChevronDown size={14} />
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
              Abrir o meu painel
            </DropdownMenuItem>
            {dashboard === '/agent' && (
              <DropdownMenuItem
                render={<Link href="/dashboard" />}
                nativeButton={false}
              >
                Os meus pedidos e perfil
              </DropdownMenuItem>
            )}
            <DropdownMenuItem
              render={<Link href="/aplicar" />}
              nativeButton={false}
            >
              A minha candidatura
            </DropdownMenuItem>
            <DropdownMenuItem
              render={<Link href="/seguranca" />}
              nativeButton={false}
            >
              Segurança da conta
            </DropdownMenuItem>
            <DropdownMenuItem
              render={<Link href="/sair" />}
              nativeButton={false}
            >
              Terminar sessão
            </DropdownMenuItem>
          </>
        ) : (
          <>
            <DropdownMenuItem
              render={<Link href="/entrar" />}
              nativeButton={false}
            >
              Entrar
            </DropdownMenuItem>
            <DropdownMenuItem
              render={<Link href="/entrar?mode=register" />}
              nativeButton={false}
            >
              Criar conta
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
