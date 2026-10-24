'use client';
import { PurchasePaymentCards } from './purchase-history';
import { SourceImage } from './source-image';
import type { PurchasePayment } from '@/lib/purchase-history';
import { useI18n } from '@/components/language-provider';
import Link from '@/components/hard-link';
import { useEffect, useState } from 'react';
import { checkoutURL } from '@/lib/paysuite';
import { CheckCircle2, ArrowRight, Clock3, AlertCircle } from 'lucide-react';
type Payment = PurchasePayment & {
  guest?: boolean;
  id: string;
  paymentReference: string;
  orderReference?: string | null;
  kind: string;
  amount: number;
  status: string;
  cycle: string;
  url?: string | null;
  orderStatus?: string | null;
  profileReady?: boolean;
  receiptStatus?: string | null;
  fulfilment?: {
    mode: string;
    city: string;
    eta: string;
    point?: { name: string; address: string; hours: string } | null;
  } | null;
};
const labels: Record<string, string> = {
  creating: 'A verificar pagamento',
  pending: 'A aguardar pagamento',
  paid: 'Pagamento feito com sucesso',
  failed: 'Pagamento não concluído',
  review: 'Pagamento em revisão pela equipa',
};
export function PaySuiteStatus() {
  const { t } = useI18n();
  const [payment, setPayment] = useState<Payment | null>(null),
    [payments, setPayments] = useState<Payment[]>([]),
    [error, setError] = useState(''),
    [signin, setSignin] = useState(false);
  const [returnTo, setReturnTo] = useState('/checkout/retorno');
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    const id = new URLSearchParams(location.search).get('payment');
    if (id && /^[a-zA-Z0-9-]+$/.test(id))
      queueMicrotask(() =>
        setReturnTo('/checkout/retorno?payment=' + encodeURIComponent(id)),
      );
    let count = 0;
    let inFlight = false;
    async function refresh() {
      if (inFlight || document.hidden || count++ >= 20) return;
      inFlight = true;
      try {
        const r = await fetch(
          '/api/paysuite/checkout' +
            (id ? '?payment=' + encodeURIComponent(id) : ''),
          {
            cache: 'no-store',
            signal: AbortSignal.any([
              controller.signal,
              AbortSignal.timeout(12000),
            ]),
          },
        );
        if (r.status === 401) {
          setSignin(true);
          return;
        }
        const d = (await r.json()) as Payment & {
          payments: Payment[];
          error?: string;
        };
        if (!r.ok) throw Error(d.error);
        if (id && d.guest) {
          location.replace('/acompanhar?referencia=' + encodeURIComponent(id));
          return;
        }
        if (id && ['paid', 'failed'].includes(d.status)) {
          try {
            const attempt = JSON.parse(
              sessionStorage.getItem('framy-payment-attempt') || 'null',
            );
            if (attempt?.id === id)
              sessionStorage.removeItem('framy-payment-attempt');
          } catch {}
        }
        setError('');
        if (id) setPayment(d);
        else setPayments(d.payments);
      } catch (e) {
        if (!controller.signal.aborted)
          setError('Não foi possível actualizar o estado. Tente novamente.');
      } finally {
        inFlight = false;
        if (!controller.signal.aborted) setLoaded(true);
      }
    }
    void refresh();
    const timer = setInterval(() => void refresh(), 15000);
    return () => {
      controller.abort();
      clearInterval(timer);
    };
  }, []);
  let url: string | null = null;
  try {
    if (payment?.url) url = checkoutURL(payment.url);
  } catch {
    /* Never navigate to an untrusted provider URL. */
  }
  return (
    <section
      className={`panel payment-result ${payment?.status === 'paid' ? 'is-paid' : ''}`}
    >
      <h1>
        {t(
          payment
            ? labels[payment.status] || 'Estado do pagamento'
            : 'As minhas compras',
        )}
      </h1>
      {signin ? (
        <Link href={'/entrar?return_to=' + encodeURIComponent(returnTo)}>
          {t(' Entre para consultar os seus pagamentos ')}
        </Link>
      ) : (
        <>
          {error && <p role="alert">{t(error)}</p>}
          {!loaded && <output>{t('A consultar o estado…')}</output>}
          {loaded && !error && !payment && payments.length === 0 && (
            <div className="purchase-empty">
              <SourceImage
                src="/home/kit-gift-box-cutout.webp"
                alt={t('Kit: cartão + porta-chaves')}
                width={180}
                height={140}
              />
              <div>
                <p>{t('Ainda não tem pagamentos registados.')}</p>
                <Link className="btn btn-primary" href="/produtos">
                  {t('Escolher produto NFC')}
                </Link>
              </div>
            </div>
          )}
          {payment ? (
            <>
              {payment.product && (
                <SourceImage
                  className="payment-product-photo"
                  src={payment.product.image}
                  alt={t(payment.product.name)}
                  width={220}
                  height={160}
                />
              )}
              <div className="payment-state-icon" aria-hidden="true">
                {payment.status === 'paid' ? (
                  <CheckCircle2 size={36} />
                ) : payment.status === 'failed' ? (
                  <AlertCircle size={36} />
                ) : (
                  <Clock3 size={36} />
                )}
              </div>
              <h2 aria-live="polite">
                {t(
                  payment.product?.name ||
                    (payment.kind === 'product'
                      ? 'Produtos NFC'
                      : 'Plano digital'),
                )}
              </h2>
              <p>
                {(payment.amount / 100).toLocaleString('pt-MZ', {
                  minimumFractionDigits: 2,
                })}{' '}
                {t(' MT ·')}{' '}
                {t(
                  payment.kind === 'product'
                    ? 'Produtos'
                    : payment.cycle === 'annual'
                      ? 'Perfil · um ano'
                      : 'Perfil · um mês',
                )}
              </p>
              <p>
                {t('Referência: ')}
                {payment.orderReference || payment.paymentReference}
              </p>
              {payment.status === 'paid' && payment.kind === 'product' && (
                <div className="payment-profile-next">
                  <span className="eyebrow">
                    {t(' PRÓXIMO PASSO · PERFIL DIGITAL ')}
                  </span>
                  <h3>
                    {t(
                      payment.profileReady
                        ? 'O seu perfil já está publicado'
                        : 'Agora, prepare o seu perfil',
                    )}
                  </h3>
                  <p>
                    {t(
                      payment.profileReady
                        ? 'Pode rever os seus contactos e links. O produto fica associado ao perfil da sua conta.'
                        : 'Adicione a sua fotografia, os contactos e os links que quer partilhar. Ao publicar, o perfil fica ligado à sua encomenda.',
                    )}
                  </p>
                  <Link
                    className="btn btn-primary"
                    href={'/perfil?pagamento=' + encodeURIComponent(payment.id)}
                  >
                    {t(
                      payment.profileReady
                        ? 'Continuar a configurar o perfil'
                        : 'Continuar: criar e configurar perfil',
                    )}{' '}
                    <ArrowRight size={18} aria-hidden="true" />
                  </Link>
                  <p className="payment-next-note">
                    {t(
                      ' Pode continuar mais tarde na sua conta. Não precisa de repetir o pagamento. ',
                    )}
                  </p>
                </div>
              )}
              {url && payment.status === 'pending' && (
                <a className="btn btn-primary" href={url}>
                  {t('Continuar pagamento')}
                </a>
              )}
              {payment.status === 'paid' && (
                <p>
                  {t(
                    payment.kind === 'product'
                      ? payment.orderStatus === 'fulfilled'
                        ? 'Entrega confirmada pela equipa.'
                        : 'A encomenda está paga. A equipa acompanhará a configuração do perfil, a produção e a entrega.'
                      : 'O período pago foi registado no seu perfil.',
                  )}
                </p>
              )}
              {payment.status === 'paid' && payment.fulfilment && (
                <div className="pickup-location">
                  <h3>
                    {t(
                      payment.fulfilment.mode === 'pickup'
                        ? 'O seu ponto de levantamento'
                        : 'A sua entrega',
                    )}
                  </h3>
                  {payment.fulfilment.point ? (
                    <>
                      <strong>{payment.fulfilment.point.name}</strong>
                      <p>{payment.fulfilment.point.address}</p>
                      <p>{payment.fulfilment.point.hours}</p>
                    </>
                  ) : (
                    <p>
                      {payment.fulfilment.city} ·{' '}
                      {t(
                        payment.fulfilment.mode === 'express'
                          ? 'Expresso'
                          : 'Normal',
                      )}
                    </p>
                  )}
                  <p>{payment.fulfilment.eta}</p>
                </div>
              )}
              {payment.status === 'paid' && payment.receiptStatus && (
                <p className="payment-next-note">
                  {t(
                    payment.receiptStatus === 'sent'
                      ? 'O comprovativo foi enviado para o email da sua conta. Verifique também a pasta de spam.'
                      : payment.receiptStatus === 'review'
                        ? 'O pagamento está confirmado. Contacte a equipa se ainda não recebeu o comprovativo por email.'
                        : 'O comprovativo de pagamento está a ser preparado para envio ao email da sua conta.',
                  )}
                </p>
              )}
              {payment.status === 'pending' && (
                <p>
                  {t(
                    'O pagamento ainda não está confirmado. Continue pelo pagamento existente; se já pagou, aguarde a confirmação antes de tentar novamente.',
                  )}
                </p>
              )}
              {payment.status === 'failed' && (
                <div className="payment-recovery">
                  <p>
                    {t(
                      'O pagamento não foi concluído. Se houve uma cobrança, contacte a Framy com esta referência antes de voltar a pagar.',
                    )}
                  </p>
                  <Link
                    className="btn btn-primary"
                    href="/contacto?assunto=pagamento"
                  >
                    {t('Preciso de ajuda')}
                  </Link>
                  {payment.product && (
                    <Link
                      className="btn btn-outline"
                      href={
                        '/comprar?formato=' +
                        encodeURIComponent(payment.product.selection)
                      }
                    >
                      {t('Rever configuração')}
                    </Link>
                  )}
                </div>
              )}
              {payment.status === 'paid' &&
                payment.kind === 'product' &&
                payment.orderReference && (
                  <p>
                    <Link
                      className="btn btn-outline"
                      href={
                        '/acompanhar?referencia=' +
                        encodeURIComponent(payment.orderReference)
                      }
                    >
                      {t('Acompanhar o pedido')}
                    </Link>
                  </p>
                )}
              {payment.status === 'creating' && (
                <p>
                  {t(
                    'Ainda não foi confirmado nenhum pagamento. O pedido está registado para verificação pela equipa. Não crie outro pedido enquanto verificamos a ligação ao prestador.',
                  )}
                </p>
              )}
              {payment.status === 'review' && (
                <p>
                  {t(
                    ' Não volte a pagar. Contacte a equipa com a referência abaixo. ',
                  )}
                </p>
              )}
            </>
          ) : (
            <PurchasePaymentCards payments={payments} />
          )}
          <p>
            <button className="btn" onClick={() => location.reload()}>
              {t(' Actualizar ')}
            </button>
          </p>
          <Link href="/dashboard?tab=orders">{t('As minhas compras')}</Link> ·{' '}
          <Link href="/contacto">{t('Contactar a equipa')}</Link>
        </>
      )}
    </section>
  );
}
