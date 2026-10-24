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
  const navigating = useRef(false);
  const [publicReference, setPublicReference] = useState('');
  async function pay(event: { preventDefault(): void }) {
    event.preventDefault();
    if (inFlight.current || disabled || !accepted) return;
    if (requestId.current && requestSignature.current !== signature) {
      setError(
        'Já existe uma tentativa com outras condições. Consulte os seus pagamentos antes de criar outro pedido.',
      );
      return;
    }
    inFlight.current = true;
    setBusy(true);
    setError('');
    try {
      // PaySuite only accepts letters and numbers in the reference.
      const fingerprint = Array.from(
        new Uint8Array(
          await crypto.subtle.digest(
            'SHA-256',
            new TextEncoder().encode(signature),
          ),
        ),
        (b) => b.toString(16).padStart(2, '0'),
      ).join('');
      let saved: { id: string; fingerprint: string } | null = null;
      try {
        saved = JSON.parse(
          sessionStorage.getItem('framy-payment-attempt') || 'null',
        );
      } catch {
        /* Storage is optional. */
      }
      if (!requestId.current && saved && /^[a-f0-9]{32}$/.test(saved.id)) {
        if (saved.fingerprint !== fingerprint) {
          const prior = await fetch(
            '/api/paysuite/checkout?payment=' + saved.id,
            { cache: 'no-store', signal: AbortSignal.timeout(12000) },
          );
          const state = (await prior.json()) as { status?: string };
          if (!prior.ok || !['paid', 'failed'].includes(state.status || '')) {
            setError(
              'Já existe uma tentativa com outras condições. Consulte os seus pagamentos antes de criar outro pedido.',
            );
            return;
          }
          try {
            sessionStorage.removeItem('framy-payment-attempt');
          } catch {}
        } else requestId.current = saved.id;
      }
      requestId.current ??= crypto.randomUUID().replaceAll('-', '');

      try {
        sessionStorage.setItem(
          'framy-payment-attempt',
          JSON.stringify({ id: requestId.current, fingerprint }),
        );
        if (payload.kind === 'product')
          localStorage.setItem('framy-last-order', requestId.current);
      } catch {
        /* Reference remains on screen. */
      }
      requestSignature.current = signature;
      const response = await fetch('/api/paysuite/checkout', {
        method: 'POST',
        signal: AbortSignal.timeout(35000),
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
        orderReference?: string;
        status?: string;
        url?: string | null;
        resumePaymentId?: string | null;
        resumeUrl?: string | null;
      };
      if (response.status === 401) {
        if (payload.kind === 'product' && 'buyerEmail' in payload)
          throw Error(
            'A sessão da compra expirou. Actualize a página para continuar sem conta.',
          );
        navigating.current = true;
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
            navigating.current = true;
            location.assign(checkoutURL(data.resumeUrl));
            return;
          } catch {
            /* Untrusted URL: fall back to the payments page. */
          }
        }
        navigating.current = true;
        location.assign(
          data.resumePaymentId
            ? '/acompanhar?referencia=' +
                encodeURIComponent(data.resumePaymentId)
            : '/checkout/retorno',
        );
        return;
      }
      if (data.orderReference) setPublicReference(data.orderReference);
      if (!response.ok) {
        // Server failures can follow a committed order: retry the same reference.
        if (response.status === 422) {
          const rejectedId = requestId.current;
          requestId.current = null;
          setPublicReference('');
          try {
            if (localStorage.getItem('framy-last-order') === rejectedId)
              localStorage.removeItem('framy-last-order');
          } catch {}
          try {
            sessionStorage.removeItem('framy-payment-attempt');
          } catch {}
        }
        throw Error(data.error || 'Não foi possível iniciar o pagamento.');
      }
      if (data.status === 'pending' && data.url) {
        navigating.current = true;
        location.assign(checkoutURL(data.url));
        return;
      }
      // Uncertain creation remains attached to the same reference; never create a replacement automatically.
      navigating.current = true;
      location.assign(
        '/checkout/retorno?payment=' + encodeURIComponent(data.paymentId),
      );
    } catch (e) {
      navigating.current = false;
      setError(
        e instanceof Error
          ? e.message
          : 'Ligação interrompida. Tente novamente para consultar o mesmo pedido.',
      );
    } finally {
      inFlight.current = false;
      if (!navigating.current) setBusy(false);
    }
  }
  return (
    <form onSubmit={pay} className="paysuite-checkout">
      <p>
        {t(
          compact
            ? 'Pagamento seguro na PaySuite. Não guardamos PINs nem dados do cartão.'
            : ' O pagamento é concluído na página segura da PaySuite. Não guardamos dados do cartão nem PINs. ',
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
          compact
            ? 'Confirmo o total. Sem débitos automáticos.'
            : ' Confirmo o total apresentado. Este pagamento não autoriza débitos automáticos. ',
        )}
      </label>
      {error && <p role="alert">{t(error)}</p>}
      {busy && (
        <output className="payment-connecting" aria-live="polite">
          <span className="framy-loading-ring" aria-hidden="true" />
          <div>
            <strong>{t('A ligar à PaySuite…')}</strong>
            <p>
              {t('Mantenha esta página aberta. Não clique novamente em pagar.')}
            </p>
          </div>
        </output>
      )}
      {publicReference && payload.kind === 'product' && (
        <p className="payment-reference">
          {t('Referência: ')}
          <strong>{publicReference}</strong>{' '}
          <Link href={'/acompanhar?referencia=' + publicReference}>
            {t('Acompanhar o pedido')}
          </Link>
        </p>
      )}
      <button
        className="btn btn-primary"
        disabled={busy || disabled || !accepted}
      >
        {t(
          busy
            ? 'A preparar pagamento…'
            : compact
              ? 'Continuar para pagamento'
              : 'Continuar para pagamento',
        )}
      </button>
      <p>
        <Link href="/checkout/retorno">
          {t('Consultar os meus pagamentos')}
        </Link>
      </p>
    </form>
  );
}
