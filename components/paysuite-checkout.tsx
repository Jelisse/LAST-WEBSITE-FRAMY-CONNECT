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
  const signature = JSON.stringify(payload);
  const [acceptedFor, setAcceptedFor] = useState('');
  const accepted = acceptedFor === signature;
  const requestSignature = useRef('');
  const requestId = useRef<string | null>(null);
  const inFlight = useRef(false);
  async function pay(event: { preventDefault(): void }) {
    event.preventDefault();
    if (inFlight.current || disabled) return;
    if (requestId.current && requestSignature.current !== signature) { setError('Já existe uma tentativa com outras condições. Consulte os seus pagamentos antes de criar outro pedido.'); return; }
    inFlight.current = true;
    setBusy(true);
    setError('');
    // PaySuite only accepts letters and numbers in the reference.
    requestId.current ??= crypto.randomUUID().replaceAll('-', '');
    requestSignature.current = signature;
    try {
      const response = await fetch('/api/paysuite/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // No method: the customer chooses it on the PaySuite checkout page.
        body: JSON.stringify({
          ...payload,
          accepted,
          requestId: requestId.current,
        }),
      });
      const data = (await response.json()) as {
        error?: string;
        paymentId: string;
        status?: string;
        url?: string | null;
        resumePaymentId?: string | null;
        resumeUrl?: string | null;
      };
      if (response.status === 401) {
        location.assign(
          '/entrar?return_to=' +
            encodeURIComponent(location.pathname + location.search),
        );
        return;
      }
      // Pending-order limit: continue the existing PaySuite checkout (or open
      // the payments page) instead of dead-ending on the error.
      if (response.status === 409 && 'resumeUrl' in data) {
        if (data.resumeUrl) {
          try {
            location.assign(checkoutURL(data.resumeUrl));
            return;
          } catch {
            /* Untrusted URL: fall back to the payments page. */
          }
        }
        location.assign('/checkout/retorno');
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
      <p>
        {t(
          compact ? 'Pagamento seguro na PaySuite. Não guardamos PINs nem dados do cartão.' : ' O pagamento é concluído na página segura da PaySuite. Não guardamos dados do cartão nem PINs. ',
        )}
      </p>
      <label className="growth-check">
        <input
          type="checkbox"
          checked={accepted}
          onChange={(e) => setAcceptedFor(e.target.checked ? signature : '')}
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
