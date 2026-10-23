'use client';
import { useRef, useState, useLayoutEffect, type ReactNode } from 'react';
import { useI18n } from './language-provider';
import { IPhonePreview } from './iphone-preview';
import { Dialog, DialogContent, DialogTitle } from './ui/dialog';

/** Both editor journeys share the same live, unsaved profile preview. */
export function EditorLivePreview({ children }: { children: ReactNode }) {
  const { t } = useI18n();
  const [collapsed, setCollapsed] = useState(true);
  const [open, setOpen] = useState(false);
  const expandButton = useRef<HTMLButtonElement>(null);
  const scrollPosition = useRef(0);
  const desktopStage = useRef<HTMLDivElement>(null);
  const desktopCanvas = useRef<HTMLDivElement>(null);
  const [deviceSize, setDeviceSize] = useState({ scale: 1, height: 850 });
  useLayoutEffect(() => {
    const stage = desktopStage.current,
      canvas = desktopCanvas.current;
    if (!stage || !canvas) return;
    let frame = 0;
    const fit = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        if (!stage.clientWidth || !canvas.offsetHeight) return;
        const availableHeight = Math.max(
          260,
          window.innerHeight -
            Math.max(92, stage.getBoundingClientRect().top) -
            24,
        );
        const scale = Math.min(
          stage.clientWidth / 390,
          availableHeight / canvas.offsetHeight,
          1,
        );
        setDeviceSize({ scale, height: canvas.offsetHeight * scale });
      });
    };
    const observer = new ResizeObserver(fit);
    observer.observe(stage);
    observer.observe(canvas);
    window.addEventListener('resize', fit);
    window.addEventListener('scroll', fit, { passive: true });
    fit();
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', fit);
      window.removeEventListener('scroll', fit);
    };
  }, []);
  return (
    <div className="editor-live-preview" data-collapsed={collapsed}>
      <div className="editor-preview-toolbar">
        <span>{t('Pré-visualização em directo')}</span>
        <div>
          <button
            className="preview-mobile-toggle"
            type="button"
            aria-expanded={!collapsed}
            onClick={() => setCollapsed(!collapsed)}
          >
            {collapsed ? t('Mostrar') : t('Ocultar')}
          </button>
          <button
            ref={expandButton}
            type="button"
            aria-haspopup="dialog"
            onClick={() => {
              scrollPosition.current = window.scrollY;
              setOpen(true);
            }}
          >
            {t('Ampliar')}
          </button>
        </div>
      </div>
      <div className="editor-preview-mini" aria-hidden="true" inert>
        <div className="editor-preview-mini-canvas">{children}</div>
      </div>
      <div
        className="editor-preview-desktop"
        ref={desktopStage}
        style={{ height: deviceSize.height }}
      >
        <div
          className="editor-device-canvas"
          ref={desktopCanvas}
          style={{ transform: `translateX(-50%) scale(${deviceSize.scale})` }}
        >
          <IPhonePreview>{children}</IPhonePreview>
        </div>
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          className="editor-preview-dialog"
          finalFocus={() => {
            expandButton.current?.focus({ preventScroll: true });
            requestAnimationFrame(() =>
              window.scrollTo({
                top: scrollPosition.current,
                behavior: 'instant',
              }),
            );
            return false;
          }}
        >
          <DialogTitle>{t('Pré-visualização do perfil')}</DialogTitle>
          <IPhonePreview>{children}</IPhonePreview>
        </DialogContent>
      </Dialog>
    </div>
  );
}
