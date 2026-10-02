'use client';
import { useI18n } from '@/components/language-provider';
import type { PlanFeatures } from '@/lib/plan-features';
import type { Profile } from '@/lib/domain';
import { defaultExtras } from '@/lib/profile-growth';
export function ProfileExtrasEditor({
  profile,
  onChange,
  limit,
  features,
}: {
  profile: Profile;
  onChange: (p: Profile) => void;
  limit: number;
  features?: PlanFeatures;
}) {
  const { t } = useI18n();
  const e = {
    ...defaultExtras,
    ...profile.extras,
    english: { ...defaultExtras.english, ...profile.extras?.english },
  };
  const set = (patch: Partial<typeof e>) =>
    onChange({ ...profile, extras: { ...e, ...patch } });
  const contacts = [
    ...(profile.links ?? []),
    ...(profile.showEmail && profile.email
      ? [{ label: 'Email', url: 'mailto:' + profile.email }]
      : []),
    ...(profile.showPhone && profile.phone
      ? [{ label: 'Telefone', url: 'tel:' + profile.phone }]
      : []),
    ...(profile.business?.whatsapp
      ? [
          {
            label: 'WhatsApp',
            url:
              'https://wa.me/' +
              profile.business.whatsapp.replace(/[^0-9]/g, ''),
          },
        ]
      : []),
  ];
  return (
    <section className="profile-business-editor">
      <h3>{t('Mais valor para o seu negócio')}</h3>
      <p>
        {t(
          ' As ferramentas disponíveis dependem do seu plano. Os campos desactivados ficam guardados e não aparecem no perfil público. ',
        )}
      </p>
      <fieldset disabled={features?.showcase === false}>
        <details>
          <summary>
            {t('Produtos e serviços · ')}
            {e.services.length}/6
          </summary>
          <p>
            {t(
              ' Apresente o que oferece. O preço é informativo; o botão abre o endereço que escolher. ',
            )}
          </p>
          {e.services.map((s, i) => (
            <fieldset key={i}>
              <legend>
                {t('Oferta ')}
                {i + 1}
              </legend>
              <label>
                {t(' Nome ')}
                <input
                  maxLength={80}
                  value={s.title}
                  onChange={(ev) =>
                    set({
                      services: e.services.map((x, j) =>
                        j === i ? { ...x, title: ev.target.value } : x,
                      ),
                    })
                  }
                />
              </label>
              <label>
                {t(' Descrição ')}
                <textarea
                  maxLength={300}
                  value={s.description}
                  onChange={(ev) =>
                    set({
                      services: e.services.map((x, j) =>
                        j === i ? { ...x, description: ev.target.value } : x,
                      ),
                    })
                  }
                />
              </label>
              <label>
                {t(' Preço ou indicação ')}
                <input
                  placeholder={t('A partir de 500 MT · sob consulta')}
                  maxLength={60}
                  value={s.price}
                  onChange={(ev) =>
                    set({
                      services: e.services.map((x, j) =>
                        j === i ? { ...x, price: ev.target.value } : x,
                      ),
                    })
                  }
                />
              </label>
              <label>
                {t(' Link HTTPS ')}
                <input
                  type="url"
                  maxLength={300}
                  value={s.url}
                  onChange={(ev) =>
                    set({
                      services: e.services.map((x, j) =>
                        j === i ? { ...x, url: ev.target.value } : x,
                      ),
                    })
                  }
                />
              </label>
              <details>
                <summary>{t('Versão inglesa desta oferta')}</summary>
                {(
                  [
                    ['englishTitle', 'Nome em inglês', 80],
                    ['englishDescription', 'Descrição em inglês', 300],
                    ['englishPrice', 'Preço em inglês', 60],
                  ] as const
                ).map(([key, label, max]) => (
                  <label key={key}>
                    {t(label)}
                    <input
                      disabled={features?.english === false}
                      maxLength={max}
                      value={s[key] ?? ''}
                      onChange={(ev) =>
                        set({
                          services: e.services.map((x, j) =>
                            j === i ? { ...x, [key]: ev.target.value } : x,
                          ),
                        })
                      }
                    />
                  </label>
                ))}
              </details>
              <button
                type="button"
                onClick={() =>
                  set({ services: e.services.filter((_, j) => j !== i) })
                }
              >
                {t(' Remover oferta ')}
              </button>
            </fieldset>
          ))}
          <button
            type="button"
            disabled={e.services.length >= 6}
            onClick={() =>
              set({
                services: [
                  ...e.services,
                  { title: '', description: '', price: '', url: '' },
                ],
              })
            }
          >
            {t(' Adicionar produto ou serviço ')}
          </button>
        </details>
      </fieldset>
      <label className="growth-check">
        <input
          type="checkbox"
          disabled={features?.enquiries === false}
          checked={e.enquiries}
          onChange={(ev) => set({ enquiries: ev.target.checked })}
        />
        {t(' Receber pedidos de informação no perfil ')}
      </label>
      <p>
        {t(
          ' As mensagens ficam na sua caixa de entrada durante 90 dias. Não são enviadas automaticamente por email. ',
        )}
      </p>
      <fieldset disabled={features?.english === false}>
        <details>
          <summary>{t('Conteúdo em inglês')}</summary>
          <p>
            {t(
              ' Escreva a sua própria versão. O visitante pode alternar entre Português e English. Campos vazios mantêm o texto original. ',
            )}
          </p>
          <label>
            {t(' Título em inglês ')}
            <input
              value={e.english.title}
              maxLength={120}
              onChange={(ev) =>
                set({ english: { ...e.english, title: ev.target.value } })
              }
            />
          </label>
          <label>
            {t(' Biografia em inglês ')}
            <textarea
              value={e.english.bio}
              maxLength={600}
              onChange={(ev) =>
                set({ english: { ...e.english, bio: ev.target.value } })
              }
            />
          </label>
          <label>
            {t(' Horário em inglês ')}
            <textarea
              disabled={features?.location === false}
              value={e.english.hours}
              maxLength={240}
              onChange={(ev) =>
                set({ english: { ...e.english, hours: ev.target.value } })
              }
            />
          </label>
        </details>
      </fieldset>
      <details>
        <summary>{t('Links visíveis e contacto após o período pago')}</summary>
        <p>
          {t(' O plano actual apresenta até ')}
          {limit}{' '}
          {t(
            ' links. Os restantes ficam guardados. Escolha os que pretende mostrar; a ordem segue a lista do editor. ',
          )}
        </p>
        {(profile.links ?? []).map((l, i) => (
          <label className="growth-check" key={l.url + i}>
            <input
              type="checkbox"
              checked={
                e.visibleLinks === null
                  ? i < limit
                  : e.visibleLinks.includes(l.url)
              }
              onChange={(ev) => {
                const selection =
                  e.visibleLinks ??
                  (profile.links ?? []).slice(0, limit).map((x) => x.url);
                set({
                  visibleLinks: ev.target.checked
                    ? [...new Set([...selection, l.url])]
                    : selection.filter((url) => url !== l.url),
                });
              }}
            />
            {l.label}
          </label>
        ))}
        {e.visibleLinks && e.visibleLinks.length > limit && (
          <p role="alert">
            {t(' Seleccionou mais de ')}
            {limit}
            {t('. Apenas os primeiros ')}
            {limit} {t(' serão mostrados neste plano. ')}
          </p>
        )}
        <button type="button" onClick={() => set({ visibleLinks: null })}>
          {t(' Usar os primeiros links automaticamente ')}
        </button>
        <label>
          {t(' Contacto da página básica ')}
          <select
            value={e.primaryContact}
            onChange={(ev) => set({ primaryContact: ev.target.value })}
          >
            <option value="">{t('Primeiro contacto disponível')}</option>
            {contacts.map((c, i) => (
              <option key={c.url + i} value={c.url}>
                {c.label}
              </option>
            ))}
          </select>
        </label>
        <p>
          {t(
            ' Após a tolerância, ficam públicos apenas nome, fotografia e este contacto. Os restantes dados mantêm-se guardados. ',
          )}
        </p>
      </details>
    </section>
  );
}
