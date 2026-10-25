'use client';
import { useId, useState } from 'react';
import { useI18n, LanguageSelector } from './language-provider';
import { nameSuggestions, visitorPositions } from '@/lib/visitor-book';
import { Check, ArrowRight } from 'lucide-react';
import Link from './hard-link';
import { SourceImage } from './source-image';
export function VisitorRegistration({
  token,
  logoUrl,
  organisation,
  reception,
  welcome,
  days,
  purposes,
  departments,
}: {
  token: string;
  logoUrl: string;
  organisation: string;
  reception: string;
  welcome: string;
  days: number;
  purposes: string[];
  departments: string[];
}) {
  const { t } = useI18n(),
    nameList = useId();
  const [name, setName] = useState(''),
    [representing, setRepresenting] = useState(false),
    [position, setPosition] = useState(''),
    [busy, setBusy] = useState(false),
    [done, setDone] = useState(false),
    [error, setError] = useState(''),
    [requestId] = useState(() => crypto.randomUUID());
  return (
    <main id="main" className="visitor-public">
      <header>
        <Link href="/" className="visitor-brand">
          <SourceImage
            src="/brand/logo.svg"
            alt="Framy Connect"
            width={130}
            height={42}
            loading="eager"
          />
        </Link>
        <LanguageSelector />
      </header>
      <section className="visitor-welcome">
        {logoUrl && (
          <SourceImage
            className="visitor-company-logo"
            src={logoUrl}
            alt={organisation}
            width={140}
            height={64}
          />
        )}
        <span className="eyebrow">{organisation}</span>
        <h1>{t('Registe a sua visita')}</h1>
        <p>{reception}</p>
        {welcome && <p>{welcome}</p>}
      </section>
      <section className="visitor-form-card">
        {done ? (
          <div className="visitor-success" aria-live="polite">
            <Check size={36} />
            <h2>{t('A sua visita foi registada.')}</h2>
            <p>{t('Bem-vindo à {0}.', [organisation])}</p>
            <p>{t('Por favor, informe a recepção da sua chegada.')}</p>
          </div>
        ) : (
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              if (busy) return;
              setBusy(true);
              setError('');
              const f = new FormData(e.currentTarget);
              try {
                const r = await fetch('/api/visitor-register', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    token,
                    requestId,
                    name,
                    phone: f.get('phone'),
                    email: f.get('email'),
                    representing,
                    company: f.get('company'),
                    position:
                      position === 'Outro' ? f.get('otherPosition') : position,
                    positionChoice: position,
                    purpose: f.get('purpose') || '',
                    department: f.get('department') || '',
                    consent: f.get('consent') === 'on',
                  }),
                });
                const b = (await r.json()) as { error?: string };
                if (!r.ok) throw Error(b.error);
                setDone(true);
                setName('');
              } catch (e) {
                setError(
                  e instanceof Error
                    ? e.message
                    : 'Não foi possível registar a visita.',
                );
              } finally {
                setBusy(false);
              }
            }}
          >
            <h2>{t('Dê-nos a conhecer quem nos visita.')}</h2>
            <label>
              {t('O seu nome')}
              <input
                required
                autoComplete="name"
                name="name"
                maxLength={120}
                value={name}
                onChange={(e) => setName(e.target.value)}
                list={nameList}
              />
              <datalist id={nameList}>
                {nameSuggestions(name).map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </datalist>
            </label>
            <div className="visitor-fields">
              <label>
                {t('O seu contacto')}
                <input
                  required
                  aria-label={t('O seu contacto')}
                  name="phone"
                  type="tel"
                  autoComplete="tel"
                  defaultValue="+258 "
                  maxLength={30}
                />
                <small>{t('Inclua o indicativo do país.')}</small>
              </label>
              <label>
                {t('Email (opcional)')}
                <input
                  name="email"
                  type="email"
                  autoComplete="email"
                  maxLength={254}
                />
              </label>
            </div>
            <fieldset>
              <legend>{t('Está a representar uma empresa?')}</legend>
              <div className="visitor-switch">
                <label>
                  <input
                    type="radio"
                    name="representing"
                    checked={!representing}
                    onChange={() => setRepresenting(false)}
                  />
                  {t('Não')}
                </label>
                <label>
                  <input
                    type="radio"
                    name="representing"
                    checked={representing}
                    onChange={() => setRepresenting(true)}
                  />
                  {t('Sim')}
                </label>
              </div>
            </fieldset>
            {representing && (
              <div className="visitor-fields">
                <label>
                  {t('Empresa / organização')}
                  <input
                    name="company"
                    autoComplete="organization"
                    required
                    maxLength={120}
                  />
                </label>
                <label>
                  {t('Cargo / função')}
                  <select
                    value={position}
                    required
                    onChange={(e) => setPosition(e.target.value)}
                  >
                    <option value="">{t('Escolha uma opção')}</option>
                    {visitorPositions.map((p) => (
                      <option key={p} value={p}>
                        {t(p)}
                      </option>
                    ))}
                  </select>
                </label>
                {position === 'Outro' && (
                  <label>
                    {t('Indique o seu cargo')}
                    <input
                      name="otherPosition"
                      required
                      maxLength={80}
                      autoComplete="organization-title"
                    />
                  </label>
                )}
              </div>
            )}
            <div className="visitor-fields">
              {purposes.length > 0 && (
                <label>
                  {t('Motivo da visita (opcional)')}
                  <select name="purpose">
                    <option value="">{t('Escolha uma opção')}</option>
                    {purposes.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              {departments.length > 0 && (
                <label>
                  {t('Departamento a visitar (opcional)')}
                  <select name="department">
                    <option value="">{t('Escolha uma opção')}</option>
                    {departments.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </label>
              )}
            </div>
            <div className="visitor-privacy">
              <p>
                {t(
                  'Os dados são enviados à {0} para gerir a sua visita e conservados até {1} dias. Não são uma subscrição de marketing.',
                  [organisation, days],
                )}
              </p>
              <label className="visitor-check">
                <input type="checkbox" name="consent" required />
                {t(
                  'Autorizo o envio dos meus dados à organização para registar esta visita.',
                )}
              </label>
              <Link href="/privacidade">
                {t('Privacidade e utilização dos dados')}
              </Link>
            </div>
            {error && <p role="alert">{t(error)}</p>}
            <button className="btn btn-primary" disabled={busy}>
              {t(busy ? 'A registar…' : 'Registar a minha visita')}
              <ArrowRight size={18} />
            </button>
          </form>
        )}
      </section>
      <p className="visitor-powered">
        {t('Livro de Visitas Digital · Framy Connect')}
      </p>
    </main>
  );
}
