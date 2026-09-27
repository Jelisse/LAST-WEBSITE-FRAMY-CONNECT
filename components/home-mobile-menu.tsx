'use client';

import { Menu } from 'lucide-react';
import { useEffect, useRef } from 'react';
import Link from './hard-link';
import { LanguageSelector, useI18n } from './language-provider';

export function HomeMobileMenu() {
  const { t } = useI18n();
  const ref = useRef<HTMLDetailsElement>(null);
  const close = () => { if (ref.current) ref.current.open = false; };
  useEffect(() => {
    const dismiss = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && ref.current?.open) {
        ref.current.open = false;
        ref.current.querySelector('summary')?.focus();
      }
    };
    const outside = (event: PointerEvent) => {
      if (event.target instanceof Node && !ref.current?.contains(event.target)) close();
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
      <summary aria-label={t('Navegação principal')}><Menu size={23} aria-hidden="true" /></summary>
      <div className="home-mobile-panel">
        <nav aria-label={t('Navegação principal')}>
          <a href="#como-funciona" onClick={close}>{t('Como funciona')}</a>
          <a href="#produtos" onClick={close}>{t('Produtos')}</a>
          <a href="#planos" onClick={close}>{t('Planos')}</a>
          <a href="#sobre" onClick={close}>{t('Sobre nós')}</a>
          <Link href="/aplicar" onClick={close}>{t('Tornar-se agente')}</Link>
        </nav>
        <LanguageSelector />
      </div>
    </details>
  );
}
