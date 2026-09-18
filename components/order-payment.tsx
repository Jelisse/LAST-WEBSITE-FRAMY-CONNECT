'use client';
import { useI18n } from '@/components/language-provider';

import { useEffect, useState } from 'react';
import { money } from '@/lib/catalog';
export function OrderPayment({ orderId }: { orderId: string }) {
  const { t } = useI18n();
  const [data, setData] = useState<{
      url: string | null;
      amount: number;
      status: string;
      paid: boolean;
      expiresAt?: string;
    } | null>(null),
    [error, setError] = useState('');
  useEffect(() => {
    const controller = new AbortController();
    void fetch('/api/payments?order=' + encodeURIComponent(orderId), {
      cache: 'no-store',
      signal: controller.signal,
    })
      .then(async (r) => {
        const d = (await r.json()) as NonNullable<typeof data> & {
          error?: string;
        };
        if (!r.ok) throw Error(d.error);
        setData(d);
      })
      .catch((e) => {
        if (!controller.signal.aborted) setError(e.message);
      });
    return () => controller.abort();
  }, [orderId]);
  if (error) return <p role="alert">{t(error)}</p>;
  if (!data) return <p>{t('A consultar o pagamento…')}</p>;
  if (data.paid) return <p>{t('Pagamento registado pela equipa.')}</p>;
  if (data.status !== 'PENDING_PAYMENT')
    return <p>{t('Este pedido já não aguarda pagamento.')}</p>;
  return (
    <section>
      <h3>{t('Pagamento do produto')}</h3>
      <p>
        {t('Referência da encomenda: ')}
        {orderId}
      </p>
      {data.url ? (
        <>
          <a
            className="btn btn-primary"
            href={data.url}
            target="_blank"
            rel="noopener noreferrer"
          >
            {t('Pagar ')}
            {money(data.amount, t.locale)}
            {t(' na Opsellio')}
          </a>
          <p>
            {t(
              'Guarde a referência da transacção e indique-a à equipa juntamente com a referência da encomenda. A equipa confirma o pagamento no prestador antes de iniciar a produção.',
            )}
          </p>
        </>
      ) : (
        <p>
          {t(
            'O pagamento online deste produto ainda não está configurado. Contacte a equipa antes de pagar.',
          )}
        </p>
      )}
      {data.expiresAt && (
        <p>
          {t('Reserva válida até')}{' '}
          {new Date(data.expiresAt).toLocaleString(t.locale, {
            timeZone: 'Africa/Maputo',
          })}{' '}
          {t(
            '(Maputo). Depois deste prazo, confirme a disponibilidade com a equipa antes de pagar.',
          )}
        </p>
      )}
      <a
        href={
          'mailto:support@framyconnect.co.mz?subject=' +
          encodeURIComponent('Pagamento da encomenda ' + orderId)
        }
      >
        {t('Contactar a equipa')}
      </a>
    </section>
  );
}
