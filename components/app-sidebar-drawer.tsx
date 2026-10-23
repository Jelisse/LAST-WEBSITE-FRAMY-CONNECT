'use client';
import {
  cloneElement,
  useState,
  type ReactElement,
  type ComponentProps,
} from 'react';
import { Menu } from 'lucide-react';
import { AppSidebarContents } from './app-sidebar';
import { useI18n } from './language-provider';
import { Sheet, SheetContent, SheetTitle, SheetDescription } from './ui/sheet';

/** Mobile navigation shares exactly the same destinations as its desktop rail. */
export function AppSidebarDrawer({
  children,
}: {
  children: ReactElement<ComponentProps<typeof AppSidebarContents>>;
}) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  return (
    <div className="role-mobile-navigation">
      <button
        type="button"
        className="role-menu-trigger"
        aria-label={t('Abrir ou fechar menu')}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen(true)}
      >
        <Menu size={21} />
      </button>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="left" className="role-navigation-drawer">
          <SheetTitle className="sr-only">{t('Menu lateral')}</SheetTitle>
          <SheetDescription className="sr-only">
            {t('Navegação da conta no telemóvel.')}
          </SheetDescription>
          {cloneElement(children, {
            mobile: true,
            onNavigate: () => {
              children.props.onNavigate?.();
              setOpen(false);
            },
          })}
        </SheetContent>
      </Sheet>
    </div>
  );
}
