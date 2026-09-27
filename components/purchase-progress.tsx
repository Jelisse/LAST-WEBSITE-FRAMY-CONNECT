'use client';

import { Check } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { useI18n } from './language-provider';

export function PurchaseProgress({ steps, step, disabled, onStep }: {
  steps: string[];
  step: number;
  disabled: boolean;
  onStep: (step: number) => void;
}) {
  const { t } = useI18n();
  const ref = useRef<HTMLElement>(null);
  const previous = useRef(step);
  useEffect(() => {
    const element = ref.current;
    const flow = element?.closest<HTMLElement>('.purchase-flow');
    if (!element || !flow) return;
    const measure = () => flow.style.setProperty('--purchase-progress-height', `${element.getBoundingClientRect().height}px`);
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    measure();
    return () => { observer.disconnect(); flow.style.removeProperty('--purchase-progress-height'); };
  }, []);
  useEffect(() => {
    if (previous.current === step) return;
    previous.current = step;
    const heading = document.getElementById('purchase-step-title');
    heading?.focus({ preventScroll: true });
    heading?.scrollIntoView({ block: 'start', behavior: 'instant' });
  }, [step]);
  return <nav ref={ref} className="purchase-progress" aria-label={t('Etapas da compra')}>
    <div className="purchase-progress-caption" aria-live="polite" aria-atomic="true">
      <span>{t('Passo {0} de {1}', [step + 1, steps.length])}</span>
      <strong>{t(steps[step])}</strong>
    </div>
    <ol className="purchase-steps">
      {steps.map((label, index) => <li key={label}
        className={index < step ? 'is-complete' : ''}
        aria-current={index === step ? 'step' : undefined}>
        <button type="button" disabled={disabled || index > step}
          aria-label={`${index + 1}. ${t(label)}${index < step ? ` — ${t('Concluído')}` : ''}`}
          onClick={() => onStep(index)}>
          <span className="purchase-step-circle" aria-hidden="true">
            {index < step ? <Check size={20} strokeWidth={2.5} /> : index + 1}
          </span>
          <span className="purchase-step-label">{t(label)}</span>
        </button>
      </li>)}
    </ol>
  </nav>;
}
