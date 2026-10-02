import { PlanFeatureIcon, BasePlanIcon } from './plan-feature-icon';
import {
  planFeatures,
  featureCatalog,
  type FeatureKey,
} from '@/lib/plan-features';
import Link from '@/components/hard-link';
import {
  ArrowUpRight,
  UserRound,
  BriefcaseBusiness,
  Building2,
} from 'lucide-react';
import { getTranslations } from '@/lib/server-i18n';
import { planPrice, planAnnualMeticais } from '@/lib/plan-pricing';
import type { ManagedPlan } from '@/lib/domain';

export async function HomeProfilePlans({
  plans,
  billingAvailable,
  annualAvailable = false,
}: {
  plans: ManagedPlan[];
  billingAvailable: boolean;
  annualAvailable?: boolean;
}) {
  const t = await getTranslations();
  const individual = plans
    .filter((p) => p.id !== 'free-30')
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
  return (
    <div className="home-solutions-grid home-profile-plans">
      {individual.map((plan) => {
        const recommended = plan.id === 'professional-v2';
        const Icon = recommended ? BriefcaseBusiness : UserRound;
        const enabledFeatures = planFeatures(plan);
        const features = [
          `${t('Até ')}${plan.links}${t(' links à sua escolha')}`,
          plan.bio > 0
            ? t('Biografia até {0} caracteres', [plan.bio])
            : t('Contactos essenciais, sem biografia'),
          ...[
            'Fotografia, nome e título no perfil',
            'Email e telefone com controlo de visibilidade',
            'Cores personalizadas e dois estilos de perfil',
            'Links para redes sociais, website e portefólio',
            'Partilha por link, NFC e código QR',
            'Guardar contacto no telemóvel (vCard)',
            'Actualizar os dados sem substituir o produto',
            'Cartão e porta-chaves ligados ao mesmo perfil.',
          ].map((feature) => t(feature)),
          ...(plan.benefits ?? []),
        ];
        const advanced = (Object.keys(featureCatalog) as FeatureKey[]).filter(
          (k) => k !== 'domain',
        );
        return (
          <article
            className={`home-solution home-profile-plan${recommended ? ' is-recommended' : ''}`}
            key={plan.id}
          >
            <div className="home-solution-label">
              {t(
                recommended
                  ? 'Recomendado para profissionais'
                  : 'Para o seu dia a dia',
              )}
            </div>
            <div className="home-plan-visual" aria-hidden="true">
              <span>
                <Icon size={48} strokeWidth={1.3} />
              </span>
            </div>
            <div className="home-solution-copy">
              <h3>{t(plan.name)}</h3>
              <p className="home-plan-description">{t(plan.description)}</p>
              <div className="home-solution-price">
                {plan.monthlyEnabled !== false && (
                  <strong>
                    {planPrice(plan, t.locale)}
                    <small>{t(' / mês')}</small>
                  </strong>
                )}
                {plan.annualEnabled !== false && (
                  <div className="home-plan-annual">
                    {planPrice(
                      { meticais: planAnnualMeticais(plan) },
                      t.locale,
                    )}
                    {t(' / ano')}
                    <small>
                      {annualAvailable
                        ? 'Pagamento anual · sem renovação automática'
                        : t('Pagamento anual · adesões em breve')}
                    </small>
                  </div>
                )}
                <span>
                  {t('Por perfil')}
                  {!billingAvailable && ` · ${t('Adesões em breve')}`}
                </span>
              </div>
              <ul className="home-plan-inclusions">
                {features.map((feature, index) => (
                  <li key={feature}>
                    <BasePlanIcon index={index} />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
              {plan.id !== 'personal' && <>
              <p className="home-plan-feature-heading">
                {t('Ferramentas profissionais')}
              </p>
              <ul className="home-plan-inclusions home-plan-advanced">
                {advanced.map((feature) => (
                  <li
                    key={feature}
                    className={enabledFeatures[feature] ? '' : 'is-unavailable'}
                  >
                    <PlanFeatureIcon feature={feature} />
                    <span>
                      {t(featureCatalog[feature])}
                      {!enabledFeatures[feature] && (
                        <small>{t('Não incluído')}</small>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
              </>}
              <Link
                className={recommended ? 'home-primary' : 'home-secondary'}
                href="/perfil?plans=1"
              >
                {t('Explorar plano')}
                <ArrowUpRight size={18} aria-hidden="true" />
              </Link>
            </div>
          </article>
        );
      })}
      <article className="home-solution home-profile-plan">
        <div className="home-solution-label">
          {t('Para empresas e equipas')}
        </div>
        <div className="home-plan-visual" aria-hidden="true">
          <span>
            <Building2 size={48} strokeWidth={1.3} />
          </span>
        </div>
        <div className="home-solution-copy">
          <h3>{t('Corporativo')}</h3>
          <p className="home-plan-description">
            {t(
              'Para instituições e organizações: apresente contactos, serviços e recursos, com uma proposta adequada às suas necessidades.',
            )}
          </p>
          <div className="home-solution-price">
            <strong>{t('Sob consulta')}</strong>
            <span>{t('Uma solução à medida da sua equipa')}</span>
          </div>
          <ul className="home-plan-inclusions">
            {[
              'Número de perfis e limites definidos na proposta',
              'Funcionalidades digitais acordadas na proposta',
              'Cartões, porta-chaves e materiais a escolher',
              'Design e apoio à configuração a combinar',
              'Preço e condições de renovação sob consulta',
            ].map((feature, index) => (
              <li key={feature}>
                <BasePlanIcon index={index} corporate />
                <span>{t(feature)}</span>
              </li>
            ))}
          </ul>
          <Link className="home-secondary" href="/contacto">
            {t('Solicitar proposta')}
            <ArrowUpRight size={18} aria-hidden="true" />
          </Link>
        </div>
      </article>
    </div>
  );
}
