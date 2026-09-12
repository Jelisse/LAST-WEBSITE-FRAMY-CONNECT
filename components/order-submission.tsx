'use client';
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
type Data = {
  profile: Profile | null;
  profileVersion: number;
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
  const key = 'framy-checkout:' + (account?.id ?? 'visitor') + ':' + product.id;
  const [step, setStep] = useState(0),
    [planId, setPlanId] = useState(plans[0]?.id ?? ''),
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
    (async () => {
      try {
        const raw = localStorage.getItem(key);
        const saved = raw ? JSON.parse(raw) : null;
        const d = account ? await load() : null;
        if (!active) return;
        setProfile(saved?.profile ?? d?.profile ?? blankProfile);
        setCity(saved?.city ?? '');
        setAddress(saved?.address ?? '');
        setContact(saved?.contact ?? '');
        setOrderId(saved?.orderId ?? crypto.randomUUID());
        setDone(saved?.done === true);
        setPlanId(
          saved?.planId ??
            sessionStorage.getItem('framy-purchase-plan:' + product.id) ??
            plans[0]?.id ??
            '',
        );
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
  }, [key]);
  useEffect(() => {
    if (!ready) return;
    try {
      sessionStorage.setItem('framy-purchase-plan:' + product.id, planId);
      if (account)
        localStorage.setItem(
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
          }),
        );
      else localStorage.setItem(key, JSON.stringify({ step, planId, orderId }));
    } catch {
      /* Storage may be disabled; in-memory checkout remains available. */
    }
  }, [
    ready,
    step,
    planId,
    profile,
    city,
    address,
    contact,
    orderId,
    done,
    key,
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
      if (step === 1 && !plan) throw Error('Escolha um plano disponível.');
      if (step === 2 && !account)
        throw Error('Inicie sessão para guardar o seu perfil.');
      if (step === 3) {
        if (!plan || !data) throw Error('Escolha um plano e inicie sessão.');
        const p = validateProfile({
          ...profile,
          username: profile.username || usernameFromName(profile.name),
        });
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
      await post({
        action: 'publish-profile',
        profile,
        version: data.profileVersion,
      });
      const latest = await load();
      await post({
        action: 'submit-order',
        id: orderId,
        productId: product.id,
        checkout: true,
        planId: plan.id,
        planVersion: plan.version,
        profileVersion: latest.profileVersion,
        deliveryContact: contact,
        ...validateDelivery({ deliveryCity: city, deliveryAddress: address }),
      });
      setDone(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Não foi possível confirmar.');
      await load().catch(() => {});
    } finally {
      setBusy(false);
    }
  }
  if (!ready) return <p role="status">A recuperar o seu percurso…</p>;
  if (done)
    return (
      <section className="panel">
        <h1>Pedido de demonstração submetido.</h1>
        <p>Referência: {orderId}</p>
        <p>
          O produto, plano, perfil e local de entrega estão associados ao seu
          pedido. Nenhuma cobrança foi efectuada. O pagamento continua pendente.
        </p>
        <Link className="btn btn-primary" href={'/dashboard?order=' + orderId}>
          Acompanhar o pedido
        </Link>
        <Link className="btn" href={'/' + profile.username}>
          Abrir o meu perfil
        </Link>
      </section>
    );
  return (
    <div className="purchase-flow">
      <h1>O seu próximo toque.</h1>
      <p className="muted">
        Demonstração sem cobranças.{' '}
        {account
          ? 'O progresso fica guardado neste dispositivo.'
          : 'Escolha o produto e o plano antes de iniciar sessão.'}
      </p>
      <ol className="purchase-steps">
        {steps.map((s, i) => (
          <li key={s} aria-current={step === i ? 'step' : undefined}>
            <button
              disabled={busy || i > step}
              onClick={() => {
                setStep(i);
                setError('');
              }}
            >
              {i + 1}. {s}
            </button>
          </li>
        ))}
      </ol>
      <div className="purchase-layout">
        <section className="panel">
          <h2>{steps[step]}</h2>
          {step === 0 && (
            <>
              <img
                className="purchase-product"
                src={product.imageUrl}
                alt={product.name}
              />
              <h3>{product.name}</h3>
              <p>{product.description}</p>
              <strong>{money(product.amount)} · 1 unidade</strong>
              <p>
                Valor do produto físico, sem entrega ou subscrição. Condições
                comerciais a confirmar.
              </p>
              <Link href="/produtos">Escolher outro produto</Link>
            </>
          )}
          {step === 1 && (
            <>
              <p>
                Subscrição digital mensal, apresentada separadamente do produto.
              </p>
              <div className="purchase-plans">
                {plans.map((p) => (
                  <label key={p.id}>
                    <input
                      type="radio"
                      name="plan"
                      checked={planId === p.id}
                      onChange={() => setPlanId(p.id)}
                    />
                    <strong>
                      {p.name} · US$ {p.dollars}/mês
                    </strong>
                    <span>
                      Até {p.links} links · {p.description}
                    </span>
                  </label>
                ))}
              </div>
            </>
          )}
          {step === 2 &&
            (account ? (
              <p>
                Ligado como <strong>{account.name}</strong>. O perfil e o pedido
                ficam associados à sua conta.
              </p>
            ) : (
              <>
                <p>
                  Guarde o seu perfil e acompanhe o pedido com acesso seguro.
                </p>
                <a
                  className="btn btn-primary"
                  href={
                    '/entrar?return_to=' +
                    encodeURIComponent('/encomendar/' + product.id)
                  }
                >
                  Continuar com a conta
                </a>
                <p>
                  Entre ou crie uma conta com email e palavra-passe. A sua
                  escolha de produto e plano será mantida no regresso.
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
                  Nome completo *
                  <input
                    value={profile.name}
                    onChange={(e) =>
                      setProfile({ ...profile, name: e.target.value })
                    }
                    maxLength={100}
                  />
                </label>
                <label>
                  Profissão ou título (opcional)
                  <input
                    value={profile.title}
                    onChange={(e) =>
                      setProfile({ ...profile, title: e.target.value })
                    }
                  />
                </label>
                <p>
                  O endereço será criado a partir do seu nome. Fotografia e
                  links podem ser completados mais tarde.
                </p>
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
                Cidade / localidade de entrega *
                <input
                  required
                  minLength={2}
                  maxLength={90}
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="Maputo, Matola, Beira, Nhamatanda…"
                  autoComplete="address-level2"
                />
              </label>
              <label>
                Bairro ou ponto de referência (opcional)
                <textarea
                  maxLength={300}
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  autoComplete="street-address"
                />
              </label>
              <label>
                Telefone de contacto para entrega *
                <input
                  type="tel"
                  maxLength={40}
                  value={contact}
                  onChange={(e) => setContact(e.target.value)}
                  autoComplete="tel"
                />
              </label>
              <p>
                Estes dados são privados e destinam-se à organização da entrega.
              </p>
            </>
          )}
          {step === 5 && (
            <>
              <h3>Confira antes de submeter</h3>
              <p>
                {profile.name} · /{profile.username}
              </p>
              <p>
                Entrega: {city}
                {address ? ' — ' + address : ''}
                <br />
                Contacto: {contact}
              </p>
              <p>
                Hoje: <strong>sem cobrança</strong>. O pedido fica a aguardar
                pagamento. Entrega, moeda de liquidação e data de início da
                subscrição serão confirmadas antes de uma compra real.
              </p>
              <label className="purchase-consent">
                <input
                  type="checkbox"
                  checked={approved}
                  onChange={(e) => setApproved(e.target.checked)}
                />
                Aprovo a publicação do meu perfil e do respectivo link para
                codificação, e compreendo que este pedido e plano são de
                demonstração.
              </label>
            </>
          )}
          {error && <p role="alert">{error}</p>}
          <div className="purchase-actions">
            {step > 0 && (
              <button
                className="btn"
                disabled={busy}
                onClick={() => setStep(step - 1)}
              >
                Voltar
              </button>
            )}
            {step < 5 ? (
              <button
                className="btn btn-primary"
                disabled={busy || uploading || (step === 2 && !account)}
                onClick={next}
              >
                {busy ? 'A guardar…' : 'Guardar e continuar'}
              </button>
            ) : (
              <button
                className="btn btn-primary"
                disabled={busy || !approved}
                onClick={finish}
              >
                {busy ? 'A confirmar…' : 'Confirmar pedido de demonstração'}
              </button>
            )}
          </div>
        </section>
        <aside className="panel purchase-summary">
          <h2>O seu pedido</h2>
          <p>{product.name}</p>
          <strong>{money(product.amount)}</strong>
          <p>
            {plan
              ? `${plan.name} · US$ ${plan.dollars}/mês`
              : 'Escolha um plano'}
          </p>
          <p>Entrega: a confirmar</p>
          <hr />
          <p>
            Os valores em MT e USD são apresentados separadamente. Nenhum
            pagamento real está activo.
          </p>
          <Link href="/contacto">Precisa de ajuda?</Link>
        </aside>
      </div>
    </div>
  );
}
