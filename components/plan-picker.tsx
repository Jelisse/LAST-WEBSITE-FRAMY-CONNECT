'use client';
import { planFeatures, featureCatalog, type FeatureKey } from '@/lib/plan-features';
import { useI18n } from '@/components/language-provider';

import { CorporatePlan } from './corporate-plan';
import { planPrice, planAnnualMeticais } from '@/lib/plan-pricing';

import { useState } from 'react';
import { ArrowLeft, ArrowRight, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { type ManagedPlan, type PlanId } from '@/lib/domain';

export function PlanPicker({
  plans,
  paidAvailable = false,
  current,
  busy,
  error,
  onClose,
  onSelect,
}: {
  plans: ManagedPlan[];
  paidAvailable?: boolean;
  current: PlanId;
  busy: boolean;
  error: string;
  onClose: () => void;
  onSelect: (id: PlanId) => void;
}) {
  const { t } = useI18n();
  const [selected, setSelected] = useState<PlanId | null>(null);
  const choice = plans.find((plan) => plan.id === selected);
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !busy) onClose();
      }}
    >
      <DialogContent
        className={`plans-dialog ${choice ? 'plans-confirm' : ''}`}
        showCloseButton={!busy}
      >
        {choice ? (
          <>
            <Button
              variant="ghost"
              className="plans-back"
              disabled={busy}
              onClick={() => setSelected(null)}
            >
              <ArrowLeft size={17} />
              {t(' Todos os planos')}
            </Button>
            <DialogTitle className="plans-title">
              {t('Mais espaço. Plano ')}
              {t(choice.name)}.
            </DialogTitle>
            <DialogDescription>
              {t('Uma identidade digital, com ')}
              {choice.links}
              {t(' links à sua escolha.')}
            </DialogDescription>
            <div className="plan-summary">
              <span>
                {t(choice.name)}
                <small>
                  {choice.id === 'free-30'
                    ? t('30 dias · sem renovação automática')
                    : t('Mensal · por perfil')}
                </small>
              </span>
              <strong>
                {planPrice(choice, t.locale)}
                <small>
                  {choice.id === 'free-30' ? t('/ 30 dias') : t('/mês')}
                </small>
              </strong>
            </div>
            <ul className="plan-inclusions">
              <li>
                <Check />
                {choice.links}
                {t(' links com títulos personalizados')}
              </li>
              <li>
                <Check />
                {choice.bio
                  ? t('Biografia até {0} caracteres', [choice.bio])
                  : t('Nome e título de apresentação')}
              </li>
              <li>
                <Check />
                {t('Email, telefone e website com controlo de privacidade')}
              </li>
              <li>
                <Check />
                {t('Editar, ordenar e publicar os seus links')}
              </li>
              <li>
                <Check />
                {t('Partilha do perfil e guardar o contacto')}
              </li>
            </ul>
            <p className="plan-disclosure">
              {t(
                'O período gratuito dura 30 dias e não renova automaticamente. Produtos NFC e entrega são pagos separadamente.',
              )}
            </p>
            {error && (
              <p role="alert" className="plan-error">
                {t(error)}
              </p>
            )}
            <Button
              className="plan-upgrade"
              disabled={busy}
              onClick={() => onSelect(choice.id)}
            >
              {busy ? t('A activar…') : t('Activar 30 dias gratuitos')}{' '}
              <ArrowRight size={18} />
            </Button>
          </>
        ) : (
          <>
            <span className="plans-kicker">{t('FRAMY CONNECT')}</span>
            <DialogTitle className="plans-title">
              {t('Um plano para cada conexão.')}
            </DialogTitle>
            <DialogDescription className="plans-intro">
              {t(
                'Compare os planos e escolha o período mensal ou anual disponível. A renovação exige a sua autorização.',
              )}
            </DialogDescription>
            <div className="plans-grid">
              {plans.map((plan) => (
                <article
                  className={`plan-card ${plan.id === 'free-30' ? 'plan-trial-banner' : ''} ${plan.id === 'professional-v2' ? 'plan-featured' : ''}`}
                  key={plan.id}
                >
                  <span className="plan-recommendation">
                    {plan.id === current
                      ? t('O seu plano')
                      : plan.id === 'professional-v2'
                        ? t('A nossa sugestão')
                        : plan.audience}
                  </span>
                  <h3>{t(plan.name)}</h3>
                  <p>{t(plan.description)}</p>
                  <div className="plan-price">
                    <strong>{planPrice(plan.monthlyEnabled === false ? {meticais:planAnnualMeticais(plan)} : plan, t.locale)}</strong>
                    <span>
                      {plan.id === 'free-30' ? t('/ 30 dias') : plan.monthlyEnabled === false ? t(' / ano') : t('/mês')}
                    </span>
                  </div>
                  <p className="plan-per-profile">
                    {plan.id !== 'free-30' && plan.annualEnabled !== false && plan.monthlyEnabled !== false && <>{planPrice({ meticais: planAnnualMeticais(plan) }, t.locale)}{t(' / ano')} · {t('Sem renovação automática')}<br /></>}
                    {plan.id === 'free-30'
                      ? t('Sem renovação automática')
                      : t('Por perfil')}
                  </p>
                  <Button
                    className={
                      plan.id === 'professional-v2'
                        ? 'plan-upgrade'
                        : 'plan-select'
                    }
                    variant="outline"
                    disabled={
                      (!paidAvailable && plan.id !== 'free-30') ||
                      plan.id === current ||
                      busy
                    }
                    onClick={() =>
                      plan.id === 'free-30'
                        ? setSelected(plan.id)
                        : onSelect(plan.id)
                    }
                  >
                    {plan.id === current
                      ? t('Plano actual')
                      : plan.id === 'free-30'
                        ? t('Começar 30 dias grátis')
                        : paidAvailable
                          ? 'Ver opções de pagamento'
                          : t('Em breve')}
                    {plan.id !== current && <ArrowRight size={16} />}
                  </Button>
                  <ul>
                    <li>
                      <Check />{' '}
                      <strong>
                        {plan.links}
                        {t(' links à sua escolha')}
                      </strong>
                    </li>
                    <li>
                      <Check />
                      {plan.bio
                        ? t('Bio: {0} caracteres', [plan.bio])
                        : t('Nome e título')}
                    </li>
                    <li>
                      <Check />
                      {t('Contactos e privacidade')}
                    </li>
                    <li>
                      <Check />
                      {t('Partilha de perfil')}
                    </li>
                    {(Object.keys(featureCatalog) as FeatureKey[]).filter(k=>planFeatures(plan)[k]).map(k=><li key={k}><Check/>{t(featureCatalog[k])}</li>)}
                    {(plan.benefits??[]).map(b=><li key={b}><Check/>{b}</li>)}
                  </ul>
                </article>
              ))}
              <CorporatePlan />
            </div>
            <p className="plan-disclosure">
              {t(
                'Cada plano inclui um perfil digital. Produtos físicos são pagos separadamente. Corporativo: condições sob consulta.',
              )}
            </p>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
