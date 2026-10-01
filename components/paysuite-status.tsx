'use client';
import Link from '@/components/hard-link';
import { useEffect, useState } from 'react';
import { checkoutURL } from '@/lib/paysuite';
import { CheckCircle2, ArrowRight, Clock3 } from 'lucide-react';
type Payment = {
  id: string;
  kind: string;
  amount: number;
  status: string;
  cycle: string;
  url?: string | null;
  orderStatus?: string | null;
  profileReady?: boolean;
  receiptStatus?: string | null;
};
const labels: Record<string, string> = {
  creating: 'A confirmar a ligação ao prestador',
  pending: 'A aguardar pagamento',
  paid: 'Pagamento feito com sucesso',
  failed: 'Pagamento não concluído',
  review: 'Pagamento em revisão pela equipa',
};
export function PaySuiteStatus() {
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
        setError('');
        if (id) setPayment(d);
        else setPayments(d.payments);
      } catch (e) {
        if (!controller.signal.aborted)
          setError(e instanceof Error ? e.message : 'Erro ao consultar.');
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
      <h1>Estado do pagamento</h1>
      {signin ? (
        <Link href={'/entrar?return_to=' + encodeURIComponent(returnTo)}>
          Entre para consultar os seus pagamentos
        </Link>
      ) : (
        <>
          {error && <p role="alert">{error}</p>}
          {!loaded && <output>A consultar o estado…</output>}
          {loaded && !error && !payment && payments.length === 0 && (
            <p>Ainda não tem pagamentos registados.</p>
          )}
          {payment ? (
            <>
              <div className="payment-state-icon" aria-hidden="true">
                {payment.status === 'paid' ? (
                  <CheckCircle2 size={36} />
                ) : (
                  <Clock3 size={36} />
                )}
              </div>
              <h2 aria-live="polite">
                {labels[payment.status] ?? payment.status}
              </h2>
              <p>
                {(payment.amount / 100).toLocaleString('pt-MZ', {
                  minimumFractionDigits: 2,
                })}{' '}
                MT ·{' '}
                {payment.kind === 'product'
                  ? 'Produtos'
                  : payment.cycle === 'annual'
                    ? 'Perfil · um ano'
                    : 'Perfil · um mês'}
              </p>
              {payment.status === 'paid' && payment.kind === 'product' && (
                <div className="payment-profile-next">
                  <span className="eyebrow">
                    PRÓXIMO PASSO · PERFIL DIGITAL
                  </span>
                  <h3>
                    {payment.profileReady
                      ? 'O seu perfil já está publicado'
                      : 'Agora, prepare o seu perfil'}
                  </h3>
                  <p>
                    {payment.profileReady
                      ? 'Pode rever os seus contactos e links. O produto fica associado ao perfil da sua conta.'
                      : 'Adicione a sua fotografia, os contactos e os links que quer partilhar. Ao publicar, o perfil fica ligado à sua encomenda.'}
                  </p>
                  <Link
                    className="btn btn-primary"
                    href={'/perfil?pagamento=' + encodeURIComponent(payment.id)}
                  >
                    {payment.profileReady
                      ? 'Continuar a configurar o perfil'
                      : 'Continuar: criar e configurar perfil'}{' '}
                    <ArrowRight size={18} aria-hidden="true" />
                  </Link>
                  <p className="payment-next-note">
                    Pode continuar mais tarde na sua conta. Não precisa de
                    repetir o pagamento.
                  </p>
                </div>
              )}
              {url && payment.status === 'pending' && (
                <a className="btn btn-primary" href={url}>
                  Pagar na PaySuite
                </a>
              )}
              {payment.status === 'paid' && (
                <p>
                  {payment.kind === 'product'
                    ? payment.orderStatus === 'fulfilled'
                      ? 'Entrega confirmada pela equipa.'
                      : 'A encomenda está paga. A equipa acompanhará a configuração do perfil, a produção e a entrega.'
                    : 'O período pago foi registado no seu perfil.'}
                </p>
              )}
              {payment.status === 'paid' && payment.receiptStatus && (
                <p className="payment-next-note">
                  {payment.receiptStatus === 'sent'
                    ? 'O comprovativo foi enviado para o email da sua conta. Verifique também a pasta de spam.'
                    : payment.receiptStatus === 'review'
                      ? 'O pagamento está confirmado. Contacte a equipa se ainda não recebeu o comprovativo por email.'
                      : 'O comprovativo de pagamento está a ser preparado para envio ao email da sua conta.'}
                </p>
              )}
              {payment.status === 'creating' && (
                <p>
                  Não crie outro pedido. A equipa verificará este pedido no
                  prestador.
                </p>
              )}
              {payment.status === 'review' && (
                <p>
                  Não volte a pagar. Contacte a equipa com a referência abaixo.
                </p>
              )}
              <p>Referência: {payment.id}</p>
            </>
          ) : (
            payments.map((p) => (
              <p key={p.id}>
                <a
                  href={'/checkout/retorno?payment=' + encodeURIComponent(p.id)}
                >
                  {(p.amount / 100).toFixed(2)} MT · {labels[p.status]} ·{' '}
                  {p.orderStatus === 'fulfilled' ? 'Entregue · ' : ''}
                  {p.id.slice(0, 8)}
                </a>
              </p>
            ))
          )}
          <p>
            <button className="btn" onClick={() => location.reload()}>
              Actualizar
            </button>
          </p>
          <Link href="/perfil">O meu perfil</Link> ·{' '}
          <Link href="/contacto">Contactar a equipa</Link>
        </>
      )}
    </section>
  );
}
