'use client';
import { isFirstProfile } from '@/lib/form-journeys';
import { FirstProfileWelcome } from './first-profile-welcome';
import Image from 'next/image';
import { useI18n } from '@/components/language-provider';

import { workspacePlan } from '@/lib/workspace-plan';
import { planPrice } from '@/lib/plan-pricing';

import type { CustomerOrder as SandboxOrder } from '@/lib/customer-order';
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  Link2,
  Plus,
  UserRound,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { featureCatalog } from '@/lib/plan-features';
import { Progress } from '@/components/ui/progress';
import { ProfileIdentityCounters } from './customer-analytics';
import { orderLabels } from '@/lib/domain';
import type { WorkspaceData } from '@/lib/profile-types';

export function CustomerOverview({
  data,
  displayName,
  onNavigate,
  onInspect,
  onUpgrade,
  onPlanDetails,
}: {
  data: WorkspaceData;
  displayName: string;
  onNavigate: (tab: string) => void;
  onInspect: (order: SandboxOrder) => void;
  onUpgrade: () => void;
  onPlanDetails: () => void;
}) {
  const { t } = useI18n();
  const plan = data.membership.terms;
  const planView = workspacePlan(data.membership);
  const includedFeatures = planView.features;
  const profile = data.profile;
  const links = profile?.links ?? [];
  const name = profile?.name || displayName;
  const initials =
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0])
      .join('')
      .toUpperCase() || 'FC';
  if (isFirstProfile(data.profileVersion, data.published))
    return (
      <FirstProfileWelcome
        name={displayName}
        onStart={() => onNavigate('profile')}
      />
    );
  const recent = [...data.orders]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 2);
  return (
    <div className="essential-dashboard">
      {!data.published && (
        <section className="setup-resume-card">
          <div>
            <span className="essential-kicker">
              {t('CONTINUE A SUA APRESENTAÇÃO')}
            </span>
            <h2>{t('Do rascunho ao primeiro contacto.')}</h2>
            <p>
              {t(
                'Siga o guia, confirme os dados públicos e publique quando estiver pronto. Não precisa de comprar um produto para começar.',
              )}
            </p>
          </div>
          <Button onClick={() => onNavigate('profile')}>
            {t('Continuar configuração')}
            <ArrowRight size={17} />
          </Button>
        </section>
      )}

      <div className="essential-top-grid">
        <div className="essential-primary-column">
          <section
            className="essential-identity"
            aria-labelledby="identity-title"
          >
            <span className="essential-kicker">{t('A SUA IDENTIDADE')}</span>
            <div className="essential-person">
              <span className="essential-avatar">
                {profile?.photoUrl ? (
                  <Image
                    src={profile.photoUrl}
                    width={80}
                    height={80}
                    unoptimized
                    alt=""
                  />
                ) : (
                  initials
                )}
              </span>
              <div>
                <h2 id="identity-title">{name}</h2>
                <p>{profile?.title || t('Comece por se apresentar.')}</p>
              </div>
            </div>
            <p className="essential-handle">
              {profile
                ? `/${profile.username}`
                : t('O seu endereço Framy começa aqui.')}
              <span>{data.published ? t('Publicada') : t('Rascunho')}</span>
            </p>
            <ProfileIdentityCounters />
            <div className="essential-actions">
              <Button
                className="essential-dark-button"
                onClick={() => onNavigate('profile')}
              >
                {profile ? t('Editar perfil') : t('Criar perfil')}{' '}
                <ArrowRight size={17} />
              </Button>
              {data.published && data.publishedUsername && (
                <a
                  href={`/${data.publishedUsername}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  {t('Ver perfil ')}
                  <ArrowUpRight size={16} />
                </a>
              )}
            </div>
          </section>
          <section
            className="essential-links"
            aria-labelledby="saved-links-title"
          >
            <div className="essential-section-heading">
              <div>
                <h2 id="saved-links-title">{t('Os seus links.')}</h2>
                <p>{t('Um lugar para tudo o que importa.')}</p>
              </div>
              <Button variant="ghost" onClick={() => onNavigate('profile')}>
                {t('Gerir links ')}
                <ArrowRight size={17} />
              </Button>
            </div>
            <div className="essential-link-grid">
              {links.slice(0, 5).map((link, index) => (
                <button
                  className="essential-link-box"
                  key={index}
                  onClick={() => onNavigate('profile')}
                >
                  <Link2 size={22} />
                  <strong>{link.label}</strong>
                  <span>{new URL(link.url).hostname}</span>
                  <ArrowUpRight className="essential-link-arrow" size={17} />
                </button>
              ))}
              {links.length < plan.links && (
                <button
                  className="essential-link-box essential-add-link"
                  onClick={() => onNavigate('profile')}
                >
                  <Plus size={24} />
                  <strong>{t('Adicionar link')}</strong>
                  <span>
                    {Math.max(0, plan.links - links.length)}
                    {t(' caixas disponíveis')}
                  </span>
                </button>
              )}
              {!links.length && (
                <div className="essential-link-tip">
                  <UserRound size={21} />
                  <p>
                    {t(
                      'As suas redes, o seu trabalho, os seus contactos. Adicione um link para começar.',
                    )}
                  </p>
                </div>
              )}
            </div>
            {links.length > 5 && (
              <button
                className="plan-text-button"
                onClick={() => onNavigate('profile')}
              >
                {t('Ver todos os ')}
                {links.length}
                {t(' links ')}
                <ArrowRight size={16} />
              </button>
            )}
          </section>
        </div>
        <section
          className="essential-plan"
          aria-labelledby="current-plan-title"
        >
          <div className="essential-plan-heading">
            <span className="essential-kicker">{t('O SEU PLANO ACTUAL')}</span>
            <span className="essential-test-badge">
              {data.membership.active
                ? t('Activo')
                : t('Por activar / expirado')}
            </span>
          </div>
          <h2 id="current-plan-title">{t(planView.name)}</h2>
          <p className="essential-price">
            {plan.id === 'personal' ? t('Gratuito') : planPrice(plan, t.locale)}
            <span>
              {plan.id === 'personal'
                ? t(' · sem prazo')
                : t(' / mês · por perfil')}
            </span>
          </p>
          <div className="essential-usage">
            <span>
              {links.length}
              {t(' de ')}
              {plan.links}
              {t(' links')}
            </span>
            <span>
              {Math.max(0, plan.links - links.length)}
              {t(' disponíveis')}
            </span>
          </div>
          <Progress
            value={
              plan.links > 0
                ? Math.min(100, (links.length / plan.links) * 100)
                : 0
            }
            aria-label={t('{0} de {1} links utilizados', [
              links.length,
              plan.links,
            ])}
          />
          <ul
            className="essential-plan-benefits"
            aria-label={t('Incluído no seu plano')}
          >
            <li>
              <Check size={16} aria-hidden="true" />
              {t('Perfil digital partilhável por link e QR code')}
            </li>
            <li>
              <Check size={16} aria-hidden="true" />
              {t('Até {0} links no seu perfil', [plan.links])}
            </li>
            {plan.bio > 0 && (
              <li>
                <Check size={16} aria-hidden="true" />
                {t('Biografia até {0} caracteres', [plan.bio])}
              </li>
            )}
            {Object.entries(featureCatalog)
              .filter(
                ([key]) =>
                  includedFeatures[key as keyof typeof includedFeatures],
              )
              .slice(0, 3)
              .map(([key, label]) => (
                <li key={key}>
                  <Check size={16} aria-hidden="true" />
                  {t(label)}
                </li>
              ))}
          </ul>
          {plan.id !== 'personal' && (
            <p className="essential-plan-note">
              {data.membership.launchExtended
                ? t('Acesso prolongado durante o lançamento')
                : data.membership.expiresAt
                  ? t('Período gratuito até {0}. Sem renovação automática.', [
                      new Date(data.membership.expiresAt).toLocaleDateString(
                        t.locale,
                        { timeZone: 'Africa/Maputo' },
                      ),
                    ])
                  : t('Active o período gratuito para publicar o perfil.')}
            </p>
          )}
          <button
            type="button"
            className="plan-text-button current-plan-details"
            onClick={onPlanDetails}
          >
            {t('Ver detalhes do plano')} <ArrowRight size={16} />
          </button>
          {planView.personal && (
            <div className="essential-plan-recommendation">
              <p>
                {t(
                  'Descubra mais opções para apresentar o seu trabalho com o Profissional.',
                )}
              </p>
              <button
                type="button"
                className="plan-text-button"
                onClick={onUpgrade}
              >
                {t('Explorar Profissional')} <ArrowRight size={16} />
              </button>
            </div>
          )}
        </section>
      </div>
      {recent.length > 0 && (
        <section className="essential-order-section">
          <div className="essential-section-heading">
            <h2>{t('Pedidos recentes.')}</h2>
            <Button variant="ghost" onClick={() => onNavigate('orders')}>
              {t('Ver todos ')}
              <ArrowRight size={17} />
            </Button>
          </div>
          {recent.map((order) => (
            <button
              className="essential-order-row"
              key={order.id}
              onClick={() => onInspect(order)}
            >
              <span>
                <strong>{t(order.productName)}</strong>
                <small>#{order.id.slice(0, 8).toUpperCase()}</small>
              </span>
              <span>{t(orderLabels[order.status])}</span>
              <ArrowUpRight size={17} />
            </button>
          ))}
        </section>
      )}
    </div>
  );
}
