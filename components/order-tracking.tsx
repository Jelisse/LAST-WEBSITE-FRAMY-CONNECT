'use client';
import { useEffect, useState } from 'react';
import {
  PackageSearch,
  Copy,
  Check,
  Mail,
  RefreshCw,
  CheckCircle2,
} from 'lucide-react';
import Link from './hard-link';
import { useI18n } from './language-provider';
import { checkoutURL } from '@/lib/paysuite';
import { progressLabels } from '@/lib/order-tracking';
type Result = {
  id: string;
  reference: string;
  paymentStatus: string;
  stage: string | null;
  history: { stage: string; created_at: string }[];
  deliveryMode?: string;
  privateAccess: boolean;
  guest: boolean;
  amount?: number;
  buyerName?: string;
  buyerEmail?: string;
  contact?: string;
  address?: string;
  url?: string | null;
  canClaim?: boolean;
  fulfilment?: {
    mode: string;
    point?: { name: string; address: string; hours: string };
  };
};
export function OrderTracking() {
  const { t } = useI18n();
  const [reference, setReference] = useState(''),
    [token, setToken] = useState(''),
    [data, setData] = useState<Result | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [message, setMessage] = useState(''),
    [copied, setCopied] = useState(false);
  async function load(id = reference, proof = token, action = 'lookup') {
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const r = await fetch('/api/order-tracking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reference: id, token: proof, action }),
        signal: AbortSignal.timeout(15000),
      });
      const d = (await r.json()) as Result & {
        error?: string;
        message?: string;
        claimed?: boolean;
      };
      if (!r.ok) throw Error(d.error);
      if (d.message) setMessage(d.message);
      else if (d.claimed) {
        await load(id, '');
        setMessage('Encomenda associada à sua conta.');
      } else {
        setData(d);
        if (['paid', 'failed', 'refunded'].includes(d.paymentStatus)) {
          try {
            const attempt = JSON.parse(
              sessionStorage.getItem('framy-payment-attempt') || 'null',
            );
            if (attempt?.id === d.id)
              sessionStorage.removeItem('framy-payment-attempt');
          } catch {
            /* Optional retry state. */
          }
        }
      }
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : 'Não foi possível consultar a encomenda. Tente novamente.',
      );
    } finally {
      setBusy(false);
    }
  }
  useEffect(() => {
    queueMicrotask(() => {
      const query = new URLSearchParams(location.search);
      let id = query.get('referencia') || '';
      try {
        id ||= localStorage.getItem('framy-last-order') || '';
      } catch {
        /* Optional convenience. */
      }
      const proof = location.hash.slice(1);
      if (/^[a-f0-9]{64}$/.test(proof)) {
        setToken(proof);
        history.replaceState(null, '', location.pathname + location.search);
      }
      if (id) {
        setReference(id);
        void load(id, proof);
      }
    });
  }, []);
  const trackedReference = data?.reference;
  useEffect(() => {
    if (!trackedReference) return;
    const timer = setInterval(() => {
      if (!document.hidden && !busy) void load(trackedReference, token);
    }, 60000);
    return () => clearInterval(timer);
  }, [trackedReference, token, busy]);
  const stage = data?.stage;
  const steps = [
    'confirmed',
    'preparing',
    data?.deliveryMode === 'pickup' || stage === 'ready'
      ? 'ready'
      : 'dispatched',
    'delivered',
  ];
  return (
    <section className="order-tracking-page">
      <div className="tracking-heading">
        <PackageSearch size={34} />
        <h1>{t('Acompanhar a minha encomenda')}</h1>
        <p>
          {t(
            'Consulte o progresso com a referência da compra. Não precisa de conta.',
          )}
        </p>
      </div>
      <form
        className="tracking-search"
        onSubmit={(e) => {
          e.preventDefault();
          setData(null);
          setToken('');
          void load(reference, '');
        }}
      >
        <label>
          {t('Referência da encomenda')}
          <input
            required
            value={reference}
            onChange={(e) => {
              setReference(e.target.value);
              setCopied(false);
            }}
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            maxLength={32}
            placeholder="FC-OR-26-5827-4191"
          />
        </label>
        <button className="btn btn-primary" disabled={busy}>
          {busy ? (
            <span className="framy-loading-ring" aria-hidden="true" />
          ) : (
            <PackageSearch size={19} />
          )}{' '}
          {t('Consultar')}
        </button>
      </form>
      {error && <p role="alert">{t(error)}</p>}
      {message && <output aria-live="polite">{t(message)}</output>}
      {data && (
        <section className="tracking-result" aria-busy={busy}>
          <div className="tracking-result-title">
            <h2>
              {t(progressLabels[data.paymentStatus] || data.paymentStatus)}
            </h2>
            <button
              type="button"
              className="btn"
              disabled={busy}
              onClick={() => void load(data.reference)}
            >
              <RefreshCw size={17} />
              {t('Actualizar')}
            </button>
          </div>
          <div className="tracking-reference">
            <span>
              {t('Referência: ')}
              <strong>{data.reference}</strong>
            </span>
            <button
              className={'btn ' + (copied ? 'is-copied' : '')}
              type="button"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(data.reference);
                  setCopied(true);
                } catch {
                  setMessage('Seleccione a referência e copie manualmente.');
                }
              }}
            >
              {copied ? <Check size={17} /> : <Copy size={17} />}{' '}
              {t(copied ? 'Copiado' : 'Copiar referência')}
            </button>
          </div>
          {stage && (
            <ol className="tracking-steps">
              {steps.map((s, i) => (
                <li
                  key={s}
                  className={i <= steps.indexOf(stage) ? 'is-complete' : ''}
                  aria-current={s === stage ? 'step' : undefined}
                >
                  <CheckCircle2 size={23} />
                  <span>{t(progressLabels[s])}</span>
                </li>
              ))}
            </ol>
          )}
          <p>{t('O progresso é actualizado pela equipa Framy Connect.')}</p>
          {data.history.filter((e) => e.stage !== 'assigned').length > 0 && (
            <details>
              <summary>{t('Histórico da encomenda')}</summary>
              <ul>
                {data.history
                  .filter((e) => e.stage !== 'assigned')
                  .map((e, i) => (
                    <li key={i}>
                      {t(progressLabels[e.stage] || e.stage)} ·{' '}
                      {new Date(e.created_at).toLocaleString()}
                    </li>
                  ))}
              </ul>
            </details>
          )}
          {!data.privateAccess ? (
            <div className="tracking-private">
              <p>
                {t(
                  'Para consultar dados pessoais ou recuperar o pagamento, peça um link para o email do comprador.',
                )}
              </p>
              <button
                className="btn btn-secondary"
                disabled={busy}
                onClick={() => void load(data.reference, '', 'access')}
              >
                <Mail size={18} />
                {t('Receber link de acesso')}
              </button>
              <Link
                href={
                  '/entrar?return_to=' +
                  encodeURIComponent('/acompanhar?referencia=' + data.reference)
                }
              >
                {t('Já tem conta? Entrar')}
              </Link>
            </div>
          ) : (
            <div className="tracking-private">
              <h3>{t('Detalhes da encomenda')}</h3>
              {typeof data.amount === 'number' && (
                <p>
                  {t('Total')}:{' '}
                  {(data.amount / 100).toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}{' '}
                  MZN
                </p>
              )}
              <p>
                {data.buyerName} {data.buyerEmail}
              </p>
              <p>{data.contact}</p>
              <p>{data.address}</p>
              {data.url && (
                <a className="btn btn-primary" href={checkoutURL(data.url)}>
                  {t('Continuar para pagamento')}
                </a>
              )}
              {!data.guest && data.paymentStatus === 'paid' && (
                <Link
                  className="btn btn-primary"
                  href={'/perfil?pagamento=' + data.id}
                >
                  {t('Configurar o perfil NFC')}
                </Link>
              )}
              {data.guest && data.paymentStatus === 'paid' && (
                <>
                  <p>
                    {t(
                      'A compra está concluída. Pode criar uma conta e associar esta encomenda para configurar o perfil NFC.',
                    )}
                  </p>
                  {data.canClaim ? (
                    <button
                      className="btn btn-primary"
                      disabled={busy}
                      onClick={() => void load(data.reference, token, 'claim')}
                    >
                      {t('Associar à minha conta')}
                    </button>
                  ) : (
                    <>
                      <Link
                        className="btn btn-secondary"
                        href={
                          '/entrar?return_to=' +
                          encodeURIComponent(
                            '/acompanhar?referencia=' + data.reference,
                          )
                        }
                      >
                        {t('Criar conta ou entrar')}
                      </Link>
                      <button
                        className="btn"
                        disabled={busy}
                        onClick={() => void load(data.reference, '', 'access')}
                      >
                        {t('Receber link de acesso')}
                      </button>
                    </>
                  )}
                </>
              )}
            </div>
          )}
        </section>
      )}
    </section>
  );
}
