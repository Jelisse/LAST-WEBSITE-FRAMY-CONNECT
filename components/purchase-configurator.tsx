'use client';
import { useState } from 'react';
import Link from '@/components/hard-link';
import { useI18n } from './language-provider';
import {
  purchaseFormats,
  purchaseFormat,
  cardMaterials,
  keychainMaterials,
  designServices,
  checkoutMaintenanceMessage,
} from '@/lib/purchase-structure';
import type { ManagedPlan } from '@/lib/domain';
import { planPrice } from '@/lib/plan-pricing';

export function PurchaseConfigurator({
  initial = 'kit',
  plans,
}: {
  initial?: string;
  plans: ManagedPlan[];
}) {
  const { t } = useI18n();
  const [format, setFormat] = useState(purchaseFormat(initial));
  const [card, setCard] = useState<string>(
    initial === 'wood' ? 'Madeira' : initial === 'metal' ? 'Metal' : 'PVC',
  );
  const [keychain, setKeychain] = useState<string>('PVC + epóxi');
  const [design, setDesign] = useState('standard');
  const [method, setMethod] = useState('PDF vectorial');
  const selected = purchaseFormats.find((item) => item.id === format)!;
  const selectedDesign = designServices.find((item) => item.id === design)!;
  return (
    <div className="purchase-configurator">
      <div className="purchase-maintenance">
        <strong>{t('Checkout em manutenção')}</strong>
        <p>{t(checkoutMaintenanceMessage)}</p>
        <p>
          {t(
            'Explore a nova configuração. Os preços e a disponibilidade serão confirmados antes da reabertura.',
          )}
        </p>
      </div>
      <div className="purchase-layout">
        <div>
          <fieldset className="purchase-section">
            <legend>{t('1. Escolha a sua solução')}</legend>
            <div className="purchase-choices">
              {purchaseFormats.map((item) => (
                <label
                  className={`purchase-choice ${format === item.id ? 'is-selected' : ''}`}
                  key={item.id}
                >
                  <input
                    type="radio"
                    name="format"
                    value={item.id}
                    checked={format === item.id}
                    onChange={() => setFormat(item.id)}
                  />
                  <strong>{t(item.name)}</strong>
                  {item.id === 'kit' && (
                    <span className="purchase-badge">{t('Recomendado')}</span>
                  )}
                  <p>{t(item.description)}</p>
                </label>
              ))}
            </div>
          </fieldset>
          <fieldset className="purchase-section">
            <legend>{t('2. Materiais')}</legend>
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
            <legend>{t('3. Design')}</legend>
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
            {design === 'customer' && (
              <label className="purchase-method">
                {t('Como pretende personalizar?')}
                <select
                  value={method}
                  onChange={(e) => setMethod(e.target.value)}
                >
                  <option value="PDF vectorial">{t('PDF vectorial')}</option>
                  <option value="Editor online">{t('Editor online')}</option>
                </select>
                <small>
                  {t(
                    'O envio de ficheiros e o editor estarão disponíveis no novo checkout.',
                  )}
                </small>
              </label>
            )}
            {design === 'team' && (
              <p>
                {t(
                  'O serviço terá um preço único, com briefing e aprovação antes da produção.',
                )}
              </p>
            )}
          </fieldset>
          <section className="purchase-section">
            <h2>{t('4. Um perfil digital')}</h2>
            <p>
              {t(
                'O cartão e o porta-chaves partilham o mesmo perfil. Não precisa de duas subscrições.',
              )}
            </p>
            <strong>{t('30 dias grátis · sem renovação automática')}</strong>
            <p>
              {t(
                'Enquanto os planos mensais não estiverem disponíveis, prolongamos o acesso sem cobrança.',
              )}
            </p>
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
        </div>
        <aside
          className="configuration-summary"
          aria-label={t('A sua configuração')}
        >
          <h2>{t('A sua configuração')}</h2>
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
            <strong>{t('Produtos e design')}</strong>
            <br />
            {t('Pagamento único · preço a confirmar')}
          </p>
          <p>
            <strong>{t('Subscrição digital')}</strong>
            <br />
            {t('30 dias grátis · sem renovação automática')}
          </p>
          <p>{t('Entrega e total apresentados antes do pagamento.')}</p>
          <button className="btn btn-primary" disabled>
            {t('Checkout em manutenção')}
          </button>
          <p>
            {t('Esta configuração não cria uma encomenda nem reserva stock.')}
          </p>
          <Link href="/dashboard">{t('Acompanhar o pedido')}</Link>
        </aside>
      </div>
    </div>
  );
}
