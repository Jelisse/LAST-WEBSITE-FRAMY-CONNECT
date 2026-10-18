'use client';
import type { Profile } from '@/lib/domain';
import {
  emptyProfileTranslation,
  profileLanguages,
  type ProfileLanguage,
  type ProfileTranslation,
} from '@/lib/profile-locales';
import { useI18n } from './language-provider';
const names = {
  en: 'English',
  'pt-MZ': 'Português',
  'zh-Hant': '繁體中文',
  uk: 'Українська',
  pl: 'Polski',
  fr: 'Français',
  'zh-Hans': '简体中文',
};
export function ProfileTranslationsEditor({
  profile,
  onChange,
}: {
  profile: Profile;
  onChange: (profile: Profile) => void;
}) {
  const { t } = useI18n();
  function update(locale: ProfileLanguage, patch: Partial<ProfileTranslation>) {
    onChange({
      ...profile,
      translations: {
        ...profile.translations,
        [locale]: {
          ...emptyProfileTranslation(),
          ...(locale === 'en' ? profile.extras?.english : {}),
          ...profile.translations?.[locale],
          ...patch,
        },
      },
    });
  }
  return (
    <section className="profile-translations-editor">
      <h3>{t('Idiomas do portefólio')}</h3>
      <p>
        {t(
          'A interface abre em inglês. Adicione as versões do seu conteúdo; os campos vazios mantêm o texto original. Não usamos tradução automática.',
        )}
      </p>
      <label>
        {t('Idioma do conteúdo original')}
        <select
          value={profile.contentLanguage ?? 'pt-MZ'}
          onChange={(e) =>
            onChange({
              ...profile,
              contentLanguage: e.target.value as ProfileLanguage,
            })
          }
        >
          {profileLanguages.map((locale) => (
            <option key={locale} value={locale}>
              {names[locale]}
            </option>
          ))}
        </select>
      </label>
      {profileLanguages.map((locale) => {
        const version = {
          ...emptyProfileTranslation(),
          ...(locale === 'en' ? profile.extras?.english : {}),
          ...profile.translations?.[locale],
        };
        return (
          <details key={locale}>
            <summary>{names[locale]}</summary>
            {(
              [
                ['title', 'Título ou profissão', 120],
                ['bio', 'Biografia', 1200],
                ['address', 'Endereço do negócio', 240],
                ['hours', 'Horário de atendimento', 240],
              ] as const
            ).map(([field, label, max]) => (
              <label key={field}>
                {t(label)}
                <textarea
                  lang={locale}
                  rows={field === 'bio' ? 4 : 2}
                  maxLength={max}
                  value={version[field]}
                  onChange={(e) => update(locale, { [field]: e.target.value })}
                />
              </label>
            ))}
            {(profile.links ?? []).map((link) => (
              <label key={link.url}>
                {t('Título do link')} · {link.label}
                <input
                  lang={locale}
                  maxLength={60}
                  value={
                    version.links.find((l) => l.url === link.url)?.label ?? ''
                  }
                  onChange={(e) =>
                    update(locale, {
                      links: [
                        ...version.links.filter((l) => l.url !== link.url),
                        { url: link.url, label: e.target.value },
                      ],
                    })
                  }
                />
              </label>
            ))}
            {(profile.extras?.services ?? []).map((service, index) => (
              <fieldset key={index}>
                <legend>
                  {service.title || `${t('Oferta ')}${index + 1}`}
                </legend>
                {(['title', 'description', 'price'] as const).map(
                  (field, i) => (
                    <label key={field}>
                      {t(['Nome', 'Descrição', 'Preço ou indicação'][i])}
                      <input
                        lang={locale}
                        maxLength={[80, 300, 60][i]}
                        value={version.services[index]?.[field] ?? ''}
                        onChange={(e) => {
                          const services = (profile.extras?.services ?? []).map(
                            (_, j) => ({
                              ...(version.services[j] ?? {
                                title: '',
                                description: '',
                                price: '',
                              }),
                            }),
                          );
                          services[index][field] = e.target.value;
                          update(locale, { services });
                        }}
                      />
                    </label>
                  ),
                )}
              </fieldset>
            ))}
          </details>
        );
      })}
    </section>
  );
}
