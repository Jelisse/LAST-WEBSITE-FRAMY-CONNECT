'use client';
import { refreshDashboard } from '@/lib/dashboard-refresh';
import { companyStepIssue } from '@/lib/form-journeys';
import { companyQuote, usdPrice } from '@/lib/launch-offers';
import { CorporateSidebar } from './corporate-sidebar';
import {
  Building2,
  Check,
  CreditCard,
  KeyRound,
  Save,
  Send,
} from 'lucide-react';
import { PhoneInput } from './phone-input';
import { useEffect, useState } from 'react';
import Link from './hard-link';
import { DashboardTools } from './mobile-navigation';
import { useI18n } from './language-provider';
type Details = {
  referenceUSD?: string;
  offer?: string;
  cycle?: string;
  company: string;
  people: number;
  phone: string;
  location: string;
  sector: string;
  teams: string;
  goals: string;
  products: string;
};
type SetupResponse = {
  error?: string;
  emailReady: boolean;
  request: null | {
    details_json: string;
    version: number;
    status: string;
    delivery: string;
  };
};
type SavedResponse = {
  error?: string;
  version: number;
  status: string;
  delivery: string;
};
const empty: Details = {
  company: '',
  offer: 'business',
  cycle: 'monthly',
  people: 3,
  phone: '',
  location: '',
  sector: '',
  teams: '',
  goals: '',
  products: '',
};
export function CorporateSetup({
  products = [],
  initialOffer = 'business',
}: {
  initialOffer?: 'business' | 'enterprise';
  products?: { id: string; name: string }[];
}) {
  const { t } = useI18n();
  const [companyStep, setCompanyStep] = useState(0);
  const changeCompanyStep = (step: number) => {
    setCompanyStep(step);
    requestAnimationFrame(() =>
      document
        .querySelector<HTMLElement>('.corporate-form-heading h2')
        ?.focus(),
    );
  };
  const nextCompanyStep = () => {
    const issue = companyStepIssue(companyStep, details);
    if (issue) {
      setError(issue);
      return;
    }
    setError('');
    changeCompanyStep(Math.min(3, companyStep + 1));
  };
  const [details, setDetails] = useState<Details>({
      ...empty,
      offer: initialOffer,
      people: initialOffer === 'enterprise' ? 51 : 3,
    }),
    [version, setVersion] = useState(0),
    [status, setStatus] = useState('draft'),
    [delivery, setDelivery] = useState('pending'),
    [ready, setReady] = useState(false),
    [emailReady, setEmailReady] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [notice, setNotice] = useState('');
  useEffect(() => {
    let stop = false;
    void fetch('/api/corporate-request', {
      cache: 'no-store',
      signal: AbortSignal.timeout(15000),
    })
      .then(async (r) => {
        const b = (await r.json()) as SetupResponse;
        if (!r.ok) throw Error(b.error);
        if (stop) return;
        if (b.request?.status === 'approved') {
          location.replace('/corporativo/equipa');
          return;
        }
        setEmailReady(b.emailReady);
        if (b.request) {
          setDetails(JSON.parse(b.request.details_json));
          setVersion(b.request.version);
          setStatus(b.request.status);
          setDelivery(b.request.delivery);
        }
        setReady(true);
      })
      .catch((e) => {
        if (!stop) setError(e.message);
      });
    return () => {
      stop = true;
    };
  }, []);
  useEffect(() => {
    if (!ready || status !== 'submitted' || busy) return;
    let stopped = false,
      running = false;
    const check = async () => {
      if (running || document.visibilityState !== 'visible') return;
      running = true;
      try {
        const r = await fetch('/api/corporate-request', {
          cache: 'no-store',
          signal: AbortSignal.timeout(12000),
        });
        const b = (await r.json()) as SetupResponse;
        if (stopped || !r.ok || !b.request) return;
        if (b.request.status === 'approved') {
          location.replace('/corporativo/equipa');
          return;
        }
        setStatus(b.request.status);
        setVersion(b.request.version);
        setDelivery(b.request.delivery);
      } catch {
        /* Keep the saved request visible and retry on focus or the next interval. */
      } finally {
        running = false;
      }
    };
    const timer = window.setInterval(() => void check(), 15000);
    const refresh = () => void check();
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', refresh);
    void check();
    return () => {
      stopped = true;
      window.clearInterval(timer);
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, [ready, status, busy]);
  const selectedOffer = details.offer;
  let quotation: ReturnType<typeof companyQuote> | null = null;
  try {
    if (selectedOffer)
      quotation = companyQuote(
        selectedOffer,
        details.people,
        details.cycle ?? 'monthly',
      );
  } catch {
    /* Render an invalid count for correction; server revalidates. */
  }
  async function save(action: 'save' | 'submit', confirmed: boolean) {
    if (busy) return;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const r = await fetch('/api/corporate-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...details, version, action, confirmed }),
        signal: AbortSignal.timeout(20000),
      });
      const b = (await r.json()) as SavedResponse;
      if (!r.ok) throw Error(b.error);
      setVersion(b.version);
      setStatus(b.status);
      setDelivery(b.delivery);
      setNotice(
        action === 'save'
          ? 'Rascunho guardado.'
          : 'Pedido recebido. Aguarde a aprovação da Framy Connect.',
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Não foi possível guardar.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <main
      id="main"
      className="staff-page corporate-dashboard corporate-setup corporate-shell"
    >
      <header>
        <DashboardTools navigation={null} />
      </header>
      <CorporateSidebar current="company" />
      <div className="corporate-content">
        <div className="corporate-hero">
          <h1>{t('Configurar a minha empresa')}</h1>
        </div>
        <p>
          {t(
            'Use o seu perfil Individual enquanto prepara a equipa. Não é necessário pagar para enviar este pedido.',
          )}
        </p>
        <ol className="corporate-steps" hidden={status === 'draft'}>
          <li>{t('Conta criada')}</li>
          <li aria-current={status === 'draft' ? 'step' : undefined}>
            {t('Dados da empresa')}
          </li>
          <li aria-current={status === 'submitted' ? 'step' : undefined}>
            {t('Aprovação Framy Connect')}
          </li>
          <li aria-current={status === 'approved' ? 'step' : undefined}>
            {t('Adicionar trabalhadores')}
          </li>
        </ol>

        {error && <p role="alert">{t(error)}</p>}
        {error && !ready && (
          <button type="button" onClick={() => location.reload()}>
            {t('Tentar novamente')}
          </button>
        )}
        {notice && <output aria-live="polite">{t(notice)}</output>}
        {!ready ? (
          <p>{t('A carregar…')}</p>
        ) : status !== 'draft' ? (
          <section className="corporate-panel">
            <h2>{details.company}</h2>
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                setError('');
                void refreshDashboard(async () => {
                  const response = await fetch('/api/corporate-request', {
                    cache: 'no-store',
                    signal: AbortSignal.timeout(15000),
                  });
                  const result = (await response.json()) as SetupResponse;
                  if (!response.ok) throw Error(result.error);
                  if (result.request?.status === 'approved') {
                    location.replace('/corporativo/equipa');
                    return;
                  }
                  if (result.request) {
                    setStatus(result.request.status);
                    setVersion(result.request.version);
                    setDelivery(result.request.delivery);
                  }
                }).catch((e) => setError(e.message));
              }}
            >
              {t('Actualizar')}
            </button>
            <p>
              {t(
                status === 'approved'
                  ? 'Empresa aprovada. Pode adicionar os trabalhadores.'
                  : status === 'suspended'
                    ? 'Acesso Corporativo suspenso. Contacte a Framy Connect.'
                    : 'Pedido recebido. Aguarde a aprovação da Framy Connect.',
              )}
            </p>
            {details.offer && (
              <p>
                {details.offer === 'enterprise' ? 'Enterprise' : 'Business'} ·{' '}
                {details.referenceUSD ??
                  (quotation ? usdPrice(quotation.totalCents) : '')}{' '}
                USD
              </p>
            )}
            <p>
              {t('Número de trabalhadores')}: {details.people}
            </p>
            <p>
              {t('Equipas')}: {details.teams || '—'}
            </p>
            {status === 'submitted' && delivery !== 'accepted' && (
              <p>
                {t(
                  'O pedido está guardado para a gestão, mas o envio do email não foi confirmado.',
                )}
              </p>
            )}
            {status === 'approved' && (
              <Link className="home-primary" href="/corporativo/equipa">
                {t('Adicionar trabalhadores')}
              </Link>
            )}
          </section>
        ) : (
          <form
            className="corporate-panel corporate-setup-form"
            noValidate
            onSubmit={(e) => {
              e.preventDefault();
              if (companyStep < 3) {
                nextCompanyStep();
                return;
              }
              for (const step of [0, 1]) {
                const issue = companyStepIssue(step, details);
                if (issue) {
                  setError(issue);
                  changeCompanyStep(step);
                  return;
                }
              }
              if (new FormData(e.currentTarget).get('confirmed') !== 'on') {
                setError('Confirme o envio dos dados antes de continuar.');
                return;
              }
              void save(
                'submit',
                new FormData(e.currentTarget).get('confirmed') === 'on',
              );
            }}
          >
            <ol
              className="flow-step-nav"
              aria-label={t('Passos de configuração')}
            >
              {['Empresa', 'Equipa', 'Produtos NFC', 'Rever e enviar'].map(
                (label, index) => (
                  <li
                    key={label}
                    aria-current={companyStep === index ? 'step' : undefined}
                  >
                    <button
                      type="button"
                      disabled={busy || index > companyStep}
                      onClick={() => changeCompanyStep(index)}
                    >
                      <span>{index + 1}</span>
                      {t(label)}
                    </button>
                  </li>
                ),
              )}
            </ol>
            <div className="corporate-form-heading">
              <Building2 size={24} aria-hidden="true" />
              <div>
                <h2 tabIndex={-1}>
                  {t(
                    [
                      'A sua empresa',
                      'A sua equipa',
                      'Produtos para a equipa',
                      'Rever e enviar',
                    ][companyStep],
                  )}
                </h2>
                <p>
                  {t(
                    [
                      'Comece pelo essencial. Podemos definir os detalhes mais tarde.',
                      'Quantas pessoas vão representar a sua empresa?',
                      'Escolha o que faz sentido para a equipa. Este passo é opcional.',
                      'Confirme os dados antes de nos enviar o pedido.',
                    ][companyStep],
                  )}
                </p>
              </div>
            </div>
            {(['company', 'location', 'sector', 'teams', 'goals'] as const).map(
              (key) => (
                <label
                  key={key}
                  hidden={
                    ['company', 'location'].includes(key)
                      ? companyStep !== 0
                      : companyStep !== 1
                  }
                >
                  {t(
                    (
                      {
                        company: 'Nome da empresa',
                        phone: 'Telefone de contacto',
                        location: 'Localização da empresa',
                        sector: 'Sector de actividade',
                        teams: 'Equipas',
                        goals: 'Objectivos e campanhas',
                        products: 'Produtos NFC pretendidos',
                      } as const
                    )[key],
                  )}
                  <input
                    placeholder={
                      key === 'teams'
                        ? t('Ex.: Vendas, Eventos, Atendimento')
                        : key === 'goals'
                          ? t('Ex.: Recolher contactos no evento')
                          : undefined
                    }
                    value={details[key]}
                    required={['company', 'phone', 'location'].includes(key)}
                    maxLength={
                      {
                        company: 100,
                        phone: 40,
                        location: 150,
                        sector: 100,
                        teams: 500,
                        goals: 1000,
                        products: 300,
                      }[key]
                    }
                    onChange={(e) =>
                      setDetails({ ...details, [key]: e.target.value })
                    }
                    disabled={busy}
                  />
                  {key === 'teams' && (
                    <small>
                      {t(
                        'Indique os nomes das equipas, separados por vírgulas. Os emails dos trabalhadores serão pedidos após aprovação.',
                      )}
                    </small>
                  )}
                </label>
              ),
            )}
            <label hidden={companyStep !== 0}>
              {t('Telefone de contacto')} *
              <PhoneInput
                value={details.phone}
                onValueChange={(phone) => setDetails({ ...details, phone })}
                required
                disabled={busy}
              />
            </label>
            <label hidden={companyStep !== 1}>
              {t('Plano da empresa')}
              <select
                value={details.offer ?? 'legacy'}
                disabled={busy}
                onChange={(e) =>
                  setDetails({
                    ...details,
                    offer: e.target.value,
                    people:
                      e.target.value === 'business'
                        ? Math.min(50, Math.max(3, details.people))
                        : Math.max(51, details.people),
                  })
                }
              >
                {!details.offer && (
                  <option value="legacy">{t('Proposta existente')}</option>
                )}
                <option value="business">Business · 3–50</option>
                <option value="enterprise">Enterprise · 51–500</option>
              </select>
            </label>
            <label hidden={companyStep !== 1}>
              {t('Periodicidade')}
              <select
                value={details.cycle ?? 'monthly'}
                disabled={busy}
                onChange={(e) =>
                  setDetails({ ...details, cycle: e.target.value })
                }
              >
                <option value="monthly">{t('Mensal')}</option>
                <option value="annual">{t('Anual')}</option>
              </select>
            </label>
            <label hidden={companyStep !== 1}>
              {t('Perfis de colaboradores')}
              <input
                type="number"
                min={
                  selectedOffer === 'enterprise'
                    ? 51
                    : selectedOffer === 'business'
                      ? 3
                      : 1
                }
                max={selectedOffer === 'business' ? 50 : 500}
                required
                value={details.people}
                disabled={busy}
                onChange={(e) =>
                  setDetails({ ...details, people: Number(e.target.value) })
                }
              />
            </label>
            {quotation && (companyStep === 1 || companyStep === 3) && (
              <p className="corporate-panel">
                <strong>
                  {selectedOffer === 'enterprise' ? t('A partir de') : ''}{' '}
                  {usdPrice(quotation.totalCents)} USD /{' '}
                  {t(quotation.cycle === 'annual' ? 'ano' : 'mês')}
                </strong>
                <br />
                {t(
                  'Estimativa sem compromisso. O valor final em meticais, impostos aplicáveis e condições são confirmados na proposta. Sem débito automático.',
                )}
              </p>
            )}
            <fieldset
              className="corporate-product-picker"
              disabled={busy}
              hidden={companyStep !== 2}
            >
              <legend>{t('Produtos NFC pretendidos')}</legend>
              <p>
                {t(
                  'Seleccione os produtos para a sua equipa. Pode escolher mais de um.',
                )}
              </p>
              <div className="corporate-product-grid">
                {products.map((product) => {
                  const chosen = details.products
                    .split('; ')
                    .includes(product.name);
                  const Icon = product.id.includes('keychain')
                    ? KeyRound
                    : CreditCard;
                  return (
                    <label
                      key={product.id}
                      className={chosen ? 'is-selected' : ''}
                    >
                      <input
                        type="checkbox"
                        checked={chosen}
                        onChange={() => {
                          const values = details.products
                            ? details.products.split('; ')
                            : [];
                          const next = chosen
                            ? values.filter((name) => name !== product.name)
                            : [...values, product.name];
                          if (next.join('; ').length <= 300)
                            setDetails({
                              ...details,
                              products: next.join('; '),
                            });
                        }}
                      />
                      <Icon size={28} aria-hidden="true" />
                      <strong>{t(product.name)}</strong>
                      <span className="corporate-product-check">
                        <Check size={16} aria-hidden="true" />
                      </span>
                    </label>
                  );
                })}
              </div>
              {!products.length && (
                <p>
                  {t(
                    'O catálogo está a ser actualizado. Pode indicar os produtos nas observações.',
                  )}
                </p>
              )}
              <label>
                {t('Observações sobre os produtos')}
                <input
                  value={details.products}
                  maxLength={300}
                  onChange={(e) =>
                    setDetails({ ...details, products: e.target.value })
                  }
                />
              </label>
            </fieldset>
            {companyStep === 3 && (
              <section className="flow-review">
                <h3>{t('A sua configuração')}</h3>
                <dl>
                  {[
                    [t('Empresa'), details.company],
                    [t('Localização da empresa'), details.location],
                    [t('Telefone de contacto'), details.phone],
                    [
                      t('Plano da empresa'),
                      (details.offer === 'enterprise'
                        ? 'Enterprise'
                        : 'Business') +
                        ' · ' +
                        details.people,
                    ],
                    [t('Equipas'), details.teams || '—'],
                    [t('Produtos NFC'), details.products || t('A definir')],
                  ].map(([label, value]) => (
                    <div key={label}>
                      <dt>{label}</dt>
                      <dd>{value}</dd>
                    </div>
                  ))}
                </dl>
                <button type="button" onClick={() => changeCompanyStep(0)}>
                  {t('Editar')}
                </button>
              </section>
            )}
            <label hidden={companyStep !== 3}>
              <input
                name="confirmed"
                type="checkbox"
                required
                disabled={busy}
              />
              {t(
                'Confirmo o envio dos dados da empresa à Framy Connect para análise e contacto.',
              )}
            </label>
            {companyStep === 3 && !emailReady && (
              <p>
                {t(
                  'O email não está disponível. Guarde o rascunho e tente mais tarde.',
                )}
              </p>
            )}
            <div className="corporate-toolbar">
              {companyStep > 0 && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => changeCompanyStep(companyStep - 1)}
                >
                  {t('Voltar')}
                </button>
              )}
              {companyStep < 3 && (
                <button
                  type="button"
                  className="flow-primary"
                  disabled={busy}
                  onClick={nextCompanyStep}
                >
                  {t('Seguinte')} →
                </button>
              )}
              <button
                type="button"
                disabled={busy}
                onClick={() => void save('save', false)}
              >
                <Save size={18} aria-hidden="true" />
                {t('Guardar rascunho')}
              </button>
              <button
                type="submit"
                hidden={companyStep !== 3}
                disabled={busy || !emailReady}
              >
                <Send size={18} aria-hidden="true" />
                {t(busy ? 'A enviar…' : 'Enviar pedido de aprovação')}
              </button>
            </div>
            <p hidden={companyStep !== 3}>
              {t(
                'A aprovação desbloqueia a equipa. Preços, produtos e pagamento são acordados separadamente; não há cobrança automática.',
              )}
            </p>
          </form>
        )}
      </div>
    </main>
  );
}
