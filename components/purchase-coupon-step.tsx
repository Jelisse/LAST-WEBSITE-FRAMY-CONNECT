'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Check, TicketPercent } from 'lucide-react';
import { useI18n } from './language-provider';
import { purchaseMoney } from '@/lib/purchase-journey';
import { validatePurchaseCoupon } from '@/lib/purchase-coupon';
export function PurchaseCouponStep({
  initialCode,
  appliedCode,
  savings,
  quotation,
  onChange,
  onContinue,
  onSkip,
  onBack,
}: {
  initialCode: string;
  appliedCode: string;
  savings: number;
  quotation: boolean;
  onChange: (code: string, ready: boolean) => void;
  onContinue: () => void;
  onSkip: () => void;
  onBack: () => void;
}) {
  const { t } = useI18n();
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const revision = useRef(0);
  const controller = useRef<AbortController | null>(null);
  const field = useRef<HTMLInputElement>(null);
  const cancel = useCallback(() => {
    revision.current++;
    controller.current?.abort();
  }, []);
  const apply = useCallback(
    async (value: string) => {
      const current = ++revision.current;
      controller.current?.abort();
      const request = new AbortController();
      controller.current = request;
      setError('');
      setBusy(true);
      onChange('', false);
      try {
        const code = await validatePurchaseCoupon(
          value,
          fetch,
          AbortSignal.any([request.signal, AbortSignal.timeout(12000)]),
        );
        if (current !== revision.current) return;
        setInput(code);
        onChange(code, true);
      } catch (e) {
        if (current !== revision.current) return;
        onChange('', true);
        setError(
          e instanceof Error && e.message === 'empty'
            ? 'Introduz o código do teu cupão.'
            : e instanceof Error && e.message === 'invalid'
              ? 'Não conseguimos validar este cupão. Confirma o código ou continua sem cupão.'
              : e instanceof Error && e.message === 'limit'
                ? 'Aguarda um momento antes de tentar novamente. Podes continuar sem cupão.'
                : 'Não foi possível verificar o cupão. Tenta novamente ou continua sem cupão.',
        );
      } finally {
        if (current === revision.current) setBusy(false);
      }
    },
    [onChange],
  );
  useEffect(() => {
    let active = true;
    queueMicrotask(() => {
      if (active && initialCode) {
        setInput(initialCode);
        void apply(initialCode);
      }
    });
    return () => {
      active = false;
      cancel();
    };
  }, [initialCode, apply, cancel]);
  function clear() {
    cancel();
    setInput('');
    setError('');
    setBusy(false);
    onChange('', true);
  }
  return (
    <div className="purchase-coupon-content">
      <span className="purchase-coupon-icon">
        <TicketPercent size={26} aria-hidden="true" />
      </span>
      <h2>{t('Tens um cupão?')}</h2>
      <p>{t('Introduz o código do teu cupão e recebe o teu desconto.')}</p>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void apply(input);
        }}
      >
        <label htmlFor="purchase-coupon-code">{t('Código do cupão')}</label>
        <div className="purchase-coupon-field">
          <input
            ref={field}
            id="purchase-coupon-code"
            value={input}
            maxLength={100}
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            placeholder={t('Introduz o teu código')}
            aria-invalid={!!error}
            aria-describedby={
              error
                ? 'purchase-coupon-error purchase-coupon-note'
                : 'purchase-coupon-note'
            }
            onChange={(e) => {
              cancel();
              setBusy(false);
              setError('');
              setInput(e.target.value);
              onChange('', true);
            }}
          />
          <button type="submit" className="btn btn-primary" disabled={busy}>
            {t(busy ? 'A verificar o cupão…' : 'Aplicar cupão')}
          </button>
        </div>
        <small id="purchase-coupon-note">
          {t('Não inclui design nem entrega.')}
        </small>
        {error && (
          <p
            id="purchase-coupon-error"
            className="flow-inline-error"
            role="alert"
          >
            {t(error)}
          </p>
        )}
        {busy && (
          <output aria-live="polite">{t('A verificar o cupão…')}</output>
        )}
      </form>
      {appliedCode && !busy && (
        <output className="purchase-coupon-success" aria-live="polite">
          <Check size={22} aria-hidden="true" />
          <span className="purchase-coupon-message">
            <strong>
              {t(
                quotation
                  ? 'Cupão guardado para verificação.'
                  : 'Cupão aplicado!',
              )}
            </strong>
            <span className="purchase-coupon-saving">
              {quotation
                ? t(
                    'A equipa confirmará a elegibilidade e o desconto na tua cotação.',
                  )
                : t('Vais poupar {0}.', [purchaseMoney(savings, t.locale)])}
            </span>
            <small>{appliedCode}</small>
          </span>
        </output>
      )}
      {appliedCode && (
        <div className="purchase-coupon-edit">
          <button
            type="button"
            className="purchase-secondary-link"
            onClick={() => {
              field.current?.focus();
              field.current?.select();
            }}
          >
            {t('Alterar cupão')}
          </button>
          <button
            type="button"
            className="purchase-secondary-link"
            onClick={clear}
          >
            {t('Remover cupão')}
          </button>
        </div>
      )}
      <div className="purchase-step-actions">
        <button
          type="button"
          className="purchase-secondary-link"
          onClick={onBack}
        >
          {t('Voltar aos dados')}
        </button>
        {appliedCode && !busy && (
          <button
            type="button"
            className="btn btn-primary"
            onClick={onContinue}
          >
            {t(quotation ? 'Continuar com cupão' : 'Continuar com desconto')} →
          </button>
        )}
        <button
          type="button"
          className={
            appliedCode ? 'purchase-secondary-link' : 'btn btn-primary'
          }
          onClick={() => {
            clear();
            onSkip();
          }}
        >
          {t(
            appliedCode ? 'Continuar sem cupão' : 'Não tenho cupão — continuar',
          )}{' '}
          →
        </button>
      </div>
    </div>
  );
}
