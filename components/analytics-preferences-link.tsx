'use client';
import { useI18n } from './language-provider';
export function AnalyticsPreferencesLink() {
  const { t } = useI18n();
  return (
    <button
      type="button"
      className="footer-preferences-link"
      onClick={() =>
        window.dispatchEvent(new Event('framy-analytics-preferences'))
      }
    >
      {t('Preferências de estatísticas')}
    </button>
  );
}
