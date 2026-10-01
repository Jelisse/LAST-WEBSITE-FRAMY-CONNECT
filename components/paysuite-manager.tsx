'use client';
import Link from '@/components/hard-link';
import { useEffect, useState } from 'react';
import type { CheckoutPricing } from '@/lib/checkout-pricing';
type Payment = {
  id: string;
  amount: number;
  status: string;
  name: string;
  email: string;
  provider_id: string | null;
  configuration_json: string | null;
  receipt_status?: string | null;
  order_status: string | null;
};
export function PaySuiteManager() {
  const [data, setData] = useState<{
      ready: boolean;
      pricing: CheckoutPricing;
      payments: Payment[];
    } | null>(null),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false);
  async function load() {
    const r = await fetch('/api/paysuite/manager', { cache: 'no-store' });
    const d = (await r.json()) as {
      ready: boolean;
      pricing: CheckoutPricing;
      payments: Payment[];
      error?: string;
    };
    if (!r.ok) throw Error(d.error);
    setData(d);
  }
  useEffect(() => {
    void Promise.resolve()
      .then(() => load())
      .catch((e) => setError(e.message));
  }, []);
  async function act(body: object) {
    setBusy(true);
    setError('');
    try {
      const r = await fetch('/api/paysuite/manager', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const d = (await r.json()) as { error?: string };
      if (!r.ok) throw Error(d.error);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro');
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="panel">
      <h1>Checkout e pagamentos PaySuite</h1>
      <Link href="/manager">Voltar ao gestor</Link>
      {error && <p role="alert">{error}</p>}
      {data && (
        <>
          <p>
            {data.ready
              ? 'Ligação configurada.'
              : 'Ligação por configurar: segredos e activação no Cloudflare.'}
          </p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              void act({
                action: 'pricing',
                version: data.pricing.version,
                enabled: f.has('enabled'),
                ...Object.fromEntries(
                  ['customer_design', 'team_design', 'maputo_delivery'].map(
                    (k) => [k, Math.round(Number(f.get(k)) * 100)],
                  ),
                ),
              });
            }}
          >
            <h2>Preços de configuração</h2>
            <p>
              Valores por encomenda, em MT. Design padrão incluído. Entregas
              fora da cidade de Maputo requerem proposta.
            </p>
            {(
              [
                ['customer_design', 'Design do cliente'],
                ['team_design', 'Design pela equipa'],
                ['maputo_delivery', 'Entrega na cidade de Maputo'],
              ] as const
            ).map(([key, label]) => (
              <label key={key}>
                {label}
                <input
                  key={`${key}-${data.pricing.version}`}
                  type="number"
                  min="0"
                  max="100000"
                  step="0.01"
                  required
                  name={key}
                  defaultValue={data.pricing[key] / 100}
                />
              </label>
            ))}
            <label>
              <input
                type="checkbox"
                name="enabled"
                defaultChecked={!!data.pricing.enabled}
              />
              Publicar estes preços e abrir pagamentos de produtos
            </label>
            <button disabled={busy}>Guardar preços</button>
          </form>
          <h2>Pedidos e pagamentos</h2>
          {data.payments.map((p) => {
            const c = p.configuration_json
              ? JSON.parse(p.configuration_json)
              : null;
            return (
              <article key={p.id} className="growth-invoice">
                <h3>
                  {p.name} · {(p.amount / 100).toFixed(2)} MT
                </h3>
                <p>
                  {p.email} · {p.status} · {p.id}
                </p>
                {p.receipt_status && (
                  <p>
                    Comprovativo por email:{' '}
                    {p.receipt_status === 'sent'
                      ? 'aceite pelo serviço de email'
                      : p.receipt_status === 'review'
                        ? 'requer verificação no Resend antes de reenviar'
                        : 'a aguardar envio'}
                  </p>
                )}
                {c && (
                  <>
                    <p>
                      {c.format} · {c.card} · {c.keychain} · {c.design}
                    </p>
                    <p>
                      {c.city} · {c.address} · {c.contact}
                    </p>
                    <p>{c.designInstructions}</p>
                    <p>
                      Perfil:{' '}
                      {c.profileUsername ||
                        'A aguardar configuração pelo cliente'}
                    </p>
                    <p>
                      Produtos: {c.hardware / 100} MT · Design:{' '}
                      {c.customization / 100} MT · Entrega: {c.delivery / 100}{' '}
                      MT
                    </p>
                  </>
                )}
                {p.status !== 'paid' && (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      void act({
                        action: 'reconcile',
                        id: p.id,
                        providerId: new FormData(e.currentTarget).get(
                          'providerId',
                        ),
                      });
                    }}
                  >
                    {!p.provider_id && (
                      <label>
                        ID PaySuite para reconciliação
                        <input name="providerId" required />
                      </label>
                    )}
                    <button disabled={busy}>Verificar no prestador</button>
                  </form>
                )}
                {p.order_status === 'paid' && (
                  <button
                    disabled={busy || !c?.profileUsername}
                    onClick={() => void act({ action: 'fulfilled', id: p.id })}
                  >
                    Confirmar entrega ao cliente
                  </button>
                )}
              </article>
            );
          })}
        </>
      )}
    </section>
  );
}
