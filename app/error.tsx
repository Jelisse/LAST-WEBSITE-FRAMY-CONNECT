'use client';
import { useI18n } from '@/components/language-provider';

import { Button } from '@/components/ui/button';
export default function ErrorPage({ reset }: { reset: () => void }) {
  const { t } = useI18n();
  return (
    <main id="main" className="section-wrap information-page">
      <h1>{t('Não foi possível carregar.')}</h1>
      <p>
        {t(
          'Tente novamente dentro de instantes. Os seus dados guardados não foram alterados.',
        )}
      </p>
      <Button className="btn btn-primary" onClick={reset}>
        {t('Tentar novamente')}
      </Button>
    </main>
  );
}
