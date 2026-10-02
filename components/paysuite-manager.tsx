'use client';
import { useI18n } from '@/components/language-provider';
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
  const { t } = useI18n();
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
      <h1>{t('Checkout e pagamentos PaySuite')}</h1>
      <Link href="/manager">{t('Voltar ao gestor')}</Link>
      {error && <p role="alert">{t(error)}</p>}
      {data && (
        <>
          <p>
            {t(
              data.ready
                ? 'Ligação configurada.'
                : 'Ligação por configurar: segredos e activação no Cloudflare.',
            )}
          </p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              void act({
                action: 'pricing',
                maputo_delivery: data.pricing.maputo_delivery,
                version: data.pricing.version,
                enabled: f.has('enabled'),
                ...Object.fromEntries(
                  ['customer_design', 'team_design'].map((k) => [
                    k,
                    Math.round(Number(f.get(k)) * 100),
                  ]),
                ),
              });
            }}
          >
            <h2>{t('Preços de configuração')}</h2>
            <p>
              {t(
                ' Valores por encomenda, em MT. Design padrão incluído. Configure os pontos e as tarifas em Produtos → Levantamento e entregas. ',
              )}
            </p>
            {(
              [
                ['customer_design', 'Design do cliente'],
                ['team_design', 'Design pela equipa'],
              ] as const
            )

              .map(([key, label]) => (
                <label key={key}>
                  {t(label)}
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
              {t(' Publicar estes preços e abrir pagamentos de produtos ')}
            </label>
            <button disabled={busy}>{t('Guardar preços')}</button>
          </form>
          <h2>{t('Pedidos e pagamentos')}</h2>
          {data.payments.map((p) => {
            const c = p.configuration_json
              ? JSON.parse(p.configuration_json)
              : null;
            return (
              <article key={p.id} className="growth-invoice">
                <h3>
                  {p.name} · {(p.amount / 100).toFixed(2)} {t(' MT ')}
                </h3>
                <p>
                  {p.email} · {p.status} · {p.id}
                </p>
                {p.receipt_status && (
                  <p>
                    {t(' Comprovativo por email:')}{' '}
                    {t(
                      p.receipt_status === 'sent'
                        ? 'aceite pelo serviço de email'
                        : p.receipt_status === 'review'
                          ? 'requer verificação no Resend antes de reenviar'
                          : 'a aguardar envio',
                    )}
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
                    {c.pvcModel && (
                      <p>
                        {t('Modelo PVC + epóxi: ')}
                        {c.pvcModel.name}
                      </p>
                    )}
                    {c.leather && (
                      <div>
                        <strong>{t('Porta-chaves de couro')}</strong>
                        <p>
                          {t(' Cor:')}{' '}
                          {t(
                            c.leather.color === 'brown' ? 'Castanho' : 'Preto',
                          )}{' '}
                          {t(' · Frente:')}{' '}
                          {t(
                            c.design === 'standard'
                              ? c.leather.logo === 'full'
                                ? 'Logo completo'
                                : 'Símbolo F'
                              : c.design === 'customer'
                                ? 'Logo do cliente'
                                : 'Design pela equipa',
                          )}
                        </p>
                        <p>{c.leatherDimensions}</p>
                        {c.leather.assetId && (
                          <>
                            <a href={'/api/design-assets/' + c.leather.assetId}>
                              {t(' Descarregar logótipo: ')}
                              {c.leather.fileName}
                            </a>
                            <p>
                              {t(' Página ')}
                              {c.leather.page} {t(' · Escala ')}
                              {c.leather.scale}
                              {t(' % · X ')}
                              {c.leather.x} {t(' · Y ')}
                              {c.leather.y}
                            </p>
                          </>
                        )}
                      </div>
                    )}
                    {c.fulfilment && (
                      <p>
                        {t(' Recepção:')}{' '}
                        {t(
                          c.fulfilment.mode === 'pickup'
                            ? 'Levantamento · ' +
                                c.fulfilment.point?.name +
                                ' · ' +
                                c.fulfilment.point?.hours
                            : c.fulfilment.mode === 'express'
                              ? 'Entrega expressa'
                              : 'Entrega normal',
                        )}
                      </p>
                    )}
                    <p>
                      {t(' Perfil:')}{' '}
                      {c.profileUsername ||
                        'A aguardar configuração pelo cliente'}
                    </p>
                    <p>
                      {t(' Produtos: ')}
                      {c.hardware / 100} {t(' MT · Design:')}{' '}
                      {c.customization / 100} {t(' MT · Entrega: ')}
                      {c.delivery / 100} {t(' MT ')}
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
                        {t(' ID PaySuite para reconciliação ')}
                        <input name="providerId" required />
                      </label>
                    )}
                    <button disabled={busy}>
                      {t('Verificar no prestador')}
                    </button>
                  </form>
                )}
                {p.order_status === 'paid' && (
                  <button
                    disabled={busy || !c?.profileUsername}
                    onClick={() => void act({ action: 'fulfilled', id: p.id })}
                  >
                    {t(' Confirmar entrega ao cliente ')}
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
