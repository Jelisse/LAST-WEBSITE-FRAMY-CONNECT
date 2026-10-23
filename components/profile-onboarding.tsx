'use client';
import { useEffect, useRef } from 'react';
import { Check } from 'lucide-react';
import { FirstProfileWelcome } from './first-profile-welcome';
import { PanelBrand } from './panel-brand';
import { LanguageSelector, useI18n } from './language-provider';
export function ProfileOnboarding({
  phase,
  name,
  ready,
  error,
  onStart,
}: {
  phase: string;
  name: string;
  ready: boolean;
  error: string;
  onStart: () => void;
}) {
  const { t } = useI18n();
  const content = useRef<HTMLElement>(null);
  useEffect(() => {
    if (ready) content.current?.querySelector('h1')?.focus();
  }, [phase, ready]);
  const complete = phase === 'published' || phase === 'draft';
  return (
    <div className="profile-onboarding">
      <header className="onboarding-header">
        <PanelBrand />
        <LanguageSelector />
      </header>
      <main
        ref={content}
        id="main"
        className="onboarding-content"
        data-onboarding="true"
      >
        {!ready ? (
          <div className="panel">
            {error ? (
              <>
                <p role="alert">{t(error)}</p>
                <button className="btn" onClick={() => location.reload()}>
                  {t('Tentar novamente')}
                </button>
              </>
            ) : (
              <output>{t('A carregar…')}</output>
            )}
          </div>
        ) : complete ? (
          <section
            className="onboarding-complete"
            aria-labelledby="onboarding-complete-title"
          >
            <Check size={36} aria-hidden="true" />
            <h1 id="onboarding-complete-title" tabIndex={-1}>
              {t(
                phase === 'published'
                  ? 'O seu perfil está pronto!'
                  : 'Progresso guardado.',
              )}
            </h1>
            <p>
              {t(
                phase === 'published'
                  ? 'O seu perfil está publicado. Agora pode explorar as ferramentas da sua conta.'
                  : 'O seu perfil continua privado como rascunho. Pode continuar mais tarde no seu painel.',
              )}
            </p>
            <button
              className="btn"
              onClick={() => location.assign('/dashboard')}
            >
              {t('Explorar o meu painel')}
            </button>
          </section>
        ) : (
          <FirstProfileWelcome name={name} onStart={onStart} focused />
        )}
      </main>
    </div>
  );
}
