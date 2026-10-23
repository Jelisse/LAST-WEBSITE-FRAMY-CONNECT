'use client';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import { useI18n } from './language-provider';
import {
  companyCardProfile,
  type CompanyTemplate,
  type CompanyCard,
} from '@/lib/company-cards';
import { profileColors } from '@/lib/profile-business';
import { MobileProfile } from './mobile-profile';
import { EditorLivePreview } from './editor-live-preview';
import { CompanyShare } from './company-share';
type Member = {
  account_id: string;
  name: string;
  team: string;
  id: string | null;
  published_at: number | null;
  template_version: number | null;
};
type Pending = {
  account_id: string;
  name: string;
  email: string;
  team: string;
  prepared_version: number | null;
  delivery: string;
  expires_at: number;
};
type Info = {
  role: string;
  analytics: boolean;
  account: string;
  targetActive: boolean;
  template: CompanyTemplate;
  templateVersion: number;
  name: string;
  prepared: CompanyCard | null;
  preparedVersion: number;
  card: null | {
    id: string;
    version: number;
    published_at: number | null;
    template_version: number;
    draft: CompanyCard;
  };
  roster: Member[];
  pending: Pending[];
  metrics: { target: string; count: number }[];
  received: number;
};
const fields = {
  name: 'Nome completo',
  title: 'Título ou profissão',
  email: 'Email de contacto',
  phone: 'Telefone',
  photoUrl: 'Fotografia',
  whatsapp: 'WhatsApp',
  links: 'Redes sociais',
};
const designs = {
  mountain: 'Montanha Framy',
  minimal: 'Essencial',
  editorial: 'Editorial',
};
export function CompanyImage({
  label,
  value,
  onChange,
  disabled = false,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
}) {
  const { t } = useI18n();
  const [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  return (
    <div className="company-image">
      <label>
        {t(label)}
        <input
          type="file"
          accept="image/png,image/jpeg,image/webp"
          disabled={disabled || busy}
          onChange={async (e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            setBusy(true);
            setError('');
            try {
              if (file.size > 5 * 1024 * 1024)
                throw Error('A fotografia deve ter até 5 MB.');
              const r = await fetch('/api/profile-photo', {
                method: 'POST',
                headers: { 'Content-Type': file.type },
                body: file,
              });
              const b = (await r.json()) as {
                error?: string;
                photoUrl: string;
              };
              if (!r.ok) throw Error(b.error);
              onChange(b.photoUrl);
            } catch (err) {
              setError(err instanceof Error ? err.message : 'Tente novamente.');
            } finally {
              setBusy(false);
              e.target.value = '';
            }
          }}
        />
      </label>
      {value && (
        <>
          <Image
            unoptimized
            src={value}
            alt={t(label)}
            width="80"
            height="64"
          />
          <button
            type="button"
            disabled={disabled || busy}
            onClick={() => onChange('')}
          >
            {t('Remover imagem')}
          </button>
        </>
      )}
      {busy && <output>{t('A carregar…')}</output>}
      {error && <p role="alert">{t(error)}</p>}
    </div>
  );
}
export function CompanyCards({ organisation }: { organisation: string }) {
  const { t } = useI18n();
  const [now] = useState(() => Date.now());
  const [info, setInfo] = useState<Info | null>(null),
    [template, setTemplate] = useState<CompanyTemplate | null>(null),
    [card, setCard] = useState<CompanyCard | null>(null),
    [account, setAccount] = useState(''),
    [page, setPage] = useState('overview'),
    [tab, setTab] = useState('appearance'),
    [cardTab, setCardTab] = useState('information'),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [message, setMessage] = useState('');
  const baseline =
    info?.card?.draft ??
    info?.prepared ??
    (info
      ? {
          name: info.name,
          title: '',
          email: '',
          phone: '',
          showEmail: false,
          showPhone: false,
        }
      : null);
  const templateDirty =
      !!info && JSON.stringify(template) !== JSON.stringify(info.template),
    cardDirty = !!info && JSON.stringify(card) !== JSON.stringify(baseline),
    dirty = templateDirty || cardDirty;
  async function load(target = account, preserve?: 'template' | 'card') {
    const r = await fetch(
      '/api/company-cards?organisation=' +
        encodeURIComponent(organisation) +
        (target ? '&account=' + encodeURIComponent(target) : ''),
      { cache: 'no-store' },
    );
    const b = (await r.json()) as Info & { error?: string };
    if (!r.ok) throw Error(b.error);
    setInfo(b);
    if (preserve !== 'template') setTemplate(b.template);
    if (preserve !== 'card')
      setCard(
        b.card?.draft ??
          b.prepared ?? {
            name: b.name,
            title: '',
            email: '',
            phone: '',
            showEmail: false,
            showPhone: false,
          },
      );
    setError('');
  }
  useEffect(() => {
    let current = true;
    void fetch(
      '/api/company-cards?organisation=' + encodeURIComponent(organisation),
      { cache: 'no-store' },
    )
      .then(async (r) => {
        const b = (await r.json()) as Info & { error?: string };
        if (!r.ok) throw Error(b.error);
        if (current) {
          setInfo(b);
          setAccount('');
          setTemplate(b.template);
          setCard(
            b.card?.draft ??
              b.prepared ?? {
                name: b.name,
                title: '',
                email: '',
                phone: '',
                showEmail: false,
                showPhone: false,
              },
          );
        }
      })
      .catch((e) => {
        if (current) setError(e.message);
      });
    return () => {
      current = false;
    };
  }, [organisation]);
  useEffect(() => {
    const guard = (e: BeforeUnloadEvent) => {
      if (dirty) e.preventDefault();
    };
    window.addEventListener('beforeunload', guard);
    return () => window.removeEventListener('beforeunload', guard);
  }, [dirty]);
  async function act(action: string) {
    if (busy || !info) return;
    setBusy(true);
    setError('');
    setMessage('');
    try {
      if (
        action === 'template' &&
        !window.confirm(
          t('Aplicar este modelo aos cartões publicados da empresa?'),
        )
      )
        return;
      const r = await fetch('/api/company-cards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organisation,
          account: account || undefined,
          action,
          version:
            action === 'template'
              ? info.templateVersion
              : (info.card?.version ??
                (account && !info.targetActive ? info.preparedVersion : 0)),
          templateVersion: info.templateVersion,
          template,
          card,
        }),
      });
      const b = (await r.json()) as { error?: string };
      if (!r.ok) throw Error(b.error);
      await load(account, action === 'template' ? 'card' : 'template');
      setMessage(
        action === 'publish-card'
          ? 'Cartão da empresa publicado.'
          : 'Alteração guardada.',
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Tente novamente.');
    } finally {
      setBusy(false);
    }
  }
  async function selectAccount(target: string) {
    if (busy) return;
    if (dirty && !window.confirm(t('Descartar alterações não guardadas?')))
      return;
    setBusy(true);
    try {
      await load(target);
      setAccount(target);
      setPage('cards');
      setCardTab('information');
      setMessage('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Tente novamente.');
    } finally {
      setBusy(false);
    }
  }
  if (!info || !template || !card)
    return (
      <section className="corporate-panel">
        <p role={error ? 'alert' : 'status'}>{t(error || 'A carregar…')}</p>
        {error && (
          <button onClick={() => load().catch((e) => setError(e.message))}>
            {t('Tentar novamente')}
          </button>
        )}
      </section>
    );
  const leader = info.role === 'leader',
    managed = !!account,
    editable = (key: string) =>
      leader || template.editable?.includes(key) !== false;
  const set = (key: keyof CompanyCard, value: unknown) =>
    setCard({ ...card, [key]: value });
  const published = info.roster.filter((m) => m.published_at).length;
  const steps = [
    {
      label: 'Marca preparada',
      value: info.templateVersion ? 1 : 0,
      total: 1,
      page: 'template',
    },
    {
      label: 'Pessoas e convites da equipa',
      value: info.roster.length + info.pending.length,
      total: null,
      page: 'cards',
    },
    {
      label: 'Cartões activados',
      value: published,
      total: info.roster.length,
      page: 'cards',
    },
    {
      label: 'Contactos recebidos',
      value: info.received,
      total: null,
      page: 'contacts',
    },
  ];
  return (
    <div
      className="company-launch"
      data-company-unsaved={dirty ? 'true' : undefined}
    >
      <nav className="company-tabs" aria-label={t('Área da empresa')}>
        {(leader ? ['overview', 'template', 'cards'] : ['cards']).map((p) => (
          <button key={p} aria-pressed={page === p} onClick={() => setPage(p)}>
            {t(
              {
                overview: 'Visão geral',
                template: 'Modelo da empresa',
                cards: 'Cartões da equipa',
              }[p]!,
            )}
          </button>
        ))}
      </nav>
      {error && (
        <div className="company-alert" role="alert">
          <p>{t(error)}</p>
          <p>{t('As alterações não guardadas foram mantidas.')}</p>
          <button
            onClick={() => {
              if (
                !dirty ||
                window.confirm(t('Descartar alterações não guardadas?'))
              )
                void load().catch((e) => setError(e.message));
            }}
          >
            {t('Actualizar dados')}
          </button>
        </div>
      )}
      {message && <output>{t(message)}</output>}
      {leader && page === 'overview' && (
        <>
          <section className="company-launch-intro">
            <span>{t('UMA EMPRESA. UMA APRESENTAÇÃO CONSISTENTE.')}</span>
            <h2>
              {t('Prepare a marca. Active a equipa. Continue a conversa.')}
            </h2>
            <p>
              {t(
                'Os cartões da empresa são independentes dos perfis pessoais. Cada colaborador confirma os contactos que publica.',
              )}
            </p>
          </section>
          <div className="company-progress">
            {steps.map((step, i) => (
              <article key={step.label}>
                <span>0{i + 1}</span>
                <h3>{t(step.label)}</h3>
                <strong>
                  {step.value}
                  {step.total !== null ? ' / ' + step.total : ''}
                </strong>
                {step.page === 'contacts' ? (
                  <a
                    href={
                      '/corporativo/contactos?organisation=' +
                      encodeURIComponent(organisation)
                    }
                  >
                    {t('Abrir contactos')}
                  </a>
                ) : (
                  <button onClick={() => setPage(step.page)}>
                    {t('Continuar')}
                  </button>
                )}
              </article>
            ))}
          </div>
          <section className="corporate-panel">
            <h3>{t('O próximo passo')}</h3>
            <p>
              {t(
                !info.templateVersion
                  ? 'Crie o modelo antes de preparar os cartões.'
                  : info.pending.length
                    ? 'Existem convites a aguardar aceitação. Prepare os cartões e acompanhe a activação.'
                    : published < info.roster.length
                      ? 'Prepare os cartões em falta para a equipa rever e activar.'
                      : 'A equipa está pronta. Partilhe os cartões e acompanhe os novos contactos.',
              )}
            </p>
            <a
              href={
                '/corporativo/equipa?organisation=' +
                encodeURIComponent(organisation)
              }
            >
              {t('Convidar e gerir colaboradores')}
            </a>
          </section>
          {info.analytics && (
            <section className="corporate-panel">
              <h3>{t('Actividade dos cartões — 30 dias')}</h3>
              <p>
                {t(
                  'Totais agregados, não visitantes únicos. As visitas exigem consentimento; os cliques respeitam DNT/GPC. Campanhas têm relatórios separados.',
                )}
              </p>
              <div className="company-progress">
                {['view', 'contact', 'whatsapp', 'email'].map((target) => (
                  <article key={target}>
                    <span>
                      {t(
                        {
                          view: 'Visitas consentidas',
                          contact: 'Contactos guardados',
                          whatsapp: 'WhatsApp',
                          email: 'Email',
                        }[target]!,
                      )}
                    </span>
                    <strong>
                      {info.metrics.find((m) => m.target === target)?.count ??
                        0}
                    </strong>
                  </article>
                ))}
              </div>
            </section>
          )}
        </>
      )}
      {leader && page === 'template' && (
        <div className="company-card-grid">
          <section className="corporate-panel company-template">
            <div className="company-editor-heading">
              <h3>{t('Modelo da empresa')}</h3>
              <button
                type="button"
                disabled={busy || (!templateDirty && !!info.templateVersion)}
                onClick={() => act('template')}
              >
                {t('Guardar modelo')}
              </button>
            </div>
            <p>
              {t(
                'Pré-visualização do rascunho. Guardar aplica a marca aos cartões publicados; os contactos privados mantêm-se separados.',
              )}
            </p>
            <nav className="company-tabs" aria-label={t('Editar modelo')}>
              {['appearance', 'information', 'fields', 'settings'].map(
                (key) => (
                  <button
                    key={key}
                    aria-pressed={tab === key}
                    onClick={() => setTab(key)}
                  >
                    {t(
                      {
                        appearance: 'Aparência',
                        information: 'Informação',
                        fields: 'Contactos e permissões',
                        settings: 'Definições',
                      }[key]!,
                    )}
                  </button>
                ),
              )}
            </nav>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void act('template');
              }}
            >
              <fieldset disabled={busy}>
                {tab === 'appearance' && (
                  <>
                    <div className="company-designs">
                      {Object.entries(designs).map(([key, label]) => (
                        <button
                          type="button"
                          key={key}
                          className={'company-design ' + key}
                          aria-pressed={(template.design || 'mountain') === key}
                          onClick={() =>
                            setTemplate({
                              ...template,
                              design: key as CompanyTemplate['design'],
                            })
                          }
                        >
                          <span aria-hidden="true" />
                          <strong>{t(label)}</strong>
                        </button>
                      ))}
                    </div>
                    <label>
                      {t('Cor da empresa')}
                      <select
                        value={
                          profileColors.some((c) => c.value === template.accent)
                            ? template.accent
                            : 'custom'
                        }
                        onChange={(e) =>
                          setTemplate({
                            ...template,
                            accent:
                              e.target.value === 'custom'
                                ? '#ee590d'
                                : e.target.value,
                          })
                        }
                      >
                        {profileColors.map((c) => (
                          <option value={c.value} key={c.value}>
                            {t(c.label)}
                          </option>
                        ))}
                        <option value="custom">{t('Cor personalizada')}</option>
                      </select>
                    </label>
                    <label>
                      {t('Cor exacta da marca')}
                      <input
                        type="color"
                        value={
                          template.accent.startsWith('#')
                            ? template.accent
                            : profileColors.find(
                                (c) => c.value === template.accent,
                              )?.hex || '#ee590d'
                        }
                        onChange={(e) =>
                          setTemplate({ ...template, accent: e.target.value })
                        }
                      />
                    </label>
                    <CompanyImage
                      label="Logótipo da empresa"
                      value={template.logoUrl || ''}
                      onChange={(v) => setTemplate({ ...template, logoUrl: v })}
                    />
                    <CompanyImage
                      label="Imagem de capa"
                      value={template.coverUrl || ''}
                      onChange={(v) =>
                        setTemplate({ ...template, coverUrl: v })
                      }
                    />
                  </>
                )}
                {tab === 'information' && (
                  <>
                    {(['company', 'headline', 'website'] as const).map(
                      (key) => (
                        <label key={key}>
                          {t(
                            {
                              company: 'Nome da empresa',
                              headline: 'Apresentação da empresa',
                              website: 'Website da empresa',
                            }[key],
                          )}
                          {key === 'headline' ? (
                            <textarea
                              rows={4}
                              maxLength={200}
                              value={template[key]}
                              onChange={(e) =>
                                setTemplate({
                                  ...template,
                                  [key]: e.target.value,
                                })
                              }
                            />
                          ) : (
                            <input
                              required={key === 'company'}
                              maxLength={key === 'company' ? 90 : 300}
                              value={template[key]}
                              onChange={(e) =>
                                setTemplate({
                                  ...template,
                                  [key]: e.target.value,
                                })
                              }
                            />
                          )}
                        </label>
                      ),
                    )}
                  </>
                )}
                {tab === 'fields' && (
                  <>
                    <p>
                      {t(
                        'Seleccione os campos que cada colaborador pode editar. A visibilidade do email e telefone continua a ser confirmada pelo titular.',
                      )}
                    </p>
                    {Object.entries(fields).map(([key, label]) => (
                      <label className="company-check" key={key}>
                        <input
                          type="checkbox"
                          checked={template.editable?.includes(key) ?? true}
                          onChange={(e) => {
                            const list =
                              template.editable ?? Object.keys(fields);
                            setTemplate({
                              ...template,
                              editable: e.target.checked
                                ? [...list, key]
                                : list.filter((k) => k !== key),
                            });
                          }}
                        />
                        {t(label)}
                      </label>
                    ))}
                  </>
                )}
                {tab === 'settings' && (
                  <>
                    <label>
                      {t('Nome interno do modelo')}
                      <input
                        maxLength={90}
                        value={template.internalName ?? template.company}
                        onChange={(e) =>
                          setTemplate({
                            ...template,
                            internalName: e.target.value,
                          })
                        }
                      />
                    </label>
                    <p>
                      {t(
                        'A marca é gerida pela empresa. Apenas cartões publicados de colaboradores activos ficam disponíveis por link. Não são indexados por motores de pesquisa.',
                      )}
                    </p>
                  </>
                )}
                <div className="company-savebar">
                  <span>
                    {t(
                      templateDirty
                        ? 'Alterações por guardar'
                        : info.templateVersion
                          ? 'Modelo guardado'
                          : 'Modelo ainda não guardado',
                    )}
                  </span>
                  <button disabled={!templateDirty && !!info.templateVersion}>
                    {t('Guardar modelo e actualizar cartões')}
                  </button>
                </div>
              </fieldset>
            </form>
          </section>
          <aside className="company-card-preview">
            <EditorLivePreview>
              <MobileProfile
                profile={companyCardProfile(
                  card,
                  template,
                  info.card?.id ?? 'preview',
                )}
                companyTemplate={template}
                preview
                measure={false}
              />
            </EditorLivePreview>
          </aside>
        </div>
      )}
      {(page === 'cards' || !leader) && (
        <>
          <section className="company-launch-intro">
            <h2>
              {t(
                managed
                  ? 'Preparar cartão do colaborador'
                  : 'O meu cartão da empresa',
              )}
            </h2>
            <p>
              {t(
                managed
                  ? 'Prepare os dados. O colaborador confirma a visibilidade e publica o seu cartão.'
                  : 'Reveja os dados preparados pela empresa, confirme a visibilidade e active o seu cartão.',
              )}
            </p>
            {leader && (
              <>
                <button onClick={() => selectAccount('')}>
                  {t('O meu cartão')}
                </button>
                <a
                  href={
                    '/corporativo/equipa?organisation=' +
                    encodeURIComponent(organisation)
                  }
                >
                  {t('Convidar colaboradores')}
                </a>
              </>
            )}
          </section>
          {!info.templateVersion ? (
            <p>
              {t(
                'O responsável deve guardar o modelo da empresa antes da activação dos cartões.',
              )}
            </p>
          ) : (
            <div className="company-card-grid">
              <section className="corporate-panel">
                <h3>{card.name}</h3>
                <nav className="company-tabs" aria-label={t('Editar cartão')}>
                  {['information', 'contacts', 'appearance', 'settings'].map(
                    (key) => (
                      <button
                        key={key}
                        aria-pressed={cardTab === key}
                        onClick={() => setCardTab(key)}
                      >
                        {t(
                          {
                            information: 'Informação',
                            contacts: 'Contactos',
                            appearance: 'Fotografia',
                            settings: 'Visibilidade',
                          }[key]!,
                        )}
                      </button>
                    ),
                  )}
                </nav>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    void act('save-card');
                  }}
                >
                  <fieldset disabled={busy}>
                    {(cardTab === 'information' || cardTab === 'contacts') &&
                      (cardTab === 'information'
                        ? ['name', 'title']
                        : ['email', 'phone', 'whatsapp']
                      ).map((key) => (
                        <label key={key}>
                          {t(fields[key as keyof typeof fields])}
                          {!editable(key) && (
                            <small>{t('Gerido pela empresa')}</small>
                          )}
                          <input
                            type={
                              key === 'email'
                                ? 'email'
                                : key === 'phone' || key === 'whatsapp'
                                  ? 'tel'
                                  : 'text'
                            }
                            autoComplete={
                              key === 'name'
                                ? 'name'
                                : key === 'email'
                                  ? 'email'
                                  : key === 'phone'
                                    ? 'tel'
                                    : 'off'
                            }
                            disabled={!editable(key)}
                            value={
                              card[
                                key as
                                  | 'name'
                                  | 'title'
                                  | 'email'
                                  | 'phone'
                                  | 'whatsapp'
                              ] ?? ''
                            }
                            maxLength={
                              key === 'name'
                                ? 90
                                : key === 'title'
                                  ? 120
                                  : key === 'email'
                                    ? 160
                                    : 24
                            }
                            required={key === 'name'}
                            placeholder={
                              key === 'whatsapp' ? '+258840000000' : undefined
                            }
                            onChange={(e) =>
                              set(key as keyof CompanyCard, e.target.value)
                            }
                          />
                        </label>
                      ))}
                    {cardTab === 'contacts' && (
                      <div className="company-social-editor">
                        <h4>{t('Redes sociais')}</h4>
                        <p>
                          {t(
                            'No cartão, as redes aparecem como ícones para poupar espaço. Estes links ficam públicos ao activar o cartão.',
                          )}
                        </p>
                        {(card.links ?? []).map((link, i) => (
                          <div key={i}>
                            <label>
                              {t('Nome da rede')}
                              <input
                                disabled={!editable('links')}
                                value={link.label}
                                maxLength={60}
                                onChange={(e) =>
                                  set(
                                    'links',
                                    card.links!.map((v, j) =>
                                      j === i
                                        ? { ...v, label: e.target.value }
                                        : v,
                                    ),
                                  )
                                }
                              />
                            </label>
                            <label>
                              {t('Endereço da rede')}
                              <input
                                disabled={!editable('links')}
                                value={link.url}
                                maxLength={300}
                                placeholder="https://instagram.com/..."
                                onChange={(e) =>
                                  set(
                                    'links',
                                    card.links!.map((v, j) =>
                                      j === i
                                        ? { ...v, url: e.target.value }
                                        : v,
                                    ),
                                  )
                                }
                              />
                            </label>
                            <button
                              type="button"
                              disabled={!editable('links')}
                              onClick={() =>
                                set(
                                  'links',
                                  card.links!.filter((_, j) => j !== i),
                                )
                              }
                            >
                              {t('Remover')}
                            </button>
                          </div>
                        ))}
                        <button
                          type="button"
                          disabled={
                            !editable('links') ||
                            (card.links?.length ?? 0) >= 12
                          }
                          onClick={() =>
                            set('links', [
                              ...(card.links ?? []),
                              { label: 'Instagram', url: '' },
                            ])
                          }
                        >
                          {t('Adicionar rede social')}
                        </button>
                      </div>
                    )}
                    {cardTab === 'appearance' && (
                      <CompanyImage
                        label="Fotografia do colaborador"
                        disabled={!editable('photoUrl')}
                        value={card.photoUrl || ''}
                        onChange={(v) => set('photoUrl', v)}
                      />
                    )}
                    {cardTab === 'settings' && (
                      <>
                        <label>
                          {t('Nome interno do cartão')}
                          <input
                            value={card.internalName ?? card.name}
                            maxLength={90}
                            onChange={(e) =>
                              set('internalName', e.target.value)
                            }
                          />
                        </label>
                        <p>
                          {t(
                            'Este nome é privado e serve apenas para organizar o cartão.',
                          )}
                        </p>
                        {(['showEmail', 'showPhone'] as const).map((key) => (
                          <label className="company-check" key={key}>
                            <input
                              type="checkbox"
                              checked={card[key]}
                              disabled={managed}
                              onChange={(e) => set(key, e.target.checked)}
                            />
                            {t(
                              key === 'showEmail'
                                ? 'Mostrar email ao público'
                                : 'Mostrar telefone ao público',
                            )}
                          </label>
                        ))}
                        <p>
                          {t(
                            'WhatsApp e redes adicionados ficam públicos. Guardar um rascunho não altera os contactos já publicados.',
                          )}
                        </p>
                      </>
                    )}
                    <div className="company-savebar">
                      <span>
                        {t(
                          cardDirty
                            ? 'Alterações por guardar'
                            : info.card || info.preparedVersion
                              ? 'Rascunho guardado'
                              : 'Rascunho ainda não guardado',
                        )}
                      </span>
                      <button>
                        {t(
                          managed
                            ? 'Guardar cartão preparado'
                            : 'Guardar rascunho',
                        )}
                      </button>
                      {!managed && (
                        <button
                          type="button"
                          onClick={() => act('publish-card')}
                        >
                          {t(
                            info.card?.published_at
                              ? 'Actualizar publicação'
                              : 'Activar e publicar cartão',
                          )}
                        </button>
                      )}
                    </div>
                  </fieldset>
                </form>
                {info.card?.published_at && !managed && (
                  <>
                    <CompanyShare id={info.card.id} name={card.name} />
                    <button
                      disabled={busy}
                      onClick={() => act('unpublish-card')}
                    >
                      {t('Retirar publicação')}
                    </button>
                  </>
                )}
              </section>
              <aside className="company-card-preview">
                <span>{t('PRÉ-VISUALIZAÇÃO DO RASCUNHO')}</span>
                <MobileProfile
                  profile={companyCardProfile(
                    card,
                    info.template,
                    info.card?.id ?? 'preview',
                  )}
                  companyTemplate={info.template}
                  preview
                  measure={false}
                />
              </aside>
            </div>
          )}
          {leader && (
            <section className="corporate-panel">
              <h3>{t('Activação da equipa')}</h3>
              <div className="corporate-table">
                <table>
                  <thead>
                    <tr>
                      {[
                        'Colaborador',
                        'Equipa',
                        'Estado',
                        'Marca',
                        'Acções',
                      ].map((k) => (
                        <th key={k}>{t(k)}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {info.roster.map((m) => (
                      <tr key={m.account_id}>
                        <td>{m.name}</td>
                        <td>{m.team || '—'}</td>
                        <td>
                          {t(
                            m.published_at
                              ? 'Publicado'
                              : m.id
                                ? 'Rascunho'
                                : 'Por preparar',
                          )}
                        </td>
                        <td>
                          {t(
                            m.published_at
                              ? 'Marca aplicada'
                              : 'A aplicar na publicação',
                          )}
                        </td>
                        <td>
                          <button
                            onClick={() =>
                              selectAccount(
                                m.account_id === info.account && !managed
                                  ? ''
                                  : m.account_id,
                              )
                            }
                          >
                            {t('Preparar cartão')}
                          </button>
                          {m.id && m.published_at && (
                            <a
                              href={'/equipa/' + m.id}
                              target="_blank"
                              rel="noreferrer"
                            >
                              {t('Ver cartão')}
                            </a>
                          )}
                        </td>
                      </tr>
                    ))}
                    {info.pending.map((m) => (
                      <tr key={'pending' + m.account_id}>
                        <td>{m.name || m.email}</td>
                        <td>{m.team || '—'}</td>
                        <td>
                          {t(
                            m.expires_at < now
                              ? 'Convite expirado'
                              : m.prepared_version
                                ? 'Cartão preparado · convite pendente'
                                : 'Convite pendente',
                          )}
                        </td>
                        <td>—</td>
                        <td>
                          <button
                            disabled={m.expires_at < now}
                            onClick={() => selectAccount(m.account_id)}
                          >
                            {t('Preparar cartão')}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <a
                href={
                  '/corporativo/equipa?organisation=' +
                  encodeURIComponent(organisation)
                }
              >
                {t('Gerir convites e reenviar')}
              </a>
            </section>
          )}
        </>
      )}
    </div>
  );
}
