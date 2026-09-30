'use client';
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
    version: number;
  };
  trial: boolean;
}) {
  const [cycle, setCycle] = useState('monthly');
  const amount = cycle === 'annual' ? planAnnualMeticais(plan) : plan.meticais;
  return (
    <article>
      <h3>{plan.name}</h3>
      <label>
        Período de acesso
        <select value={cycle} onChange={(e) => setCycle(e.target.value)}>
          <option value="monthly">Um mês</option>
          <option value="annual">Um ano</option>
        </select>
      </label>
      <p>
        <strong>
          {planPrice({ meticais: amount })} /{' '}
          {cycle === 'annual' ? 'ano' : 'mês'}
        </strong>
      </p>
      {trial && <p>O pagamento estará disponível após os 30 dias grátis.</p>}
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
