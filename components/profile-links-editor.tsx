'use client';
import { useI18n } from '@/components/language-provider';

import { ArrowDown, ArrowUp, LockKeyhole, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  getPlan,
  type ManagedPlan,
  type PlanId,
  type Profile,
} from '@/lib/domain';

export function ProfileLinksEditor({
  profile,
  planId,
  terms,
  disabled,
  onChange,
  onUpgrade,
}: {
  profile: Profile;
  planId: PlanId;
  terms?: ManagedPlan;
  disabled: boolean;
  onChange: (profile: Profile) => void;
  onUpgrade: () => void;
}) {
  const { t } = useI18n();
  const plan = terms ?? getPlan(planId),
    links = profile.links ?? [];
  function move(index: number, delta: number) {
    const next = [...links];
    [next[index], next[index + delta]] = [next[index + delta], next[index]];
    onChange({ ...profile, links: next });
  }
  return (
    <section className="link-editor" aria-labelledby="links-editor-title">
      <div className="link-editor-heading">
        <div>
          <h3 id="links-editor-title">{t('Os seus links')}</h3>
          <p>
            {links.length}
            {t(' de ')}
            {plan.links}
            {t(' caixas utilizadas · ')}
            {t(plan.name)}
          </p>
        </div>
        <Button
          type="button"
          className="plan-text-button"
          variant="ghost"
          disabled={disabled}
          onClick={onUpgrade}
        >
          {t('Escolher plano')}
        </Button>
      </div>
      <p className="link-editor-note">
        {t(
          'Adicione redes sociais, portefólio ou outros destinos. Os links aparecem no perfil quando publicar.',
        )}
      </p>
      <div className="link-editor-list">
        {links.map((link, index) => (
          <fieldset className="link-edit-box" key={index} disabled={disabled}>
            <legend>
              {t('Link ')}
              {index + 1}
            </legend>
            <label htmlFor={`link-label-${index}`}>
              {t('Título')}
              <Input
                id={`link-label-${index}`}
                value={link.label}
                maxLength={60}
                required
                placeholder={t('Ex.: Instagram')}
                onChange={(event) =>
                  onChange({
                    ...profile,
                    links: links.map((item, i) =>
                      i === index
                        ? { ...item, label: event.target.value }
                        : item,
                    ),
                  })
                }
              />
            </label>
            <label htmlFor={`link-url-${index}`}>
              {t('Endereço')}
              <Input
                id={`link-url-${index}`}
                value={link.url}
                type="url"
                maxLength={300}
                required
                placeholder={t('https://…')}
                onChange={(event) =>
                  onChange({
                    ...profile,
                    links: links.map((item, i) =>
                      i === index ? { ...item, url: event.target.value } : item,
                    ),
                  })
                }
              />
            </label>
            <div className="link-edit-actions">
              <Button
                type="button"
                variant="ghost"
                disabled={disabled || index === 0}
                aria-label={t('Mover link {0} para cima', [index + 1])}
                onClick={() => move(index, -1)}
              >
                <ArrowUp size={17} />
              </Button>
              <Button
                type="button"
                variant="ghost"
                disabled={disabled || index === links.length - 1}
                aria-label={t('Mover link {0} para baixo', [index + 1])}
                onClick={() => move(index, 1)}
              >
                <ArrowDown size={17} />
              </Button>
              <Button
                type="button"
                variant="ghost"
                disabled={disabled}
                aria-label={t('Remover link {0}', [index + 1])}
                onClick={() =>
                  onChange({
                    ...profile,
                    links: links.filter((_, i) => i !== index),
                  })
                }
              >
                <Trash2 size={17} />
              </Button>
            </div>
          </fieldset>
        ))}
      </div>
      {links.length < plan.links ? (
        <Button
          type="button"
          className="add-link-box"
          variant="outline"
          disabled={disabled}
          onClick={() =>
            onChange({ ...profile, links: [...links, { label: '', url: '' }] })
          }
        >
          <Plus size={20} />
          {t(' Adicionar link')}{' '}
          <span>
            {plan.links - links.length}
            {t(' disponíveis')}
          </span>
        </Button>
      ) : (
        <Button
          type="button"
          className="add-link-box"
          variant="outline"
          disabled={disabled}
          onClick={onUpgrade}
        >
          <LockKeyhole size={18} />
          {plan.links === 50
            ? t('Todas as 50 caixas estão em uso')
            : t('Desbloquear mais caixas')}
        </Button>
      )}
      {plan.bio > 0 ? (
        <label className="link-bio" htmlFor="profile-bio">
          {t('Biografia')}{' '}
          <span>
            {profile.bio?.length ?? 0}/{plan.bio}
          </span>
          <textarea
            id="profile-bio"
            disabled={disabled}
            maxLength={plan.bio}
            value={profile.bio ?? ''}
            rows={4}
            placeholder={t(
              'Conte um pouco sobre si ou sobre a sua organização.',
            )}
            onChange={(event) =>
              onChange({ ...profile, bio: event.target.value })
            }
          />
        </label>
      ) : (
        <p className="link-bio-locked">
          <LockKeyhole size={16} />
          {t(' Biografia disponível a partir do plano Criador.')}
        </p>
      )}
    </section>
  );
}
