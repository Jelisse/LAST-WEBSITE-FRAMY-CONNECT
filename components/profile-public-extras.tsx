'use client';
import { useRef, useState } from 'react';
import type { Profile } from '@/lib/domain';
export function ProfilePublicExtras({
  profile,
  english,
  preview,
  onAction,
}: {
  profile: Profile;
  english: boolean;
  preview: boolean;
  onAction: (target: string) => void;
}) {
  const [sent, setSent] = useState(false),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false);
  const id = useRef<string | null>(null);
  const e = profile.extras;
  async function submit(ev: React.SubmitEvent<HTMLFormElement>) {
    ev.preventDefault();
    if (preview) return;
    const form = ev.currentTarget,
      values = new FormData(form);
    setBusy(true);
    setError('');
    id.current ??= crypto.randomUUID();
    try {
      const r = await fetch('/api/profile-enquiries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: id.current,
          username: profile.username,
          name: values.get('name'),
          email: values.get('email'),
          message: values.get('message'),
          website: values.get('website'),
          consent: values.get('consent') === 'on',
        }),
        signal: AbortSignal.timeout(15000),
      });
      const d = (await r.json()) as { error?: string };
      if (!r.ok) throw Error(d.error);
      setSent(true);
      onAction('enquiry');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível enviar.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      {!!e?.services.length && (
        <section className="profile-showcase">
          <h2>{english ? 'Products & services' : 'Produtos e serviços'}</h2>
          {e.services.map((s, i) => (
            <article key={i}>
              <h3>{english && s.englishTitle ? s.englishTitle : s.title}</h3>
              <p>
                {english && s.englishDescription
                  ? s.englishDescription
                  : s.description}
              </p>
              {s.price && (
                <strong>
                  {english && s.englishPrice ? s.englishPrice : s.price}
                </strong>
              )}
              {s.url && (
                <a
                  href={s.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => onAction(`service:${i}`)}
                >
                  {english ? 'Find out more' : 'Saber mais'} ↗
                </a>
              )}
            </article>
          ))}
        </section>
      )}
      {e?.enquiries && (
        <section className="profile-enquiry">
          <h2>{english ? 'Ask for information' : 'Pedir informações'}</h2>
          {sent ? (
            <output>
              {english
                ? 'Your message is in the business inbox. They can reply to your email.'
                : 'A sua mensagem está na caixa de entrada do negócio. Poderão responder para o seu email.'}
            </output>
          ) : (
            <form onSubmit={submit}>
              <label>
                {english ? 'Name' : 'Nome'}
                <input
                  name="name"
                  required
                  maxLength={90}
                  autoComplete="name"
                />
              </label>
              <label>
                Email
                <input
                  name="email"
                  required
                  type="email"
                  maxLength={160}
                  autoComplete="email"
                />
              </label>
              <label>
                {english ? 'Message' : 'Mensagem'}
                <textarea
                  name="message"
                  required
                  minLength={10}
                  maxLength={1500}
                  rows={3}
                />
              </label>
              <label className="growth-honeypot" aria-hidden="true">
                Website
                <input name="website" tabIndex={-1} autoComplete="off" />
              </label>
              <label className="growth-check">
                <input name="consent" type="checkbox" required />
                {english
                  ? 'Send my name, email and message to this business. Stored for up to 90 days.'
                  : 'Enviar o meu nome, email e mensagem a este negócio. Conservados por até 90 dias.'}
              </label>
              <button disabled={busy || preview}>
                {busy
                  ? english
                    ? 'Sending…'
                    : 'A enviar…'
                  : english
                    ? 'Send enquiry'
                    : 'Enviar pedido'}
              </button>
              {preview && (
                <small>O envio está desactivado na pré-visualização.</small>
              )}
              {error && <p role="alert">{error}</p>}
            </form>
          )}
        </section>
      )}
    </>
  );
}
