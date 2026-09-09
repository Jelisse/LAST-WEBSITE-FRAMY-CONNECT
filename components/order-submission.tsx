'use client';
import { useState, useRef } from 'react';
import Link from 'next/link';
import { money, type PublicProduct } from '@/lib/catalog';
import { validateDelivery } from '@/lib/delivery';
export function OrderSubmission({ product }: { product: PublicProduct }) {
  const [city, setCity] = useState(''),
    [address, setAddress] = useState(''),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  const requestId = useRef<string | null>(null);
  return (
    <section className="panel">
      <h1>Onde pretende receber o produto?</h1>
      <div className="order-submission-product">
        <img src={product.imageUrl} alt={product.name} />
        <div>
          <h2>{product.name}</h2>
          <strong>{money(product.amount)}</strong>
          <p>1 unidade</p>
        </div>
      </div>
      <p>
        Indique a cidade ou localidade antes de submeter. Assim podemos
        encaminhar o pedido para o agente da sua zona.
      </p>
      <p className="muted">
        Pedido de demonstração. Não será efectuada qualquer cobrança.
      </p>
      <form
        className="delivery-editor"
        onSubmit={async (e) => {
          e.preventDefault();
          setError('');
          setBusy(true);
          try {
            const delivery = validateDelivery({
              deliveryCity: city,
              deliveryAddress: address,
            });
            requestId.current ??= crypto.randomUUID();
            const response = await fetch('/api/workspace', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                action: 'submit-order',
                id: requestId.current,
                productId: product.id,
                ...delivery,
              }),
            });
            const result = (await response.json()) as {
              error?: string;
              id?: string;
            };
            if (!response.ok)
              throw Error(result.error ?? 'Não foi possível submeter.');
            window.location.assign(
              '/dashboard?order=' + encodeURIComponent(result.id!),
            );
          } catch (e) {
            setError(
              e instanceof Error ? e.message : 'Não foi possível submeter.',
            );
            setBusy(false);
          }
        }}
      >
        <fieldset disabled={busy}>
          <label htmlFor="submission-city">
            Cidade / localidade de entrega *
          </label>
          <input
            id="submission-city"
            value={city}
            required
            minLength={2}
            maxLength={90}
            list="submission-cities"
            autoComplete="address-level2"
            placeholder="Ex.: Maputo, Matola, Beira, Nhamatanda ou Chimoio"
            onChange={(e) => {
              setCity(e.target.value);
              requestId.current = null;
            }}
          />
          <datalist id="submission-cities">
            {['Maputo', 'Matola', 'Beira', 'Nhamatanda', 'Chimoio'].map((v) => (
              <option key={v} value={v} />
            ))}
          </datalist>
          <label htmlFor="submission-address">
            Bairro, endereço ou ponto de referência (opcional)
          </label>
          <textarea
            id="submission-address"
            maxLength={300}
            rows={3}
            value={address}
            autoComplete="street-address"
            onChange={(e) => {
              setAddress(e.target.value);
              requestId.current = null;
            }}
          />
          <small>Local privado, utilizado apenas para tratar a entrega.</small>
          {error && <p role="alert">{error}</p>}
          <button
            className="btn btn-primary"
            disabled={busy || city.trim().length < 2}
            type="submit"
          >
            {busy ? 'A submeter…' : 'Submeter pedido de demonstração'}
          </button>
          <Link href={'/produtos/' + product.id}>Voltar ao produto</Link>
        </fieldset>
      </form>
    </section>
  );
}
