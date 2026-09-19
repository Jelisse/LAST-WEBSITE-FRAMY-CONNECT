'use client';
import { AgentContact } from '@/components/agent-contact';
import { useI18n } from '@/components/language-provider';

import type { CustomerOrder as SandboxOrder } from '@/lib/customer-order';
import Link from '@/components/hard-link';
import { Check, Package, MapPin, ArrowUpRight } from 'lucide-react';
import { orderLabels } from '@/lib/domain';
import { money } from '@/lib/catalog';
import { submissionTime } from '@/lib/order-progress';
const stages = [
  ['PENDING_PAYMENT', 'A aguardar pagamento'],
  ['QUEUED', 'Na fila de produção'],
  ['IN_PRODUCTION', 'Em produção'],
  ['READY', 'Pronto para entrega'],
  ['DELIVERED', 'Entregue'],
];
const descriptions: Record<string, string> = {
  PENDING_PAYMENT:
    'O seu pedido foi recebido. O próximo passo é a confirmação do pagamento.',
  QUEUED: 'Pagamento confirmado. O seu produto aguarda o início da produção.',
  IN_PRODUCTION: 'Estamos a preparar o seu produto e a ligação ao seu perfil.',
  READY:
    'Preparação e controlo de qualidade concluídos. O produto está pronto para entrega.',
  DELIVERED: 'A entrega do seu produto foi concluída.',
  CANCELLED:
    'Este pedido foi cancelado. O acompanhamento da entrega está encerrado.',
};
type Event = { id: string; orderId: string; action: string; createdAt: string };
const eventNames: Record<string, string> = {
  created: 'Pedido recebido',
  'reservation-expired': 'Reserva expirada — pedido cancelado',
  'delivery-address': 'Local de entrega actualizado',
  pay: 'Pagamento confirmado',
  assign: 'Agente atribuído',
  start: 'Produção iniciada',
  ready: 'Qualidade verificada · Pronto para entrega',
  deliver: 'Entrega concluída',
  cancel: 'Pedido cancelado',
  refund: 'Pagamento reembolsado',
};
export function OrderProgressLine({ order }: { order: SandboxOrder }) {
  const { t } = useI18n();
  const current = stages.findIndex(([s]) => s === order.status);
  if (current < 0)
    return (
      <p className="tracking-exception">
        {order.status === 'CANCELLED'
          ? t('Pedido cancelado — percurso interrompido.')
          : t('Estado em actualização.')}
      </p>
    );
  return (
    <ol className="tracking-progress" aria-label={t('Etapas do pedido')}>
      {stages.map(([state, label], i) => {
        const complete = i < current || order.status === 'DELIVERED';
        return (
          <li
            key={state}
            className={
              complete ? 'complete' : i === current ? 'active' : 'pending'
            }
            aria-current={i === current ? 'step' : undefined}
          >
            <span className="tracking-marker">
              {complete ? <Check size={17} aria-hidden="true" /> : i + 1}
            </span>
            <span>
              {t(label)}
              <small>
                {complete
                  ? t('Concluído')
                  : i === current
                    ? t('Estado actual')
                    : t('Próxima etapa')}
              </small>
            </span>
          </li>
        );
      })}
    </ol>
  );
}
export function CustomerOrders({
  orders,
  events,
  onOpen,
}: {
  orders: SandboxOrder[];
  events: Event[];
  onOpen: (order: SandboxOrder) => void;
}) {
  const { t } = useI18n();
  if (!orders.length)
    return (
      <section className="panel tracking-empty">
        <Package size={36} />
        <h2>{t('O seu próximo toque começa aqui.')}</h2>
        <p>{t('Depois de submeter o pedido, acompanhe aqui cada etapa.')}</p>
        <Link className="btn btn-primary" href="/produtos">
          {t('Escolher o meu produto')}
        </Link>
      </section>
    );
  return (
    <div className="customer-tracking-list">
      {orders.map((order) => {
        const history = events
          .filter((e) => e.orderId === order.id)
          .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
        return (
          <article
            className="tracking-card"
            key={order.id}
            aria-label={t('Pedido {0}', [order.id.slice(0, 8)])}
          >
            <header>
              <div className="tracking-product">
                <span className="tracking-product-icon">
                  <Package size={26} />
                </span>
                <div>
                  <p>
                    {t('Pedido #')}
                    {order.id.slice(0, 8).toUpperCase()}
                  </p>
                  <h2>{t(order.productName)}</h2>
                </div>
              </div>
              <span
                className={`tracking-status ${order.status === 'DELIVERED' ? 'delivered' : order.status === 'CANCELLED' ? 'cancelled' : ''}`}
              >
                {t(orderLabels[order.status] ?? 'Em actualização')}
              </span>
            </header>
            <p className="tracking-message">
              {t(
                descriptions[order.status] ??
                  'Consulte os detalhes para mais informações.',
              )}
            </p>
            <OrderProgressLine order={order} />
            <AgentContact order={order} />
            <div className="tracking-information">
              <div>
                <MapPin size={18} aria-hidden="true" />
                <span>
                  {t('Local de entrega')}
                  <strong>
                    {order.deliveryCity || t('Ainda não indicado')}
                  </strong>
                </span>
              </div>
              <div>
                <span>
                  {t('Submetido em')}
                  <strong>
                    <time dateTime={order.createdAt}>
                      {submissionTime(order.createdAt, t.locale)}
                    </time>
                  </strong>
                </span>
              </div>
              <div>
                <span>
                  {t('Última actualização')}
                  <strong>
                    <time dateTime={order.updatedAt}>
                      {submissionTime(order.updatedAt, t.locale)}
                    </time>
                  </strong>
                </span>
              </div>
            </div>
            <footer>
              <p>
                {money(order.amount, t.locale)}{' '}
                <span>
                  ·{' '}
                  {order.refunded
                    ? t('Reembolsado')
                    : order.paid
                      ? t('Pagamento confirmado')
                      : t('Pagamento pendente')}{' '}
                  {t('· Horas de Maputo')}
                </span>
              </p>
              <button
                className="btn"
                onClick={() => onOpen(order)}
                aria-label={t('Ver detalhes do pedido {0}', [
                  order.id.slice(0, 8),
                ])}
              >
                {!order.deliveryCity &&
                !['CANCELLED', 'DELIVERED'].includes(order.status)
                  ? t('Indicar local de entrega')
                  : t('Ver detalhes')}
                <ArrowUpRight size={17} />
              </button>
            </footer>
            <details className="tracking-history">
              <summary>
                {t('Histórico do pedido')}{' '}
                {history.length > 0 && `(${history.length})`}
              </summary>
              {history.length ? (
                <ol>
                  {history.map((e) => (
                    <li key={e.id}>
                      <span className="history-dot" aria-hidden="true" />
                      <div>
                        <strong>
                          {t(eventNames[e.action] ?? 'Pedido actualizado')}
                        </strong>
                        <time dateTime={e.createdAt}>
                          {submissionTime(e.createdAt, t.locale)}
                        </time>
                      </div>
                    </li>
                  ))}
                </ol>
              ) : (
                <p>{t('Sem actualizações registadas.')}</p>
              )}
            </details>
          </article>
        );
      })}
    </div>
  );
}
