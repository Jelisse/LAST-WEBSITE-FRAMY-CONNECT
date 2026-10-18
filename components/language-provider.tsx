'use client';
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Languages } from 'lucide-react';
import { translator, validLocale, type Locale } from '@/lib/i18n';
const LanguageContext = createContext<Locale>('pt-MZ');
export function LanguageProvider({
  locale,
  children,
}: {
  locale: Locale;
  children: ReactNode;
}) {
  const [profileLocale, setProfileLocale] = useState<Locale | null>(null);
  const currentLocale = profileLocale ?? locale;
  useEffect(() => {
    const onProfileLanguage = (event: Event) => setProfileLocale(validLocale((event as CustomEvent).detail));
    window.addEventListener('framy-profile-language', onProfileLanguage);
    return () => window.removeEventListener('framy-profile-language', onProfileLanguage);
  }, []);
  return (
    <LanguageContext.Provider value={currentLocale}>
      {children}
    </LanguageContext.Provider>
  );
}
export function useI18n() {
  const locale = useContext(LanguageContext);
  return { locale, t: useMemo(() => translator(locale), [locale]) };
}
export function SkipToContentLink() {
  const { t } = useI18n();
  return <a className="skip-link" href="#main">{t('Saltar para o conteúdo')}</a>;
}
export function LanguageSelector() {
  const { locale, t } = useI18n();
  return (
    <label className="language-selector">
      <span className="sr-only">{t('Idioma')}</span>
      <Languages className="language-selector-icon" size={18} aria-hidden="true" />
      <select
        aria-label={t('Idioma')}
        value={locale}
        onChange={(event) => {
          const next = validLocale(event.target.value);
          document.cookie = `framy-language=${next}; Path=/; Max-Age=31536000; SameSite=Lax${location.protocol === 'https:' ? '; Secure' : ''}`;
          window.location.reload();
        }}
      >
        <option value="pt-MZ" lang="pt-MZ">
          Português
        </option>
        <option value="en" lang="en">
          English
        </option>
        <option value="zh-Hant" lang="zh-Hant">
          中文（繁體）
        </option>
      </select>
    </label>
  );
}
