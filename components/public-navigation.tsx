'use client';
import { useEffect, useRef, useState } from 'react';
import { ChevronDown, ArrowUpRight } from 'lucide-react';
import Link from './hard-link';
import { useI18n } from './language-provider';
import { publicNavigation } from '@/lib/public-navigation';
export function PublicNavigation({
  company = false,
  why = false,
}: {
  company?: boolean;
  why?: boolean;
}) {
  const { t } = useI18n();
  const [active, setActive] = useState<string | null>(null);
  const root = useRef<HTMLElement>(null);
  const triggers = useRef<Record<string, HTMLButtonElement | null>>({});
  useEffect(() => {
    const outside = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setActive(null);
    };
    const escape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && active) {
        setActive(null);
        triggers.current[active]?.focus();
      }
    };
    document.addEventListener('pointerdown', outside);
    document.addEventListener('keydown', escape);
    return () => {
      document.removeEventListener('pointerdown', outside);
      document.removeEventListener('keydown', escape);
    };
  }, [active]);
  const dropdown = (id: string) => {
    const section = publicNavigation.find((x) => x.id === id)!;
    return (
      <div className="public-nav-group" key={id}>
        <button
          type="button"
          ref={(node) => {
            triggers.current[id] = node;
          }}
          aria-expanded={active === id}
          aria-controls={'public-menu-' + id}
          onClick={() => setActive(active === id ? null : id)}
        >
          {t(section.label)}
          <ChevronDown size={14} aria-hidden="true" />
        </button>
        {active === id && (
          <div
            className="public-mega-menu"
            id={'public-menu-' + id}
            onBlur={(e) => {
              if (
                e.relatedTarget &&
                !root.current?.contains(e.relatedTarget as Node)
              )
                setActive(null);
            }}
          >
            <div className="public-menu-columns">
              {section.groups.map((group) => (
                <div key={group.label}>
                  <h2>{t(group.label)}</h2>
                  {group.links.map((link) => (
                    <Link
                      key={link.label}
                      href={link.href}
                      onClick={() => setActive(null)}
                    >
                      {t(link.label)}
                    </Link>
                  ))}
                </div>
              ))}
            </div>
            <div className="public-menu-feature">
              <span>{t('O SEU MUNDO, NUM TOQUE')}</span>
              <h2>{t('Uma apresentação que abre portas.')}</h2>
              <p>
                {t(
                  'Reúna contactos, redes e trabalho num perfil que acompanha o seu crescimento.',
                )}
              </p>
              <Link href="/exemplo" onClick={() => setActive(null)}>
                {t('Ver exemplo')}
                <ArrowUpRight size={17} />
              </Link>
            </div>
          </div>
        )}
      </div>
    );
  };
  return (
    <nav
      ref={root}
      className="public-desktop-nav"
      aria-label={t('Navegação principal')}
    >
      <Link href="/porque-framy" aria-current={why ? 'page' : undefined}>
        {t('Porquê Framy Connect')}
      </Link>
      {dropdown('solutions')}
      <Link href="/para-empresas" aria-current={company ? 'page' : undefined}>
        {t('Para empresas')}
      </Link>
      {dropdown('platform')}
      <Link href="/#planos">{t('Planos')}</Link>
      {dropdown('resources')}
    </nav>
  );
}
