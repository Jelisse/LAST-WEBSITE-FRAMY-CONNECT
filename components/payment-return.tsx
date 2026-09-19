'use client';
import { useEffect, useState } from 'react';
import { useI18n } from './language-provider';
import { AgentContact } from './agent-contact';
import { OrderProgressLine } from './customer-orders';
import type { CustomerOrder } from '@/lib/customer-order';
import { orderLabels } from '@/lib/domain';
export function PaymentReturn() {
  const { t } = useI18n();
  const [orders, setOrders] = useState<CustomerOrder[]>([]);
  const [id, setId] = useState('');
  const [state, setState] = useState('loading');
  async function refresh(signal?: AbortSignal) {
    try {
      const response = await fetch('/api/workspace', { cache: 'no-store', signal });
      if (response.status === 401) { setState('signin'); return; }
      if (!response.ok) throw Error();
      const data = await response.json() as { orders: CustomerOrder[] };
      setOrders(data.orders); setState('ready');
    } catch { if (!signal?.aborted) setState('error'); }
  }
  useEffect(() => {
    try { setId(new URLSearchParams(location.search).get('order') || localStorage.getItem('framy-payment-order') || ''); } catch {}
    const controller = new AbortController();
    void refresh(controller.signal);
    const timer = setInterval(() => { if (!document.hidden) void refresh(controller.signal); }, 30000);
    const onFocus = () => void refresh(controller.signal);
    window.addEventListener('focus', onFocus);
    return () => { controller.abort(); clearInterval(timer); window.removeEventListener('focus', onFocus); };
  }, []);
  const order = orders.find(o => o.id === id) || (!id && orders.length === 1 ? orders[0] : undefined);
  return <section className="panel">
    <h1>{t('Obrigado pela sua encomenda!')}</h1>
    {state === 'loading' && <p role="status">{t('A consultar o pagamento…')}</p>}
    {state === 'signin' && <><p>{t('Entre na sua conta para acompanhar a confirmação e o pedido.')}</p><a className="btn btn-primary" href={'/entrar?return_to=' + encodeURIComponent('/pagamento/retorno' + (id ? '?order=' + encodeURIComponent(id) : ''))}>{t('Entrar')}</a></>}
    {state === 'error' && <p role="alert">{t('Não foi possível consultar o pedido. Tente novamente.')}</p>}
    {state === 'ready' && order && <>
      <h2>{t(order.refunded ? 'Reembolsado' : order.status === 'CANCELLED' ? 'Pedido cancelado' : order.paid ? 'Pagamento confirmado' : 'A aguardar confirmação do pagamento')}</h2>
      {!order.paid && order.status !== 'CANCELLED' && <p>{t('A equipa irá verificar o pagamento. O regresso da Opsellio não confirma automaticamente a transacção.')}</p>}
      <p>{t('Referência: ')}{order.id}</p><p>{t(order.productName)}</p>
      <p>{t('Estado do pedido')}: {t(orderLabels[order.status])}</p>
      <OrderProgressLine order={order}/><AgentContact order={order}/>
      <a className="btn btn-primary" href={'/dashboard?order=' + encodeURIComponent(order.id)}>{t('Acompanhar o pedido')}</a>
    </>}
    {state === 'ready' && !order && <><p>{t('Escolha a encomenda que acabou de pagar.')}</p>{orders.map(o => <p key={o.id}><button className="btn" onClick={() => setId(o.id)}>{t(o.productName)} · {o.id.slice(0,8)} · {t(orderLabels[o.status])}</button></p>)}<a href="/dashboard">{t('O meu pedido')}</a></>}
    {state !== 'signin' && <p><button className="btn" onClick={() => void refresh()}>{t('Actualizar')}</button></p>}
  </section>;
}
