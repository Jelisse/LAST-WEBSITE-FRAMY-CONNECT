'use client';

import { publicNavigation } from '@/lib/public-navigation';
import { Menu } from 'lucide-react';
import { useEffect, useRef } from 'react';
import Link from './hard-link';
import { LanguageSelector, useI18n } from './language-provider';
import { solutionPaths } from '@/lib/solution-paths';
import { SourceImage } from './source-image';

export function HomeMobileMenu() {
  const { t } = useI18n();
  const ref = useRef<HTMLDetailsElement>(null);
  const close = () => {
    if (ref.current) ref.current.open = false;
  };
  useEffect(() => {
    const dismiss = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && ref.current?.open) {
        ref.current.open = false;
        ref.current.querySelector('summary')?.focus();
      }
    };
    const outside = (event: PointerEvent) => {
      if (event.target instanceof Node && !ref.current?.contains(event.target))
        close();
    };
    document.addEventListener('keydown', dismiss);
    document.addEventListener('pointerdown', outside);
    return () => {
      document.removeEventListener('keydown', dismiss);
      document.removeEventListener('pointerdown', outside);
    };
  }, []);
  return (
    <details ref={ref} className="home-mobile-menu">
      <summary aria-label={t('Navegação principal')}>
        <Menu size={23} aria-hidden="true" />
      </summary>
      <div className="home-mobile-panel">
        <nav aria-label={t('Navegação principal')}>
          <Link href="/porque-framy" onClick={close}>
            {t('Porquê Framy Connect')}
          </Link>
          <Link href="/para-empresas" onClick={close}>
            {t('Para empresas')}
          </Link>
          <Link href="/#planos" onClick={close}>
            {t('Planos')}
          </Link>
          {publicNavigation.map((section) => (
            <details className="mobile-nav-group" key={section.id}>
              <summary>{t(section.label)}</summary>
              {section.id === 'solutions' ? (
                <div className="mobile-solution-links">
                  {solutionPaths.map((path) => (
                    <Link key={path.id} href={path.href} onClick={close}>
                      <SourceImage
                        src={path.image.replace('.webp', '-small.webp')}
                        alt=""
                        width={90}
                        height={60}
                      />
                      <span>{t(path.title)}</span>
                    </Link>
                  ))}
                </div>
              ) : (
                section.groups.map((group) => (
                  <div key={group.label}>
                    <strong>{t(group.label)}</strong>
                    {group.links.map((link) => (
                      <Link key={link.label} href={link.href} onClick={close}>
                        {t(link.label)}
                      </Link>
                    ))}
                  </div>
                ))
              )}
            </details>
          ))}
        </nav>
        <LanguageSelector />
      </div>
    </details>
  );
}
