'use client';
import { useState } from 'react';
import Link from '@/components/hard-link';
import { useI18n } from './language-provider';
import {
  purchaseFormats,
  purchaseSelection,
  cardMaterials,
  keychainMaterials,
  designServices,
  checkoutMaintenanceMessage,
} from '@/lib/purchase-structure';
import type { ManagedPlan } from '@/lib/domain';
import { planPrice, planAnnualMeticais } from '@/lib/plan-pricing';
import { money } from '@/lib/catalog';
import { hardwareEstimate, type HardwarePrice } from '@/lib/hardware-pricing';
import { PaySuiteCheckout } from './paysuite-checkout';
import type { CheckoutPricing } from '@/lib/checkout-pricing';
import { SourceImage } from './source-image';
import type { ProductPhoto } from '@/lib/product-gallery';

export function PurchaseConfigurator({
  initial = 'kit',
  plans,
  prices,
  photos = [],
  pricing = null,
  paymentAvailable = false,
}: {
  initial?: string;
  plans: ManagedPlan[];
  prices: HardwarePrice[];
  photos?: ProductPhoto[];
  pricing?: CheckoutPricing | null;
  paymentAvailable?: boolean;
}) {
  const { t } = useI18n();
  const selection = purchaseSelection(initial);
  const format = selection.format;
  const [card, setCard] = useState<string>(selection.card);
  const [keychain, setKeychain] = useState<string>(selection.keychain);
  const [design, setDesign] = useState('standard');
  const method = 'PDF vectorial';
  const [contact,setContact] = useState('');
  const [address,setAddress] = useState('');
  const [delivery,setDelivery] = useState('maputo');
  const [designInstructions,setDesignInstructions] = useState('');
  const selected = purchaseFormats.find((item) => item.id === format)!;
  const selectedDesign = designServices.find((item) => item.id === design)!;
  const estimate = hardwareEstimate(prices, format, card, keychain);
  const preview = [
    ...(format !== 'keychain' ? [card] : []),
    ...(format !== 'card' ? [keychain] : []),
  ];
  const designAmount = pricing ? design === 'standard' ? 0 : design === 'customer' ? pricing.customer_design : pricing.team_design : null;
  const total = estimate && designAmount !== null && pricing && delivery === 'maputo' ? estimate.amount + designAmount + pricing.maputo_delivery : null;
  return (
    <div className="purchase-configurator">
      {!paymentAvailable && <div className="purchase-maintenance">
        <strong>{t('Checkout em manutenção')}</strong>
        <p>{t(checkoutMaintenanceMessage)}</p>
        <p>
          {t(
            'Explore a nova configuração. Os preços e a disponibilidade serão confirmados antes da reabertura.',
          )}
        </p>
      </div>}
      <div className="purchase-layout">
        <div>
          <fieldset className="purchase-section">
            <legend>{t('1. Materiais')}</legend>
            <div className="purchase-materials">
              {format !== 'keychain' && (
                <label>
                  {t('Cartão')}
                  <select
                    value={card}
                    onChange={(e) => setCard(e.target.value)}
                  >
                    {cardMaterials.map((item) => (
                      <option key={item} value={item}>
                        {t(item)}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              {format !== 'card' && (
                <label>
                  {t('Porta-chaves')}
                  <select
                    value={keychain}
                    onChange={(e) => setKeychain(e.target.value)}
                  >
                    {keychainMaterials.map((item) => (
                      <option key={item} value={item}>
                        {t(item)}
                      </option>
                    ))}
                  </select>
                </label>
              )}
            </div>
          </fieldset>
          <fieldset className="purchase-section">
            <legend>{t('2. Design')}</legend>
            <div className="purchase-choices">
              {designServices.map((item) => (
                <label
                  className={`purchase-choice ${design === item.id ? 'is-selected' : ''}`}
                  key={item.id}
                >
                  <input
                    type="radio"
                    name="design"
                    checked={design === item.id}
                    onChange={() => setDesign(item.id)}
                  />
                  <strong>{t(item.name)}</strong>
                  <p>{t(item.description)}</p>
                </label>
              ))}
            </div>
            {design !== 'standard' && <label className="purchase-method">
              Instruções para o design
              <textarea value={designInstructions} onChange={e=>setDesignInstructions(e.target.value)} maxLength={2000} placeholder="Nome, cores e informações a incluir" />
              <small>Após o pedido, a equipa contacta-o para receber o PDF vectorial ou preparar o design. O editor online ainda não está disponível. A produção começa após a sua aprovação.</small>
            </label>}
          </fieldset>
          <section className="purchase-section">
            <h2>{t('3. Um perfil digital')}</h2>
            <p>
              {t(
                format === 'kit'
                  ? 'O cartão e o porta-chaves partilham o mesmo perfil. Não precisa de duas subscrições.'
                  : 'O produto escolhido liga ao seu perfil digital.',
              )}
            </p>
            <strong>{t('30 dias grátis · sem renovação automática')}</strong>
            <p>O pagamento do perfil é feito separadamente após os 30 dias grátis. As renovações requerem a sua autorização.</p>
            <details>
              <summary>{t('Comparar os planos futuros')}</summary>
              <div className="purchase-plan-list">
                {plans
                  .filter((plan) => plan.id !== 'free-30')
                  .map((plan) => (
                    <article key={plan.id}>
                      <strong>
                        {t(plan.name)} · {planPrice(plan, t.locale)}
                        {t('/mês')}
                      </strong>
                      <p>{planPrice({ meticais: planAnnualMeticais(plan) }, t.locale)}{t(' / ano')} · {paymentAvailable ? 'Pagamento anual' : t('Pagamento anual · adesões em breve')}</p>
                      <p>
                        {t('Por perfil · mensal')} · {t('Em breve')}
                      </p>
                      <p>
                        {plan.links} {t('links à sua escolha')} ·{' '}
                        {t('Bio: {0} caracteres', [plan.bio])}
                      </p>
                    </article>
                  ))}
                <article>
                  <strong>{t('Corporativo')}</strong>
                  <p>{t('Sob consulta')}</p>
                  <Link href="/contacto">{t('Solicitar proposta')}</Link>
                </article>
              </div>
            </details>
          </section>
          <section className="purchase-section">
            <h2>4. Entrega</h2>
            <label>Local de entrega<select value={delivery} onChange={e=>setDelivery(e.target.value)}><option value="maputo">Cidade de Maputo</option><option value="other">Outra localidade — sob consulta</option></select></label>
            {delivery === 'other' ? <p><Link href="/contacto">Solicitar proposta de entrega</Link></p> : <>
              <label>Contacto de entrega<input value={contact} onChange={e=>setContact(e.target.value)} maxLength={50} autoComplete="tel" /></label>
              <label>Morada e ponto de referência<textarea value={address} onChange={e=>setAddress(e.target.value)} maxLength={300} autoComplete="street-address" /></label>
            </>}
          </section>
        </div>
        <aside
          className="configuration-summary"
          aria-label={t('A sua configuração')}
        >
          <h2>{t('A sua configuração')}</h2>
          <div className="configuration-photos">
            {preview.map((material) => {
              const photo = photos.find((item) => item.material === material);
              return <figure key={material}>
                {photo ? <SourceImage src={photo.src} alt={t(material)} width={240} height={240} />
                  : <span>{t('Fotografia do produto em preparação')}</span>}
                <figcaption>{t(material)}</figcaption>
              </figure>;
            })}
          </div>
          <div aria-live="polite">
            <h3>{t(selected.name)}</h3>
            {format !== 'keychain' && (
              <p>
                {t('Cartão')}: {t(card)}
              </p>
            )}
            {format !== 'card' && (
              <p>
                {t('Porta-chaves')}: {t(keychain)}
              </p>
            )}
            <p>
              {t(selectedDesign.name)}
              {design === 'customer' ? ` · ${t(method)}` : ''}
            </p>
            <p>{t('Um perfil digital')}</p>
          </div>
          <hr />
          <p>
            <strong>{t('Produtos · pagamento único')}</strong>
            <br />
            <span aria-live="polite">
              {estimate
                ? money(estimate.amount, t.locale)
                : t('Preço a confirmar')}
            </span>
          </p>
          {!!estimate?.saving && (
            <p>
              {t('Poupa {0} face aos produtos separados.', [
                money(estimate.saving, t.locale),
              ])}
            </p>
          )}
          <p>Design: {designAmount === null ? 'Sob consulta' : money(designAmount,t.locale)}</p>
          <p>Entrega: {pricing && delivery === 'maputo' ? money(pricing.maputo_delivery,t.locale) : 'Sob consulta'}</p>
          <p><strong>Total do produto: {total === null ? 'Sob consulta' : money(total,t.locale)}</strong></p>
          <p>Perfil digital: 30 dias grátis. Subscrição paga separadamente após a experiência.</p>
          {!paymentAvailable && <p>Valores propostos, sujeitos a publicação pelo gestor. Pagamentos ainda indisponíveis.</p>}
          <PaySuiteCheckout key={`${format}-${card}-${keychain}-${design}-${delivery}-${total}`} disabled={!paymentAvailable || total === null || contact.trim().length < 7 || address.trim().length < 8}
            payload={{kind:'product',format,card,keychain,design,delivery,contact,address,designInstructions,expectedAmount:total,pricingVersion:pricing?.version}} />
          <Link href="/dashboard">{t('Acompanhar o pedido')}</Link>
        </aside>
      </div>
    </div>
  );
}
