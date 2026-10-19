'use client';
import { useEffect, useState } from 'react';
import Link from './hard-link';
import { DashboardTools } from './mobile-navigation';
import { useI18n } from './language-provider';
type Details = {
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
  people: 1,
  phone: '',
  location: '',
  sector: '',
  teams: '',
  goals: '',
  products: '',
};
export function CorporateSetup() {
  const { t } = useI18n();
  const [details, setDetails] = useState(empty),
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
          location.replace('/corporativo');
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
          location.replace('/corporativo');
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
    <main id="main" className="staff-page corporate-dashboard corporate-setup">
      <header>
        <DashboardTools />
      </header>
      <h1>{t('Configurar a minha empresa')}</h1>
      <p>
        {t(
          'Use o seu perfil Individual enquanto prepara a equipa. Não é necessário pagar para enviar este pedido.',
        )}
      </p>
      <ol className="corporate-steps">
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
      <div className="corporate-toolbar">
        <Link href="/perfil">{t('O meu perfil')}</Link>
        <Link href="/corporativo">{t('A minha equipa')}</Link>
      </div>
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
          <button type="button" onClick={() => location.reload()}>
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
            <Link className="home-primary" href="/corporativo">
              {t('Adicionar trabalhadores')}
            </Link>
          )}
        </section>
      ) : (
        <form
          className="corporate-panel corporate-setup-form"
          onSubmit={(e) => {
            e.preventDefault();
            void save(
              'submit',
              new FormData(e.currentTarget).get('confirmed') === 'on',
            );
          }}
        >
          {(
            [
              'company',
              'phone',
              'location',
              'sector',
              'teams',
              'goals',
              'products',
            ] as const
          ).map((key) => (
            <label key={key}>
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
            </label>
          ))}
          <label>
            {t('Número de trabalhadores')}
            <input
              type="number"
              min={1}
              max={500}
              required
              value={details.people}
              disabled={busy}
              onChange={(e) =>
                setDetails({ ...details, people: Number(e.target.value) })
              }
            />
          </label>
          <p>
            {t(
              'Indique os nomes das equipas, separados por vírgulas. Os emails dos trabalhadores serão pedidos após aprovação.',
            )}
          </p>
          <label>
            <input name="confirmed" type="checkbox" required disabled={busy} />
            {t(
              'Confirmo o envio dos dados da empresa à Framy Connect para análise e contacto.',
            )}
          </label>
          {!emailReady && (
            <p>
              {t(
                'O email não está disponível. Guarde o rascunho e tente mais tarde.',
              )}
            </p>
          )}
          <div className="corporate-toolbar">
            <button
              type="button"
              disabled={busy}
              onClick={() => void save('save', false)}
            >
              {t('Guardar rascunho')}
            </button>
            <button type="submit" disabled={busy || !emailReady}>
              {t(busy ? 'A enviar…' : 'Enviar pedido de aprovação')}
            </button>
          </div>
          <p>
            {t(
              'A aprovação desbloqueia a equipa. Preços, produtos e pagamento são acordados separadamente; não há cobrança automática.',
            )}
          </p>
        </form>
      )}
    </main>
  );
}
