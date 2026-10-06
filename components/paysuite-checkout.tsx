'use client';
import { useI18n } from '@/components/language-provider';
import Link from '@/components/hard-link';
import { useRef, useState } from 'react';
import { checkoutURL } from '@/lib/paysuite';

export function PaySuiteCheckout({
  payload,
  disabled = false,
  compact = false,
}: {
  payload: Record<string, unknown>;
  disabled?: boolean;
  compact?: boolean;
}) {
  const { t } = useI18n();
  const [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  const [method, setMethod] = useState('mpesa');
  const [accepted, setAccepted] = useState(false);
  const requestId = useRef<string | null>(null);
  const inFlight = useRef(false);
  async function pay(event: { preventDefault(): void }) {
    event.preventDefault();
    if (inFlight.current || disabled) return;
    inFlight.current = true;
    setBusy(true);
    setError('');
    // PaySuite only accepts letters and numbers in the reference.
    requestId.current ??= crypto.randomUUID().replaceAll('-', '');
    try {
      const response = await fetch('/api/paysuite/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...payload,
          method,
          accepted,
          requestId: requestId.current,
        }),
      });
      const data = (await response.json()) as {
        error?: string;
        paymentId: string;
        status?: string;
        url?: string | null;
      };
      if (response.status === 401) {
        location.assign(
          '/entrar?return_to=' +
            encodeURIComponent(location.pathname + location.search),
        );
        return;
      }
      if (!response.ok) {
        requestId.current = null;
        throw Error(data.error || 'Não foi possível iniciar o pagamento.');
      }
      if (data.status === 'pending' && data.url) {
        location.assign(checkoutURL(data.url));
        return;
      }
      // Uncertain creation remains attached to the same reference; never create a replacement automatically.
      location.assign(
        '/checkout/retorno?payment=' + encodeURIComponent(data.paymentId),
      );
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : 'Ligação interrompida. Tente novamente para consultar o mesmo pedido.',
      );
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }
  return (
    <form onSubmit={pay} className="paysuite-checkout">
      <label>
        {t(' Método de pagamento ')}
        <select
          value={method}
          onChange={(e) => setMethod(e.target.value)}
          disabled={busy || disabled}
        >
          <option value="mpesa">{t('M-Pesa')}</option>
          <option value="emola">{t('e-Mola')}</option>
          <option value="credit_card">{t('Visa / Mastercard')}</option>
        </select>
      </label>
      <p>
        {t(
          compact ? 'Pagamento seguro na PaySuite. Não guardamos PINs nem dados do cartão.' : ' O pagamento é concluído na página segura da PaySuite. Não guardamos dados do cartão nem PINs. ',
        )}
      </p>
      <label className="growth-check">
        <input
          type="checkbox"
          checked={accepted}
          onChange={(e) => setAccepted(e.target.checked)}
          required
          disabled={busy || disabled}
        />
        {t(
          compact ? 'Confirmo o total. Sem débitos automáticos.' : ' Confirmo o total apresentado. Este pagamento não autoriza débitos automáticos. ',
        )}
      </label>
      {error && <p role="alert">{t(error)}</p>}
      <button
        className="btn btn-primary"
        disabled={busy || disabled || !accepted}
      >
        {t(busy ? 'A preparar pagamento…' : compact ? 'Pagar' : 'Continuar para pagamento')}
      </button>
      <p>
        <Link href="/checkout/retorno">
          {t('Consultar os meus pagamentos')}
        </Link>
      </p>
    </form>
  );
}
