'use client';
import { useI18n } from '@/components/language-provider';

import { CorporatePlan } from './corporate-plan';
import { planPrice } from '@/lib/plan-pricing';

import { SourceImage } from '@/components/source-image';
import { useState, useEffect } from 'react';
import Link from '@/components/hard-link';
import { money, type PublicProduct } from '@/lib/catalog';
import {
  blankProfile,
  usernameFromName,
  validateProfile,
  validatePlanContent,
  type Profile,
  type ManagedPlan,
} from '@/lib/domain';
import { validateDelivery } from '@/lib/delivery';
import { MobileProfile } from './mobile-profile';
import { IPhonePreview } from './iphone-preview';
import { ProfilePhotoUpload } from './profile-photo-upload';
import { ProfileLinksEditor } from './profile-links-editor';
import { OrderPayment } from './order-payment';
import { ProductDesigner } from './product-designer';
import { artworkFile } from '@/lib/artwork-storage';
import {
  FREE_PLAN_ID,
  supportsDesign,
  blankOption,
  keychainChoices,
  type ProductDesign,
} from '@/lib/customisation';
type Data = {
  profile: Profile | null;
  profileVersion: number;
  orders: import('@/lib/customer-order').CustomerOrder[];
  membership: { version: number; planId: string; terms: ManagedPlan };
};
const steps = ['Produto', 'Plano', 'Conta', 'Perfil', 'Entrega', 'Confirmar'];
export function OrderSubmission({
  product,
  plans,
  account,
}: {
  product: PublicProduct;
  plans: ManagedPlan[];
  account: { id: string; name: string } | null;
}) {
  const { t } = useI18n();
  const key = 'framy-checkout:' + (account?.id ?? 'visitor') + ':' + product.id;
  const [step, setStep] = useState(0),
    [planId, setPlanId] = useState(FREE_PLAN_ID),
    [profile, setProfile] = useState<Profile>(blankProfile),
    [city, setCity] = useState(''),
    [address, setAddress] = useState(''),
    [contact, setContact] = useState(''),
    [data, setData] = useState<Data | null>(null),
    [busy, setBusy] = useState(false),
    [uploading, setUploading] = useState(false),
    [error, setError] = useState(''),
    [ready, setReady] = useState(false),
    [approved, setApproved] = useState(false),
    [orderId, setOrderId] = useState(''),
    [done, setDone] = useState(false);
  const [design, setDesign] = useState<ProductDesign>({
    ...(product.category === 'Cartões'
      ? { cardTheme: 'navy-gold' as const, editorVersion: 2 }
      : {}),
    optionId: product.id === 'keychain' ? 'tiktok' : blankOption(product),
  });
  const plan = plans.find((p) => p.id === planId);
  async function load() {
    const r = await fetch('/api/workspace', { cache: 'no-store' });
    if (!r.ok) throw Error('Inicie sessão novamente para continuar.');
    const d = (await r.json()) as Data;
    setData(d);
    return d;
  }
  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const raw =
          sessionStorage.getItem(key) ??
          sessionStorage.getItem('framy-checkout:visitor:' + product.id);
        const saved = raw ? JSON.parse(raw) : null;
        const d = account ? await load() : null;
        if (!active) return;
        if (saved?.design) {
          const restored = saved.design;
          if (
            product.category === 'Cartões' &&
            restored.editorVersion !== 2 &&
            !saved.done
          ) {
            // Start the new editor without the previously uploaded preview logos.
            if (!restored.front?.name?.toLowerCase().endsWith('.pdf'))
              restored.front = undefined;
            if (!restored.back?.name?.toLowerCase().endsWith('.pdf'))
              restored.back = undefined;
            restored.editorVersion = 2;
          }
          setDesign(restored);
        }
        setProfile(saved?.profile ?? d?.profile ?? blankProfile);
        setCity(saved?.city ?? '');
        setAddress(saved?.address ?? '');
        setContact(saved?.contact ?? '');
        setOrderId(saved?.orderId ?? crypto.randomUUID());
        setDone(
          !!(saved?.orderId && d?.orders.some((o) => o.id === saved.orderId)),
        );
        setPlanId(FREE_PLAN_ID);
        setStep(
          Math.min(
            saved?.step ??
              (account &&
              sessionStorage.getItem('framy-purchase-plan:' + product.id)
                ? 3
                : 0),
            account ? 5 : 2,
          ),
        );
      } catch {
        if (active)
          setError(
            'Não foi possível recuperar o progresso. Actualize para tentar novamente.',
          );
      } finally {
        if (active) setReady(true);
      }
    })();
    return () => {
      active = false;
    };
  }, [key, product.id, product.category, account]);
  useEffect(() => {
    if (!ready) return;
    try {
      sessionStorage.setItem('framy-purchase-plan:' + product.id, planId);
      if (account)
        sessionStorage.setItem(
          key,
          JSON.stringify({
            step,
            planId,
            profile,
            city,
            address,
            contact,
            orderId,
            done,
            design,
          }),
        );
      else
        sessionStorage.setItem(
          key,
          JSON.stringify({ step, planId, orderId, design }),
        );
    } catch {
      /* Storage may be disabled; in-memory checkout remains available. */
    }
  }, [
    ready,
    design,
    step,
    planId,
    profile,
    city,
    address,
    contact,
    orderId,
    done,
    key,
    product.id,
    account,
  ]);
  async function post(body: Record<string, unknown>) {
    const r = await fetch('/api/workspace', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const v = (await r.json()) as { error?: string; id?: string };
    if (!r.ok) throw Error(v.error ?? 'Não foi possível continuar.');
    return v;
  }
  async function next() {
    setError('');
    setBusy(true);
    try {
      if (step === 0 && supportsDesign(product)) {
        const r = await fetch('/api/product-options', { cache: 'no-store' });
        const d = (await r.json()) as {
          error?: string;
          options: { id: string; enabled: number; quantity: number }[];
        };
        if (!r.ok) throw Error(d.error);
        if (
          !d.options.some(
            (o: { id: string; enabled: number; quantity: number }) =>
              o.id === design.optionId && o.enabled && o.quantity > 0,
          )
        )
          throw Error(
            'Modelo indisponível. Escolha outro modelo ou actualize a página.',
          );
        if (design.optionId === 'blank-keychain' && !design.front)
          throw Error('Adicione o seu logótipo ou design PDF.');
      }
      if (step === 1 && (!plan || plan.id !== FREE_PLAN_ID))
        throw Error('Escolha um plano disponível.');
      if (step === 2 && !account)
        throw Error('Inicie sessão para guardar o seu perfil.');
      if (step === 3) {
        if (!plan || !data) throw Error('Escolha um plano e inicie sessão.');
        const p = validateProfile({
          ...profile,
          username: profile.username || usernameFromName(profile.name),
        });
        if (product.category === 'Cartões' && !p.email)
          throw Error('Indique o email a imprimir no cartão.');
        validatePlanContent(p, plan);
        if (
          data.membership.version === 0 ||
          data.membership.planId !== plan.id ||
          data.membership.terms.version !== plan.version
        ) {
          await post({
            action: 'activate-sandbox-plan',
            planId: plan.id,
            planVersion: plan.version,
            version: data.membership.version,
          });
          await load();
        }
        await post({
          action: 'save-profile',
          profile: p,
          autoUsername: !data.profileVersion,
          version: data.profileVersion,
        });
        const d = await load();
        setProfile(d.profile!);
        setApproved(false);
      }
      if (step === 4) {
        validateDelivery({ deliveryCity: city, deliveryAddress: address });
        if (contact.trim().length < 6)
          throw Error('Indique um contacto para a entrega.');
      }
      setStep(Math.min(step + 1, 5));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Tente novamente.');
    } finally {
      setBusy(false);
    }
  }
  async function finish() {
    setError('');
    setBusy(true);
    try {
      if (!approved || !data || !plan)
        throw Error('Aprove o perfil e as condições antes de confirmar.');
      const latest = await load();
      const savedDesign = { ...design };
      if (supportsDesign(product))
        for (const side of ['front', 'back'] as const) {
          const a = savedDesign[side];
          if (!a || a.assetId) continue;
          const file = await artworkFile(a.fileKey);
          if (!file)
            throw Error('Volte ao produto e carregue novamente o ficheiro.');
          const r = await fetch('/api/design-assets', {
            method: 'POST',
            headers: { 'Content-Type': file.type },
            body: file,
          });
          const uploaded = (await r.json()) as { error?: string; id: string };
          if (!r.ok) throw Error(uploaded.error);
          savedDesign[side] = { ...a, assetId: uploaded.id };
        }
      setDesign(savedDesign);
      await post({
        design: supportsDesign(product) ? savedDesign : undefined,
        action: 'submit-order',
        id: orderId,
        productId: product.id,
        checkout: true,
        approveProfile: true,
        planId: plan.id,
        planVersion: plan.version,
        profileVersion: latest.profileVersion,
        deliveryContact: contact,
        ...validateDelivery({ deliveryCity: city, deliveryAddress: address }),
      });
      setDone(true);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Não foi possível confirmar.');
      await load().catch(() => {});
    } finally {
      setBusy(false);
    }
  }
  if (!ready) return <output>{t('A recuperar o seu percurso…')}</output>;
  if (done)
    return (
      <section className="panel">
        <h1>{t('Pedido registado.')}</h1>
        <p>
          {t('Referência: ')}
          {orderId}
        </p>
        <p>
          {t(
            'O produto, plano, perfil e local de entrega estão associados ao seu pedido. Nenhuma cobrança foi efectuada. O pagamento continua pendente.',
          )}
        </p>
        <OrderPayment orderId={orderId} />
        <button
          className="btn"
          onClick={() => {
            sessionStorage.removeItem(key);
            setOrderId(crypto.randomUUID());
            setDone(false);
            setApproved(false);
            setStep(0);
          }}
        >
          {t('Fazer outra encomenda')}
        </button>
        <Link className="btn btn-primary" href={'/dashboard?order=' + orderId}>
          {t('Acompanhar o pedido')}
        </Link>
        <Link className="btn" href={'/' + profile.username}>
          {t('Abrir o meu perfil')}
        </Link>
      </section>
    );
  return (
    <div className="purchase-flow">
      <h1>{t('O seu próximo toque.')}</h1>
      <p className="muted">
        {step === 0 ? t('Escolha o modelo ou crie o seu design. ') : ''}
        {account
          ? t('O progresso fica guardado durante esta sessão do navegador.')
          : t('Pode guardar a sua escolha e continuar com a conta.')}
      </p>
      <ol className="purchase-steps">
        {steps.map((s, i) => (
          <li key={t(s)} aria-current={step === i ? 'step' : undefined}>
            <button
              disabled={busy || i > step}
              onClick={() => {
                setStep(i);
                setError('');
              }}
            >
              {i + 1}. {t(s)}
            </button>
          </li>
        ))}
      </ol>
      <div className="purchase-layout">
        <section className="panel">
          <h2>{t(steps[step])}</h2>
          {step === 0 && (
            <>
              <h3>{t(product.name)}</h3>
              <p>{t(product.description)}</p>
              <strong>
                {money(product.amount, t.locale)}
                {t(' · 1 unidade')}
              </strong>
              <p>{t('Preço do produto físico. Entrega a confirmar.')}</p>
              {supportsDesign(product) ? (
                <ProductDesigner
                  product={product}
                  design={design}
                  onChange={setDesign}
                  profile={profile}
                  onBusy={setUploading}
                />
              ) : (
                <SourceImage
                  className="purchase-product"
                  src={product.imageUrl}
                  alt={t(product.name)}
                />
              )}
              <Link href="/produtos">{t('Escolher outro produto')}</Link>
            </>
          )}
          {step === 1 && (
            <>
              <p>
                {t(
                  'Comece com 30 dias grátis. Os restantes planos estão em breve disponíveis.',
                )}
              </p>
              <div className="purchase-plans">
                {plans.map((p) => (
                  <label key={p.id}>
                    <input
                      type="radio"
                      name="plan"
                      disabled={p.id !== FREE_PLAN_ID}
                      checked={planId === p.id}
                      onChange={() => setPlanId(p.id)}
                    />
                    <strong>
                      {p.id === FREE_PLAN_ID
                        ? t('30 dias grátis · 0 MT')
                        : t('{0} · {1}/mês · Em breve', [
                            t(p.name),
                            planPrice(p, t.locale),
                          ])}
                    </strong>
                    <span>
                      {t('Até ')}
                      {p.links}
                      {t(' links · ')}
                      {t(p.description)}
                    </span>
                  </label>
                ))}
              </div>
              <CorporatePlan />
            </>
          )}
          {step === 2 &&
            (account ? (
              <p>
                {t('Ligado como ')}
                <strong>{account.name}</strong>
                {t('. O perfil e o pedido ficam associados à sua conta.')}
              </p>
            ) : (
              <>
                <p>
                  {t(
                    'Guarde o seu perfil e acompanhe o pedido com acesso seguro.',
                  )}
                </p>
                <a
                  className="btn btn-primary"
                  href={
                    '/entrar?return_to=' +
                    encodeURIComponent('/encomendar/' + product.id)
                  }
                >
                  {t('Entrar')}
                </a>
                <a
                  className="btn btn-outline"
                  href={
                    '/entrar?mode=register&return_to=' +
                    encodeURIComponent('/encomendar/' + product.id)
                  }
                >
                  {t('Criar conta')}
                </a>
                <p>
                  {t(
                    'Entre ou crie uma conta com email e palavra-passe. A sua escolha de produto e plano será mantida no regresso.',
                  )}
                </p>
              </>
            ))}
          {step === 3 && plan && (
            <div className="purchase-profile">
              <div>
                <ProfilePhotoUpload
                  profile={profile}
                  disabled={busy}
                  onChange={setProfile}
                  onUploading={setUploading}
                />
                <label>
                  {t('Nome completo *')}
                  <input
                    value={profile.name}
                    onChange={(e) =>
                      setProfile({ ...profile, name: e.target.value })
                    }
                    maxLength={100}
                  />
                </label>
                <label>
                  {t('Profissão ou título (opcional)')}
                  <input
                    value={profile.title}
                    onChange={(e) =>
                      setProfile({ ...profile, title: e.target.value })
                    }
                  />
                </label>
                <p>
                  {t(
                    'O endereço será criado a partir do seu nome. Fotografia e links podem ser completados mais tarde.',
                  )}
                </p>
                {product.category === 'Cartões' && (
                  <label>
                    {t('Email a imprimir no cartão *')}
                    <input
                      type="email"
                      value={profile.email}
                      onChange={(e) =>
                        setProfile({ ...profile, email: e.target.value })
                      }
                      required
                    />
                    <small>{t('Este email será impresso no cartão.')}</small>
                  </label>
                )}
                <ProfileLinksEditor
                  profile={profile}
                  planId={plan.id}
                  terms={plan}
                  disabled={busy}
                  onChange={setProfile}
                  onUpgrade={() => setStep(1)}
                />
              </div>
              <IPhonePreview>
                <MobileProfile profile={profile} preview />
              </IPhonePreview>
            </div>
          )}
          {step === 4 && (
            <>
              <label>
                {t('Cidade / localidade de entrega *')}
                <input
                  required
                  minLength={2}
                  maxLength={90}
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder={t('Maputo, Matola, Beira, Nhamatanda…')}
                  autoComplete="address-level2"
                />
              </label>
              <label>
                {t('Bairro ou ponto de referência (opcional)')}
                <textarea
                  maxLength={300}
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  autoComplete="street-address"
                />
              </label>
              <label>
                {t('Telefone de contacto para entrega *')}
                <input
                  type="tel"
                  maxLength={40}
                  value={contact}
                  onChange={(e) => setContact(e.target.value)}
                  autoComplete="tel"
                />
              </label>
              <p>
                {t(
                  'Estes dados são privados e destinam-se à organização da entrega.',
                )}
              </p>
            </>
          )}
          {step === 5 && (
            <>
              <h3>{t('Confira antes de submeter')}</h3>
              <p>
                {profile.name} · /{profile.username}
              </p>
              <p>
                {t('Entrega: ')}
                {city}
                {address ? ' — ' + address : ''}
                <br />
                {t('Contacto: ')}
                {contact}
              </p>
              <p>
                {t('Produto: ')}
                <strong>{money(product.amount, t.locale)}</strong>
                {t(
                  '. O pedido fica a aguardar pagamento. O plano digital é gratuito durante 30 dias, sem renovação automática. Entrega a confirmar.',
                )}
              </p>
              {supportsDesign(product) && (
                <ProductDesigner
                  product={product}
                  design={design}
                  onChange={setDesign}
                  profile={profile}
                  readOnly
                  onBusy={setUploading}
                />
              )}
              <label className="purchase-consent">
                <input
                  type="checkbox"
                  checked={approved}
                  onChange={(e) => setApproved(e.target.checked)}
                />
                {t(
                  'Aprovo a publicação do meu perfil e do respectivo link para codificação e aprovo o modelo e o design de impressão apresentados.',
                )}
              </label>
            </>
          )}
          {error && <p role="alert">{t(error)}</p>}
          <div className="purchase-actions">
            {step > 0 && (
              <button
                className="btn"
                disabled={busy}
                onClick={() => setStep(step - 1)}
              >
                {t('Voltar')}
              </button>
            )}
            {step < 5 ? (
              <button
                className="btn btn-primary"
                disabled={busy || uploading || (step === 2 && !account)}
                onClick={next}
              >
                {busy ? t('A guardar…') : t('Guardar e continuar')}
              </button>
            ) : (
              <button
                className="btn btn-primary"
                disabled={busy || uploading || !approved}
                onClick={finish}
              >
                {busy ? t('A confirmar…') : t('Confirmar pedido')}
              </button>
            )}
          </div>
        </section>
        <aside className="panel purchase-summary">
          <h2>{t('O seu pedido')}</h2>
          <p>{t(product.name)}</p>
          <strong>{money(product.amount, t.locale)}</strong>
          {supportsDesign(product) && (
            <p>
              {t(
                keychainChoices.find((c) => c.id === design.optionId)?.name ??
                  'Personalizado',
              )}
            </p>
          )}
          {step > 0 && <p>{t('Plano: 30 dias grátis · 0 MT')}</p>}
          <p>{t('Entrega: a confirmar')}</p>
          <hr />
          <p>{t('Preço por unidade. A entrega é confirmada separadamente.')}</p>
          <Link href="/contacto">{t('Precisa de ajuda?')}</Link>
        </aside>
      </div>
    </div>
  );
}
