'use client';
import { useI18n } from '@/components/language-provider';

import { planPrice } from '@/lib/plan-pricing';

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
  current,
  busy,
  error,
  onClose,
  onSelect,
}: {
  plans: ManagedPlan[];
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
              {t(' caixas de links.')}
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
                'O período gratuito dura 30 dias e não renova automaticamente. Produtos NFC e entrega são pagos separadamente. Os planos mensais ainda não estão disponíveis.',
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
                'Comece com 30 dias grátis. Os restantes planos estão em breve disponíveis.',
              )}
            </DialogDescription>
            <div className="plans-grid">
              {plans.map((plan) => (
                <article
                  className={`plan-card ${plan.id === 'professional' ? 'plan-featured' : ''}`}
                  key={plan.id}
                >
                  <span className="plan-recommendation">
                    {plan.id === current
                      ? t('O seu plano')
                      : plan.id === 'professional'
                        ? t('A nossa sugestão')
                        : plan.audience}
                  </span>
                  <h3>{t(plan.name)}</h3>
                  <p>{t(plan.description)}</p>
                  <div className="plan-price">
                    <strong>{planPrice(plan, t.locale)}</strong>
                    <span>
                      {plan.id === 'free-30' ? t('/ 30 dias') : t('/mês')}
                    </span>
                  </div>
                  <p className="plan-per-profile">
                    {plan.id === 'free-30'
                      ? t('Sem renovação automática')
                      : t('Por perfil · mensal')}
                  </p>
                  <Button
                    className={
                      plan.id === 'professional'
                        ? 'plan-upgrade'
                        : 'plan-select'
                    }
                    variant="outline"
                    disabled={
                      plan.id !== 'free-30' || plan.id === current || busy
                    }
                    onClick={() => setSelected(plan.id)}
                  >
                    {plan.id === current
                      ? t('Plano actual')
                      : plan.id === 'free-30'
                        ? t('Começar 30 dias grátis')
                        : t('Em breve')}
                    {plan.id !== current && <ArrowRight size={16} />}
                  </Button>
                  <ul>
                    <li>
                      <Check />{' '}
                      <strong>
                        {plan.links}
                        {t(' caixas de links')}
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
                  </ul>
                </article>
              ))}
            </div>
            <p className="plan-disclosure">
              {t(
                'Todos incluem uma identidade digital, links editáveis e opção de guardar o contacto. Instituições e organizações: preço por perfil, sem gestão de equipas. Subscrições mensais ainda não disponíveis.',
              )}
            </p>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
