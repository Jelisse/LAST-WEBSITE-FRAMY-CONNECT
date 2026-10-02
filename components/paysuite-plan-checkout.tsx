'use client';
import { useI18n } from '@/components/language-provider';
import { useState } from 'react';
import { planAnnualMeticais, planPrice } from '@/lib/plan-pricing';
import { PaySuiteCheckout } from './paysuite-checkout';
export function PaySuitePlanCheckout({
  plan,
  trial,
}: {
  plan: {
    id: string;
    name: string;
    meticais: number;
    annualMeticais?: number;
    monthlyEnabled?: boolean;
    annualEnabled?: boolean;
    version: number;
  };
  trial: boolean;
}) {
  const { t } = useI18n();
  const [chosenCycle, setCycle] = useState(
    plan.monthlyEnabled === false ? 'annual' : 'monthly',
  );
  const cycle =
    plan.monthlyEnabled === false
      ? 'annual'
      : plan.annualEnabled === false
        ? 'monthly'
        : chosenCycle;
  const amount = cycle === 'annual' ? planAnnualMeticais(plan) : plan.meticais;
  return (
    <article>
      <h3>{plan.name}</h3>
      <label>
        {t(' Período de acesso ')}
        <select value={cycle} onChange={(e) => setCycle(e.target.value)}>
          {plan.monthlyEnabled !== false && (
            <option value="monthly">{t('Um mês')}</option>
          )}
          {plan.annualEnabled !== false && (
            <option value="annual">{t('Um ano')}</option>
          )}
        </select>
      </label>
      <p>
        <strong>
          {planPrice({ meticais: amount })} /{' '}
          {t(cycle === 'annual' ? 'ano' : 'mês')}
        </strong>
      </p>
      {trial && (
        <p>{t('O pagamento estará disponível após os 30 dias grátis.')}</p>
      )}
      <PaySuiteCheckout
        key={`${plan.id}-${cycle}-${amount}`}
        disabled={trial}
        payload={{
          kind: 'subscription',
          planId: plan.id,
          planVersion: plan.version,
          cycle,
          expectedAmount: Math.round(amount * 100),
        }}
      />
    </article>
  );
}
