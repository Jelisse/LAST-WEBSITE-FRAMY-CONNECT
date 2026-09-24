'use client';

import { Menu } from 'lucide-react';
import { LanguageSelector, useI18n } from './language-provider';

export function HomeMobileMenu() {
  const { t } = useI18n();
  return (
    <details className="home-mobile-menu" onKeyDown={(event) => {
      if (event.key === 'Escape') {
        event.currentTarget.open = false;
        event.currentTarget.querySelector('summary')?.focus();
      }
    }}>
      <summary aria-label={t('Navegação principal')}><Menu size={23} aria-hidden="true" /></summary>
      <div className="home-mobile-panel">
        <nav aria-label={t('Navegação principal')} onClick={(event) => {
          if ((event.target as HTMLElement).closest('a')) {
            const details = event.currentTarget.closest('details');
            if (details) details.open = false;
          }
        }}>
          <a href="#como-funciona">{t('Como funciona')}</a>
          <a href="#produtos">{t('Produtos')}</a>
          <a href="#planos">{t('Planos')}</a>
          <a href="#sobre">{t('Sobre nós')}</a>
          <a href="/aplicar">{t('Tornar-se agente')}</a>
        </nav>
        <LanguageSelector />
      </div>
    </details>
  );
}
