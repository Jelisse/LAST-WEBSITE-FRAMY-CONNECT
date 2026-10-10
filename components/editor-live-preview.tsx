'use client';
import { useRef, useState, type ReactNode } from 'react';
import { useI18n } from './language-provider';
import { IPhonePreview } from './iphone-preview';
import { Dialog, DialogContent, DialogTitle } from './ui/dialog';

/** Both editor journeys share the same live, unsaved profile preview. */
export function EditorLivePreview({ children }: { children: ReactNode }) {
  const { t } = useI18n();
  const [collapsed, setCollapsed] = useState(false);
  const [open, setOpen] = useState(false);
  const expandButton = useRef<HTMLButtonElement>(null);
  const scrollPosition = useRef(0);
  return <div className="editor-live-preview" data-collapsed={collapsed}>
    <div className="editor-preview-toolbar">
      <span>{t('Pré-visualização em directo')}</span>
      <div>
        <button type="button" aria-expanded={!collapsed} onClick={() => setCollapsed(!collapsed)}>
          {collapsed ? t('Mostrar') : t('Ocultar')}
        </button>
        <button ref={expandButton} type="button" aria-haspopup="dialog" onClick={() => {
          scrollPosition.current = window.scrollY;
          setOpen(true);
        }}>{t('Ampliar')}</button>
      </div>
    </div>
    <div className="editor-preview-mini" aria-hidden="true" inert>
      <div className="editor-preview-mini-canvas">{children}</div>
    </div>
    <div className="editor-preview-desktop"><IPhonePreview>{children}</IPhonePreview></div>
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="editor-preview-dialog" finalFocus={() => {
        expandButton.current?.focus({ preventScroll: true });
        requestAnimationFrame(() => window.scrollTo({ top: scrollPosition.current, behavior: 'instant' }));
        return false;
      }}>
        <DialogTitle>{t('Pré-visualização do perfil')}</DialogTitle>
        <IPhonePreview>{children}</IPhonePreview>
      </DialogContent>
    </Dialog>
  </div>;
}
