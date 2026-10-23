'use client';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, AlertCircle } from 'lucide-react';
import { useI18n } from './language-provider';
import { refreshEvent, type RefreshFeedback } from '@/lib/dashboard-refresh';
export function DashboardRefreshFeedback() {
  const { t } = useI18n();
  const [bounds, setBounds] = useState({ left: 0, top: 0 });
  const [feedback, setFeedback] = useState<RefreshFeedback | null>(null);
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const receive = (event: Event) => {
      clearTimeout(timer);
      const next = (event as CustomEvent<RefreshFeedback>).detail;
      const main = document.querySelector('main')?.getBoundingClientRect();
      const header = document
        .querySelector('.workspace-header, .staff-topbar, .corporate-topbar')
        ?.getBoundingClientRect();
      setBounds({
        left: Math.max(0, main?.left ?? 0),
        top: Math.max(0, header?.bottom ?? 0),
      });
      setFeedback(next);
      if (next.phase === 'success')
        timer = setTimeout(() => setFeedback(null), 3000);
    };
    window.addEventListener(refreshEvent, receive);
    return () => {
      clearTimeout(timer);
      window.removeEventListener(refreshEvent, receive);
    };
  }, []);
  if (!feedback) return null;
  return createPortal(
    <div className="dashboard-refresh-overlay" style={bounds}>
      <div
        className="dashboard-refresh-feedback"
        data-phase={feedback.phase}
        role={feedback.phase === 'error' ? 'alert' : 'status'}
        aria-live="polite"
      >
        {feedback.phase === 'loading' ? (
          <>
            <span className="dashboard-refresh-ring" aria-hidden="true" />
            <span>{t('A actualizar…')}</span>
          </>
        ) : (
          <>
            {feedback.phase === 'success' ? (
              <Check aria-hidden="true" />
            ) : (
              <AlertCircle aria-hidden="true" />
            )}
            <strong>
              {t(
                feedback.phase === 'success'
                  ? 'Dados actualizados com sucesso.'
                  : 'Não foi possível actualizar os dados.',
              )}
            </strong>
            {feedback.preserved && (
              <small>{t('As alterações por guardar foram mantidas.')}</small>
            )}
            {feedback.phase === 'error' && (
              <div>
                <button onClick={feedback.retry}>
                  {t('Tentar novamente')}
                </button>
                <button onClick={() => setFeedback(null)}>{t('Fechar')}</button>
              </div>
            )}
          </>
        )}
      </div>
    </div>,
    document.body,
  );
}
