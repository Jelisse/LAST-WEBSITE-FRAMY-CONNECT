'use client';
import { useEffect, useRef, type ReactNode } from 'react';
import {
  Menu,
  Home,
  ShoppingBag,
  ShieldCheck,
  BriefcaseBusiness,
  Mail,
  Info,
} from 'lucide-react';
import { LanguageSelector, useI18n } from './language-provider';
import { AccountMenu } from './account-menu';
import Link from './hard-link';
import Image from 'next/image';
export type MobileNavItem = {
  label: string;
  href?: string;
  onSelect?: () => void;
  icon: ReactNode;
  active?: boolean;
};
export function MobileNavigation({ items }: { items?: MobileNavItem[] }) {
  const { t } = useI18n();
  const menuRef = useRef<HTMLDetailsElement>(null);
  function closeMenu() {
    if (menuRef.current) {
      menuRef.current.open = false;
      menuRef.current.querySelector('summary')?.focus();
    }
  }
  useEffect(() => {
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && menuRef.current?.open) closeMenu();
    };
    const outside = (event: PointerEvent) => {
      if (
        menuRef.current?.open &&
        !menuRef.current.contains(event.target as Node)
      )
        menuRef.current.open = false;
    };
    document.addEventListener('keydown', escape);
    document.addEventListener('pointerdown', outside);
    return () => {
      document.removeEventListener('keydown', escape);
      document.removeEventListener('pointerdown', outside);
    };
  }, []);
  const links: MobileNavItem[] = items ?? [
    { label: 'Página inicial', href: '/', icon: <Home size={19} /> },
    { label: 'Produtos', href: '/produtos', icon: <ShoppingBag size={19} /> },
    { label: 'Sobre nós', href: '/sobre', icon: <Info size={19} /> },
    { label: 'Contacto', href: '/contacto', icon: <Mail size={19} /> },
    {
      label: 'Tornar-se agente',
      href: '/aplicar',
      icon: <BriefcaseBusiness size={19} />,
    },
  ];
  return (
    <details ref={menuRef} className="compact-mobile-menu">
      <summary aria-label={t('Navegação principal')}>
        <Menu size={22} aria-hidden="true" />
      </summary>
      <div className="compact-mobile-panel">
        <nav aria-label={t('Secções')}>
          {links.map((item) =>
            item.href ? (
              <Link
                key={item.label}
                href={item.href}
                onClick={closeMenu}
                aria-current={item.active ? 'page' : undefined}
              >
                {item.icon}
                <span>{t(item.label)}</span>
              </Link>
            ) : (
              <button
                key={item.label}
                type="button"
                onClick={() => {
                  item.onSelect?.();
                  closeMenu();
                }}
                aria-current={item.active ? 'page' : undefined}
              >
                {item.icon}
                <span>{t(item.label)}</span>
              </button>
            ),
          )}
        </nav>
        <LanguageSelector />
      </div>
    </details>
  );
}
export function DashboardTools() {
  const { t } = useI18n();
  return (
    <div className="dashboard-tools">
      <Link href="/" aria-label={t('Página inicial')}>
        <Image
          src="/brand/logo.svg"
          alt="Framy Connect"
          width={110}
          height={50}
          unoptimized
        />
      </Link>
      <div className="dashboard-tools-actions">
        <span className="desktop-language">
          <LanguageSelector />
        </span>
        <AccountMenu />
        <MobileNavigation
          items={[
            { label: 'Página inicial', href: '/', icon: <Home size={19} /> },
            {
              label: 'Produtos',
              href: '/produtos',
              icon: <ShoppingBag size={19} />,
            },
            {
              label: 'Segurança da conta',
              href: '/seguranca',
              icon: <ShieldCheck size={19} />,
            },
          ]}
        />
      </div>
    </div>
  );
}
