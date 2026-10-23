'use client';
import { useState, useEffect, type ReactNode } from 'react';
import {
  PanelLeftClose,
  PanelLeftOpen,
  CircleHelp,
  MessageCircle,
  ShieldCheck,
  ArrowUpRight,
} from 'lucide-react';
import Image from 'next/image';
import Link from './hard-link';
import { openSupport } from './support-panel';
import { useI18n, LanguageSelector } from './language-provider';
export type AppSidebarItem = {
  id: string;
  label: string;
  icon: ReactNode;
  href?: string;
  onSelect?: () => void;
  active?: boolean;
};
export function AppSidebarContents({
  badge,
  groups,
  onUpgrade,
  footer,
  onNavigate,
  mobile = false,
}: {
  badge: string;
  groups: { label: string; items: AppSidebarItem[] }[];
  onUpgrade?: () => void;
  footer?: ReactNode;
  onNavigate?: () => void;
  mobile?: boolean;
}) {
  const { t } = useI18n();
  const [storedCollapsed, setCollapsed] = useState(false);
  const collapsed = !mobile && storedCollapsed;
  useEffect(() => {
    const sync = () => {
      try {
        setCollapsed(
          localStorage.getItem('framy-sidebar-collapsed') === 'true',
        );
      } catch {
        /* Optional layout preference. */
      }
    };
    sync();
    window.addEventListener('storage', sync);
    window.addEventListener('framy-sidebar-change', sync);
    return () => {
      window.removeEventListener('storage', sync);
      window.removeEventListener('framy-sidebar-change', sync);
    };
  }, []);
  const toggleCollapsed = () => {
    const next = !collapsed;
    setCollapsed(next);
    try {
      localStorage.setItem('framy-sidebar-collapsed', String(next));
    } catch {
      /* Keep the current session usable. */
    }
    window.dispatchEvent(new Event('framy-sidebar-change'));
  };
  return (
    <div
      className="app-sidebar app-sidebar-contents"
      data-collapsed={collapsed}
    >
      <div className="app-sidebar-header">
        <Link href="/" aria-label={t('Página inicial')}>
          <Image
            src="/brand/logo.svg"
            alt="Framy Connect"
            width={140}
            height={54}
            unoptimized
          />
        </Link>
        <span className="app-sidebar-badge">{t(badge)}</span>
        <button
          type="button"
          className="app-sidebar-collapse"
          aria-label={t(
            collapsed ? 'Expandir navegação' : 'Recolher navegação',
          )}
          aria-expanded={!collapsed}
          onClick={toggleCollapsed}
        >
          {collapsed ? (
            <PanelLeftOpen size={19} />
          ) : (
            <PanelLeftClose size={19} />
          )}
        </button>
      </div>
      <div className="app-sidebar-scroll">
        <nav aria-label={t('Secções')}>
          {groups.map((group) => (
            <div className="app-sidebar-group" key={group.label}>
              <h2>{t(group.label)}</h2>
              {group.items.map((item) =>
                item.href ? (
                  <Link
                    key={item.id}
                    href={item.href}
                    title={t(item.label)}
                    aria-label={t(item.label)}
                    aria-current={item.active ? 'page' : undefined}
                    onClick={() => {
                      item.onSelect?.();
                      onNavigate?.();
                    }}
                  >
                    {item.icon}
                    <span>{t(item.label)}</span>
                  </Link>
                ) : (
                  <button
                    key={item.id}
                    type="button"
                    title={t(item.label)}
                    aria-label={t(item.label)}
                    aria-current={item.active ? 'page' : undefined}
                    onClick={() => {
                      item.onSelect?.();
                      onNavigate?.();
                    }}
                  >
                    {item.icon}
                    <span>{t(item.label)}</span>
                  </button>
                ),
              )}
            </div>
          ))}
        </nav>
      </div>
      {onUpgrade && (
        <div className="app-sidebar-upgrade">
          <button
            type="button"
            onClick={onUpgrade}
            aria-label={t('Escolher plano')}
            title={t('Escolher plano')}
          >
            <ArrowUpRight size={19} />
            <span>{t('Escolher plano')}</span>
          </button>
        </div>
      )}
      <div className="app-sidebar-support">
        <div className="app-sidebar-language">
          <LanguageSelector />
        </div>
        <Link
          href="/ajuda"
          onClick={(event) => {
            if (
              event.button === 0 &&
              !event.metaKey &&
              !event.ctrlKey &&
              !event.shiftKey &&
              !event.altKey
            ) {
              event.preventDefault();
              onNavigate?.();
              openSupport('help');
            }
          }}
          title={t('Centro de ajuda')}
          aria-label={t('Centro de ajuda')}
        >
          <CircleHelp size={20} />
          <span>{t('Centro de ajuda')}</span>
        </Link>
        <Link
          href="/contacto"
          onClick={(event) => {
            if (
              event.button === 0 &&
              !event.metaKey &&
              !event.ctrlKey &&
              !event.shiftKey &&
              !event.altKey
            ) {
              event.preventDefault();
              onNavigate?.();
              openSupport('contact');
            }
          }}
          title={t('Contactar a Framy')}
          aria-label={t('Contactar a Framy')}
        >
          <MessageCircle size={20} />
          <span>{t('Contactar a Framy')}</span>
        </Link>
        <Link
          href="/seguranca"
          title={t('Segurança da conta')}
          aria-label={t('Segurança da conta')}
        >
          <ShieldCheck size={20} />
          <span>{t('Segurança da conta')}</span>
        </Link>
        {footer}
      </div>
    </div>
  );
}
