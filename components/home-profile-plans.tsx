'use client';
import { useState } from 'react';
import { PlanFeatureIcon, BasePlanIcon } from './plan-feature-icon';
import { planFeatures, featureCatalog, type FeatureKey } from '@/lib/plan-features';
import Link from '@/components/hard-link';
import { ArrowUpRight, UserRound, BriefcaseBusiness, Building2, ChevronDown } from 'lucide-react';
import { useI18n } from './language-provider';
import { planPrice, planAnnualMeticais, planMeticais } from '@/lib/plan-pricing';
import type { ManagedPlan } from '@/lib/domain';

export function HomeProfilePlans({ plans, billingAvailable, annualAvailable = false }: {
  plans: ManagedPlan[]; billingAvailable: boolean; annualAvailable?: boolean;
}) {
  const { t } = useI18n();
  const [cycle, setCycle] = useState<'monthly' | 'annual'>('monthly');
  const individual = plans.filter(p => p.id !== 'free-30').sort((a,b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
  return <section data-cycle={cycle} className="home-plan-comparison" aria-label={t('Planos para o seu perfil digital')}>
    <fieldset className="home-plan-cycle" aria-label={t('Periodicidade')}>
      <button type="button" aria-pressed={cycle === 'monthly'} onClick={() => setCycle('monthly')}>{t('Mensal')}</button>
      <button type="button" aria-pressed={cycle === 'annual'} onClick={() => setCycle('annual')}>{t('Anual')}</button>
    </fieldset>
    <div className="home-solutions-grid home-profile-plans">
      {individual.map(plan => {
        const recommended = plan.id === 'professional-v2';
        const Icon = recommended ? BriefcaseBusiness : UserRound;
        const enabled = planFeatures(plan);
        const annual = cycle === 'annual' ? plan.annualEnabled !== false : plan.monthlyEnabled === false;
        const available = annual ? plan.annualEnabled !== false : plan.monthlyEnabled !== false;
        const yearly = planAnnualMeticais(plan), monthly = planMeticais(plan);
        const savings = Math.max(0, monthly * 12 - yearly);
        const basic = [
          `${t('Até ')}${plan.links}${t(' links à sua escolha')}`,
          plan.bio > 0 ? t('Biografia até {0} caracteres', [plan.bio]) : t('Contactos essenciais, sem biografia'),
          ...['Fotografia, nome e título no perfil','Email e telefone com controlo de visibilidade','Cores personalizadas e dois estilos de perfil','Links para redes sociais, website e portefólio','Partilha por link, NFC e código QR','Guardar contacto no telemóvel (vCard)','Actualizar os dados sem substituir o produto','Cartão e porta-chaves ligados ao mesmo perfil.'].map(f => t(f)),
          ...(plan.benefits ?? []),
        ];
        const advanced = (Object.keys(featureCatalog) as FeatureKey[]).filter(k => k !== 'domain' && enabled[k]);
        const highlights = plan.id === 'personal' ? [0,1,6,7] : [0,1];
        const toolHighlights = plan.id === 'personal' ? [] : advanced.filter(k => ['whatsapp','location','teams'].includes(k));
        return <article className={`home-solution home-profile-plan${recommended ? ' is-recommended' : ''}`} key={plan.id}>
          <div className="home-solution-label">{t(recommended ? 'Recomendado para profissionais' : 'Para o seu dia a dia')}</div>
          <div className="home-solution-copy">
            <div className="compact-plan-title"><Icon size={28} aria-hidden="true" /><h3>{t(plan.name)}</h3></div>
            <p className="home-plan-description">{t(plan.description)}</p>
            <div className="home-solution-price" aria-live="polite" aria-atomic="true">
              <strong>{available ? planPrice(annual ? {meticais:yearly} : plan, t.locale) : t('Sob consulta')}<small>{available && t(annual ? ' / ano' : ' / mês')}</small></strong>
              <span>{t('Por perfil')}{annual && available && ` · ${t('Total cobrado anualmente')}`}</span>
              {annual && available && savings > 0 && <span className="home-plan-savings">{t('Poupe {0} por ano', [planPrice({meticais:savings}, t.locale)])}{monthly > 0 && Math.abs(savings - monthly * 2) < 0.01 && <> · {t('Equivalente a 2 meses')}</>}</span>}
              <small>{!billingAvailable || (annual && !annualAvailable) ? t('Adesões em breve') : t('Sem renovação automática')}</small>
            </div>
            <Link className={recommended ? 'home-primary' : 'home-secondary'} href="/perfil?plans=1">{t(recommended ? 'Escolher Profissional' : plan.id === 'personal' ? 'Escolher Individual' : 'Explorar plano')}<ArrowUpRight size={18} aria-hidden="true" /></Link>
            <ul className="home-plan-inclusions home-plan-highlights">
              {highlights.map(i => <li key={i}><BasePlanIcon index={i}/><span>{basic[i]}</span></li>)}
              {toolHighlights.map(k => <li key={k}><PlanFeatureIcon feature={k}/><span>{t(featureCatalog[k])}</span></li>)}
            </ul>
            <details className="home-plan-details">
              <summary>{t('Ver todas as funcionalidades')}<ChevronDown size={16} aria-hidden="true" /></summary>
              <ul className="home-plan-inclusions">{basic.map((feature,index) => <li key={feature}><BasePlanIcon index={index}/><span>{feature}</span></li>)}</ul>
              {plan.id !== 'personal' && <><p className="home-plan-feature-heading">{t('Ferramentas profissionais')}</p><ul className="home-plan-inclusions home-plan-advanced">{advanced.map(k => <li key={k}><PlanFeatureIcon feature={k}/><span>{t(featureCatalog[k])}</span></li>)}</ul></>}
            </details>
          </div>
        </article>;
      })}
      <article className="home-solution home-profile-plan">
        <div className="home-solution-label">{t('Para empresas e equipas')}</div>
        <div className="home-solution-copy">
          <div className="compact-plan-title"><Building2 size={28} aria-hidden="true"/><h3>{t('Corporativo')}</h3></div>
          <p className="home-plan-description">{t('Perfis e ferramentas à medida da sua organização.')}</p>
          <div className="home-solution-price"><strong>{t('Sob consulta')}</strong><span>{t('Uma solução à medida da sua equipa')}</span></div>
          <Link className="home-secondary" href="/contacto">{t('Pedir proposta')}<ArrowUpRight size={18} aria-hidden="true"/></Link>
          <ul className="home-plan-inclusions home-plan-highlights">{['Número de perfis e limites definidos na proposta','Funcionalidades digitais acordadas na proposta','Cartões, porta-chaves e materiais a escolher','Design e apoio à configuração a combinar','Preço e condições de renovação sob consulta'].map((f,i) => <li key={f}><BasePlanIcon index={i} corporate/><span>{t(f)}</span></li>)}</ul>
        </div>
      </article>
    </div>
  </section>;
}
