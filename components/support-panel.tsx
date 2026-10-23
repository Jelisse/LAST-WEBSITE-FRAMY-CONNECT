'use client';
import { useEffect, useRef, useState } from 'react';
import { Sheet, SheetContent, SheetTitle, SheetDescription } from './ui/sheet';
import { HelpCentre } from './help-centre';
import { ContactFramy } from './contact-framy';
import { isDashboardSupportPath } from '@/lib/support-contact';
import { useI18n } from './language-provider';
export type SupportView = 'help' | 'contact';
export function openSupport(view: SupportView) {
  window.dispatchEvent(new CustomEvent('framy-open-support', { detail: view }));
}
export function SupportPanel() {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<SupportView>('help');
  const scroller = useRef<HTMLDivElement>(null);
  const opener = useRef<HTMLElement | null>(null);
  useEffect(() => {
    let frame = 0;
    const receive = (event: Event) => {
      const next = (event as CustomEvent).detail;
      if (next !== 'help' && next !== 'contact') return;
      opener.current =
        document.activeElement instanceof HTMLElement
          ? document.activeElement
          : null;
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        setView(next);
        setOpen(true);
      });
    };
    const intercept = (event: MouseEvent) => {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey ||
        !isDashboardSupportPath(window.location.pathname)
      )
        return;
      const anchor =
        event.target instanceof Element ? event.target.closest('a') : null;
      if (
        !anchor ||
        anchor.target === '_blank' ||
        anchor.hasAttribute('download')
      )
        return;
      const url = new URL(anchor.href, window.location.href);
      if (
        url.origin !== window.location.origin ||
        !['/ajuda', '/contacto'].includes(url.pathname)
      )
        return;
      event.preventDefault();
      openSupport(url.pathname === '/ajuda' ? 'help' : 'contact');
    };
    document.addEventListener('click', intercept);
    window.addEventListener('framy-open-support', receive);
    return () => {
      document.removeEventListener('click', intercept);
      window.removeEventListener('framy-open-support', receive);
      cancelAnimationFrame(frame);
    };
  }, []);
  const changeView = (next: SupportView) => {
    setView(next);
    scroller.current?.scrollTo({ top: 0 });
  };
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent
        side="right"
        className="support-panel"
        finalFocus={() => {
          const original = opener.current;
          if (original?.isConnected && original.getBoundingClientRect().width)
            original.focus({ preventScroll: true });
          else {
            const fallback = [
              ...document.querySelectorAll<HTMLButtonElement>(
                '.role-menu-trigger, [data-slot="sidebar-trigger"]',
              ),
            ].find((button) => button.getBoundingClientRect().width > 0);
            fallback?.focus({ preventScroll: true });
          }
          return false;
        }}
      >
        <div className="support-panel-header">
          <SheetTitle>{t('Apoio Framy')}</SheetTitle>
          <SheetDescription>
            {t(
              'O seu trabalho continua aberto. Feche este painel para voltar.',
            )}
          </SheetDescription>
          <nav aria-label={t('Conta e apoio')}>
            <button
              type="button"
              aria-pressed={view === 'help'}
              onClick={() => changeView('help')}
            >
              {t('Centro de ajuda')}
            </button>
            <button
              type="button"
              aria-pressed={view === 'contact'}
              onClick={() => changeView('contact')}
            >
              {t('Contactar a Framy')}
            </button>
          </nav>
        </div>
        <div className="support-panel-body help-page" ref={scroller}>
          <div hidden={view !== 'help'}>
            <HelpCentre embedded onContact={() => changeView('contact')} />
          </div>
          <div hidden={view !== 'contact'}>
            <ContactFramy embedded onHelp={() => changeView('help')} />
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
