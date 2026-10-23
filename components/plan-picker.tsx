'use client';
import { BasePlanIcon } from './plan-feature-icon';
import { useI18n } from '@/components/language-provider';

import { HomeProfilePlans } from './home-profile-plans';
import { planPrice } from '@/lib/plan-pricing';

import { useState } from 'react';
import { ArrowLeft, ArrowRight } from 'lucide-react';
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
                  {choice.id === 'personal'
                    ? t('Gratuito, sem prazo')
                    : t('Mensal · por perfil')}
                </small>
              </span>
              <strong>
                {planPrice(choice, t.locale)}
                <small>
                  {choice.id === 'personal' ? t('Gratuito') : t('/mês')}
                </small>
              </strong>
            </div>
            <ul className="plan-inclusions">
              <li>
                <BasePlanIcon index={0} />
                {choice.links}
                {t(' links com títulos personalizados')}
              </li>
              <li>
                <BasePlanIcon index={1} />
                {choice.bio
                  ? t('Biografia até {0} caracteres', [choice.bio])
                  : t('Nome e título de apresentação')}
              </li>
              <li>
                <BasePlanIcon index={3} />
                {t('Email, telefone e website com controlo de privacidade')}
              </li>
              <li>
                <BasePlanIcon index={0} />
                {t('Editar, ordenar e publicar os seus links')}
              </li>
              <li>
                <BasePlanIcon index={6} />
                {t('Partilha do perfil e guardar o contacto')}
              </li>
            </ul>
            <p className="plan-disclosure">
              {t(
                'O plano Individual é gratuito, sem prazo e sem renovação. Produtos NFC e entrega são pagos separadamente.',
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
              {busy ? t('A activar…') : t('Activar Individual gratuito')}{' '}
              <ArrowRight size={18} />
            </Button>
          </>
        ) : (
          <>
            <DialogTitle className="plans-title">
              {t('Um plano para cada conexão.')}
            </DialogTitle>
            <DialogDescription className="plans-intro">
              {t(
                'Compare os planos e escolha o período mensal ou anual disponível. A renovação exige a sua autorização.',
              )}
            </DialogDescription>
            <HomeProfilePlans
              plans={plans}
              billingAvailable={paidAvailable}
              annualAvailable={paidAvailable}
              current={current}
              busy={busy}
              onSelect={(id) =>
                id === 'personal' ? setSelected(id) : onSelect(id)
              }
            />
            <p className="plan-disclosure">
              {t(
                'Personal e Professional incluem um perfil. Business e Enterprise são propostas por colaborador. Produtos físicos são pagos separadamente.',
              )}
            </p>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
