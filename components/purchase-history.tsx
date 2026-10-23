'use client';
import { useEffect, useState } from 'react';
import Link from './hard-link';
import { SourceImage } from './source-image';
import { useI18n } from './language-provider';
import { CustomerOrders } from './customer-orders';
import type { CustomerOrder } from '@/lib/customer-order';
import type { PublicProduct } from '@/lib/catalog';
import { money } from '@/lib/catalog';
import {
  purchaseHistory,
  purchaseStatus,
  type PurchasePayment,
} from '@/lib/purchase-history';

export function PurchasePaymentCards({
  payments,
}: {
  payments: PurchasePayment[];
}) {
  const { t } = useI18n();
  const history = purchaseHistory(payments);
  const active = history.filter(
    (p) =>
      ['pending', 'creating', 'review'].includes(p.status) ||
      (p.status === 'paid' &&
        p.kind === 'product' &&
        !['fulfilled', 'cancelled', 'refunded'].includes(p.orderStatus || '')),
  );
  const render = (items: PurchasePayment[]) => (
    <div className="purchase-history-grid">
      {items.map((p) => (
        <article className="purchase-history-card" key={p.id}>
          <div className="purchase-history-product">
            {p.product ? (
              <SourceImage
                src={p.product.image}
                alt={t(p.product.name)}
                width={100}
                height={100}
              />
            ) : (
              <span className="purchase-history-symbol" aria-hidden="true">
                {p.kind === 'product' ? '↗' : '●'}
              </span>
            )}
            <div>
              <h3>
                {t(
                  p.product?.name ||
                    (p.kind === 'product' ? 'Produtos NFC' : 'Plano digital'),
                )}
              </h3>
              <span className="purchase-state" data-state={p.status}>
                {t(
                  p.orderStatus === 'fulfilled'
                    ? 'Entregue'
                    : purchaseStatus[p.status] || 'Estado em actualização.',
                )}
              </span>
            </div>
          </div>
          <dl>
            <div>
              <dt>{t('Referência')}</dt>
              <dd>
                {p.orderReference ||
                  p.paymentReference ||
                  t('A verificar pagamento')}
              </dd>
            </div>
            <div>
              <dt>{t('Total')}</dt>
              <dd>{money(p.amount, t.locale)}</dd>
            </div>
            {p.created_at && !Number.isNaN(Date.parse(p.created_at)) && (
              <div>
                <dt>{t('Data')}</dt>
                <dd>
                  {new Date(p.created_at).toLocaleDateString(t.locale, {
                    timeZone: 'Africa/Maputo',
                  })}
                </dd>
              </div>
            )}
          </dl>
          <Link
            className="btn btn-outline"
            href={'/checkout/retorno?payment=' + encodeURIComponent(p.id)}
          >
            {t(
              p.status === 'pending'
                ? 'Continuar pagamento'
                : p.status === 'failed'
                  ? 'Ver opções'
                  : p.status === 'paid' && p.kind === 'product'
                    ? 'Acompanhar o pedido'
                    : 'Ver detalhes',
            )}
          </Link>
        </article>
      ))}
    </div>
  );
  return (
    <>
      {active.length > 0 && (
        <section className="purchase-history-group">
          <h2>{t('Em curso')}</h2>
          {render(active)}
        </section>
      )}
      {history.length > active.length && (
        <section className="purchase-history-group">
          <h2>{t('Histórico de compras')}</h2>
          {render(history.filter((p) => !active.includes(p)))}
        </section>
      )}
    </>
  );
}
export function PurchaseHistory({
  orders,
  events,
  products,
  onOpen,
}: {
  orders: CustomerOrder[];
  events: { id: string; orderId: string; action: string; createdAt: string }[];
  products: PublicProduct[];
  onOpen: (order: CustomerOrder) => void;
}) {
  const { t } = useI18n();
  const [payments, setPayments] = useState<PurchasePayment[]>([]);
  const [state, setState] = useState('loading');
  useEffect(() => {
    const controller = new AbortController();
    void fetch('/api/paysuite/checkout', {
      cache: 'no-store',
      signal: AbortSignal.any([controller.signal, AbortSignal.timeout(12000)]),
    })
      .then(async (response) => {
        if (!response.ok) throw Error();
        const result = (await response.json()) as {
          payments: PurchasePayment[];
        };
        if (!controller.signal.aborted) {
          setPayments(result.payments);
          setState('ready');
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) setState('error');
      });
    return () => controller.abort();
  }, [orders]);
  return (
    <div className="purchase-history">
      {state === 'loading' && (
        <output>{t('A carregar as suas compras…')}</output>
      )}
      {state === 'error' && (
        <div role="alert" className="panel">
          <p>
            {t(
              'Não foi possível carregar as compras. Os seus pedidos continuam guardados.',
            )}
          </p>
          <Link className="btn btn-outline" href="/checkout/retorno">
            {t('Tentar novamente')}
          </Link>
        </div>
      )}
      <PurchasePaymentCards payments={payments} />
      {orders.length > 0 && (
        <CustomerOrders
          orders={orders}
          events={events}
          products={products}
          onOpen={onOpen}
        />
      )}
      {state === 'ready' && !payments.length && !orders.length && (
        <section className="panel purchase-empty">
          <SourceImage
            src="/home/kit-gift-box-cutout.webp"
            alt={t('Kit: cartão + porta-chaves')}
            width={230}
            height={180}
          />
          <div>
            <h2>{t('A sua primeira conexão começa aqui.')}</h2>
            <p>
              {t(
                'Escolha um cartão, um porta-chaves ou o kit. Depois da compra, acompanhe aqui o pagamento e a entrega.',
              )}
            </p>
            <Link className="btn btn-primary" href="/produtos">
              {t('Escolher o meu produto')}
            </Link>
          </div>
        </section>
      )}
      {(payments.length > 0 || orders.length > 0) && (
        <p className="purchase-history-more">
          <Link href="/produtos">{t('Escolher outro produto')} ↗</Link>
        </p>
      )}
    </div>
  );
}
