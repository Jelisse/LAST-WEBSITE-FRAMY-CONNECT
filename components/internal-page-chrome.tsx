'use client';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';

// Account tasks use focused navigation; public pages own the approved full footer.
export function InternalPageChrome({
  children,
  header,
}: {
  children: ReactNode;
  header: ReactNode;
}) {
  const path = usePathname();
  const needsHeader = /^\/(entrar|recuperar|activar|seguranca)(\/|$)/.test(
    path ?? '',
  );
  return (
    <>
      {needsHeader && header}
      {children}
    </>
  );
}
