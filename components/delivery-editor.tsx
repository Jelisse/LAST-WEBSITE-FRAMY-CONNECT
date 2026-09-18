'use client';
import { useI18n } from '@/components/language-provider';

import type { CustomerOrder as SandboxOrder } from '@/lib/customer-order';
import { useState } from 'react';

import { canEditDelivery } from '@/lib/delivery';
export function DeliveryEditor({
  order,
  onSaved,
}: {
  order: SandboxOrder;
  onSaved: () => Promise<void>;
}) {
  const { t } = useI18n();
  const [city, setCity] = useState(order.deliveryCity ?? ''),
    [address, setAddress] = useState(order.deliveryAddress ?? ''),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [notice, setNotice] = useState('');
  const editable = canEditDelivery(order);
  return (
    <section className="delivery-editor" aria-labelledby="delivery-heading">
      <h3 id="delivery-heading">{t('Onde pretende receber o produto?')}</h3>
      <p>
        {t(
          'Indique a cidade ou localidade para atribuirmos o agente da sua zona. Esta informação não aparece no seu perfil público.',
        )}
      </p>
      {editable ? (
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setError('');
            setNotice('');
            try {
              const r = await fetch('/api/workspace', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  action: 'update-delivery',
                  orderId: order.id,
                  version: order.version,
                  deliveryCity: city,
                  deliveryAddress: address,
                }),
              });
              const d = (await r.json()) as { error?: string };
              if (!r.ok) throw Error(d.error ?? 'Não foi possível guardar.');
              await onSaved();
              setNotice('Local de entrega guardado.');
            } catch (e) {
              setError(
                e instanceof Error ? e.message : 'Não foi possível guardar.',
              );
            } finally {
              setBusy(false);
            }
          }}
        >
          <fieldset disabled={busy}>
            <label htmlFor="delivery-city">
              {t('Cidade / localidade de entrega ')}
              <span>*</span>
            </label>
            <input
              id="delivery-city"
              name="deliveryCity"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              required
              minLength={2}
              maxLength={90}
              list="delivery-cities"
              placeholder={t(
                'Ex.: Maputo, Matola, Beira, Nhamatanda ou Chimoio',
              )}
              autoComplete="address-level2"
            />
            <datalist id="delivery-cities">
              {['Maputo', 'Matola', 'Beira', 'Nhamatanda', 'Chimoio'].map(
                (v) => (
                  <option key={v} value={v}>
                    {t(v)}
                  </option>
                ),
              )}
            </datalist>
            <label htmlFor="delivery-address">
              {t('Bairro, endereço ou ponto de referência ')}
              <small>{t('(opcional)')}</small>
            </label>
            <textarea
              id="delivery-address"
              name="deliveryAddress"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              maxLength={300}
              rows={2}
              placeholder={t(
                'Pode indicar apenas a cidade ou acrescentar detalhes.',
              )}
              autoComplete="street-address"
            />
            <button className="btn btn-primary" type="submit">
              {busy ? t('A guardar…') : t('Guardar local de entrega')}
            </button>
          </fieldset>
        </form>
      ) : (
        <>
          <strong>{order.deliveryCity || t('Local não indicado')}</strong>
          {order.deliveryAddress && <p>{order.deliveryAddress}</p>}
          <p>
            {t(
              'Para alterar o local de um pedido já atribuído, contacte a equipa.',
            )}
          </p>
        </>
      )}
      {error && <p role="alert">{t(error)}</p>}
      {notice && <output>{t(notice)}</output>}
    </section>
  );
}
