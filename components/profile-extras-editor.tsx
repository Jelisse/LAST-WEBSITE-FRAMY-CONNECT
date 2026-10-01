'use client';
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
      <h3>Mais valor para o seu negócio</h3>
      <p>
        As ferramentas disponíveis dependem do seu plano. Os campos desactivados
        ficam guardados e não aparecem no perfil público.
      </p>
      <fieldset disabled={features?.showcase === false}>
        <details>
          <summary>Produtos e serviços · {e.services.length}/6</summary>
          <p>
            Apresente o que oferece. O preço é informativo; o botão abre o
            endereço que escolher.
          </p>
          {e.services.map((s, i) => (
            <fieldset key={i}>
              <legend>Oferta {i + 1}</legend>
              <label>
                Nome
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
                Descrição
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
                Preço ou indicação
                <input
                  placeholder="A partir de 500 MT · sob consulta"
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
                Link HTTPS
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
                <summary>Versão inglesa desta oferta</summary>
                {(
                  [
                    ['englishTitle', 'Nome em inglês', 80],
                    ['englishDescription', 'Descrição em inglês', 300],
                    ['englishPrice', 'Preço em inglês', 60],
                  ] as const
                ).map(([key, label, max]) => (
                  <label key={key}>
                    {label}
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
                Remover oferta
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
            Adicionar produto ou serviço
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
        Receber pedidos de informação no perfil
      </label>
      <p>
        As mensagens ficam na sua caixa de entrada durante 90 dias. Não são
        enviadas automaticamente por email.
      </p>
      <fieldset disabled={features?.english === false}>
        <details>
          <summary>Conteúdo em inglês</summary>
          <p>
            Escreva a sua própria versão. O visitante pode alternar entre
            Português e English. Campos vazios mantêm o texto original.
          </p>
          <label>
            Título em inglês
            <input
              value={e.english.title}
              maxLength={120}
              onChange={(ev) =>
                set({ english: { ...e.english, title: ev.target.value } })
              }
            />
          </label>
          <label>
            Biografia em inglês
            <textarea
              value={e.english.bio}
              maxLength={600}
              onChange={(ev) =>
                set({ english: { ...e.english, bio: ev.target.value } })
              }
            />
          </label>
          <label>
            Horário em inglês
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
        <summary>Links visíveis e contacto após o período pago</summary>
        <p>
          O plano actual apresenta até {limit} links. Os restantes ficam
          guardados. Escolha os que pretende mostrar; a ordem segue a lista do
          editor.
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
            Seleccionou mais de {limit}. Apenas os primeiros {limit} serão
            mostrados neste plano.
          </p>
        )}
        <button type="button" onClick={() => set({ visibleLinks: null })}>
          Usar os primeiros links automaticamente
        </button>
        <label>
          Contacto da página básica
          <select
            value={e.primaryContact}
            onChange={(ev) => set({ primaryContact: ev.target.value })}
          >
            <option value="">Primeiro contacto disponível</option>
            {contacts.map((c, i) => (
              <option key={c.url + i} value={c.url}>
                {c.label}
              </option>
            ))}
          </select>
        </label>
        <p>
          Após a tolerância, ficam públicos apenas nome, fotografia e este
          contacto. Os restantes dados mantêm-se guardados.
        </p>
      </details>
    </section>
  );
}
