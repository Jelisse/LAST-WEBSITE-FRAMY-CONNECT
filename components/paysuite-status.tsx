'use client';
import Link from '@/components/hard-link';
import { useEffect, useState } from 'react';
import { checkoutURL } from '@/lib/paysuite';
type Payment = {
  id: string;
  kind: string;
  amount: number;
  status: string;
  cycle: string;
  url?: string | null;
};
const labels: Record<string, string> = {
  creating: 'A confirmar a ligação ao prestador',
  pending: 'A aguardar pagamento',
  paid: 'Pagamento confirmado',
  failed: 'Pagamento não concluído',
  review: 'Pagamento em revisão pela equipa',
};
export function PaySuiteStatus() {
  const [payment, setPayment] = useState<Payment | null>(null),
    [payments, setPayments] = useState<Payment[]>([]),
    [error, setError] = useState(''),
    [signin, setSignin] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    const id = new URLSearchParams(location.search).get('payment');
    let count = 0;
    async function refresh() {
      if (document.hidden || count++ >= 20) return;
      try {
        const r = await fetch(
          '/api/paysuite/checkout' +
            (id ? '?payment=' + encodeURIComponent(id) : ''),
          { cache: 'no-store', signal: controller.signal },
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
    <section className="panel">
      <h1>Estado do pagamento</h1>
      {signin ? (
        <Link href="/entrar?return_to=%2Fcheckout%2Fretorno">
          Entre para consultar os seus pagamentos
        </Link>
      ) : (
        <>
          {error && <p role="alert">{error}</p>}
          {payment ? (
            <>
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
              {url && (
                <a className="btn btn-primary" href={url}>
                  Pagar na PaySuite
                </a>
              )}
              {payment.status === 'paid' && (
                <p>
                  {payment.kind === 'product'
                    ? 'A equipa recebeu a encomenda e irá preparar a produção e entrega.'
                    : 'O período pago foi registado no seu perfil.'}
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
