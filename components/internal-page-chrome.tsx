'use client';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';

// Public pages already supply their footer; customer profiles keep their own branding.
export function InternalPageChrome({ children, header, footer }: { children: ReactNode; header: ReactNode; footer: ReactNode }) {
  const path = usePathname();
  const internal = /^\/(dashboard|perfil|manager|operations|finance|agent|cofounder|entrar|recuperar|activar|seguranca)(\/|$)/.test(path ?? '');
  const needsHeader = /^\/(entrar|recuperar|activar|seguranca)(\/|$)/.test(path ?? '') || path === '/manager/pagamentos';
  return <>{needsHeader && header}{children}{internal && footer}</>;
}
