'use client';
import { useI18n } from './language-provider';
import { purchaseStages } from '@/lib/purchase-journey';
export function PurchaseStageProgress({
  step,
  onBackTo,
}: {
  step: number;
  onBackTo: (step: number) => void;
}) {
  const { t } = useI18n();
  return (
    <header className="purchase-stage-progress">
      <p className="purchase-step-count">
        {t('Etapa {0} de {1}', [String(step + 1), '4'])}
      </p>
      <h1 id="purchase-stage-title" tabIndex={-1}>
        {t(purchaseStages[step])}
      </h1>
      <ol aria-label={t('Etapas da compra')}>
        {purchaseStages.map((label, index) => (
          <li key={label}>
            <button
              type="button"
              aria-current={index === step ? 'step' : undefined}
              aria-label={
                t('Etapa {0} de {1}', [String(index + 1), '4']) +
                ': ' +
                t(label) +
                (index < step ? ' · ' + t('Concluído') : '')
              }
              disabled={index >= step}
              onClick={() => onBackTo(index)}
              data-state={
                index < step
                  ? 'complete'
                  : index === step
                    ? 'current'
                    : 'upcoming'
              }
            >
              <span aria-hidden="true" />
            </button>
          </li>
        ))}
      </ol>
    </header>
  );
}
