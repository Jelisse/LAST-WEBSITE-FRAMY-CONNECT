'use client';
import { useId, useState } from 'react';
import {
  MessageCircle,
  Mail,
  ArrowUpRight,
  LifeBuoy,
  BriefcaseBusiness,
  Handshake,
  Copy,
  Check,
  Package,
  KeyRound,
} from 'lucide-react';
import Link from './hard-link';
import { useI18n } from './language-provider';
import {
  contactLinks,
  supportContacts,
  type ContactPurpose,
} from '@/lib/support-contact';
const choices = [
  {
    id: 'support',
    title: 'Preciso de apoio',
    text: 'Perfil, conta, cartão NFC ou uma encomenda.',
    icon: LifeBuoy,
  },
  {
    id: 'sales',
    title: 'Quero falar com vendas',
    text: 'Produtos, planos e propostas para a sua equipa.',
    icon: BriefcaseBusiness,
  },
  {
    id: 'partnerships',
    title: 'Vamos criar uma parceria',
    text: 'Colaborações e representação da empresa.',
    icon: Handshake,
  },
] as const;
export function ContactFramy({
  embedded = false,
  onHelp,
}: {
  embedded?: boolean;
  onHelp?: () => void;
}) {
  const { t } = useI18n();
  const id = useId();
  const [purpose, setPurpose] = useState<ContactPurpose>('support');
  const [message, setMessage] = useState('');
  const [reference, setReference] = useState('');
  const [copied, setCopied] = useState('');
  const [copyError, setCopyError] = useState(false);
  const selected = choices.find((choice) => choice.id === purpose)!;
  const links = contactLinks(purpose, t(selected.title), message, reference);
  const Heading = embedded ? 'h2' : 'h1';
  async function copy(value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(value);
      setCopyError(false);
    } catch {
      setCopyError(true);
    }
  }
  return (
    <div className={'contact-framy' + (embedded ? ' support-embedded' : '')}>
      <header className="contact-intro">
        <span className="public-eyebrow">{t('CONTACTAR A FRAMY')}</span>
        <Heading>{t('Como podemos ajudar?')}</Heading>
        <p>{t('Escolha o assunto. Nós mostramos o caminho certo.')}</p>
      </header>
      <fieldset className="contact-purpose">
        <legend className="sr-only">
          {t('Escolher o motivo do contacto')}
        </legend>
        {choices.map((choice) => {
          const Icon = choice.icon;
          return (
            <label key={choice.id} data-selected={purpose === choice.id}>
              <input
                type="radio"
                name={id + '-purpose'}
                value={choice.id}
                checked={purpose === choice.id}
                onChange={() => {
                  setPurpose(choice.id);
                  setCopied('');
                }}
              />
              <Icon size={24} aria-hidden="true" />
              <span>
                <strong>{t(choice.title)}</strong>
                <small>{t(choice.text)}</small>
              </span>
            </label>
          );
        })}
      </fieldset>
      <section
        className="contact-channel-panel"
        aria-labelledby={id + '-channel'}
      >
        <div className="contact-channel-main">
          <h2 id={id + '-channel'}>{t(selected.title)}</h2>
          <p>
            {t(
              purpose === 'sales'
                ? 'Conte-nos o que procura e quantas pessoas fazem parte da equipa.'
                : purpose === 'partnerships'
                  ? 'Apresente a sua ideia. Para assuntos de representação, pode também contactar os co-fundadores abaixo.'
                  : 'Fale com a equipa ou resolva já uma das situações mais comuns.',
            )}
          </p>
          <div className="contact-primary-actions">
            <a
              className="public-button"
              href={links.whatsapp}
              target="_blank"
              rel="noopener noreferrer"
            >
              <MessageCircle size={19} />
              {t('Conversar no WhatsApp')}
              <ArrowUpRight size={17} />
            </a>
            <a className="contact-email-action" href={links.mailto}>
              <Mail size={19} />
              {t('Escrever um email')}
              <ArrowUpRight size={17} />
            </a>
          </div>
          <div className="contact-addresses">
            {[
              { value: supportContacts.whatsappDisplay, label: 'WhatsApp' },
              { value: links.email, label: 'Email' },
            ].map((item) => (
              <div key={item.value}>
                <span>
                  <small>{t(item.label)}</small>
                  <strong>{item.value}</strong>
                </span>
                <button
                  type="button"
                  onClick={() => void copy(item.value)}
                  aria-label={t('Copiar contacto') + ': ' + item.value}
                  title={t('Copiar contacto')}
                >
                  {copied === item.value ? (
                    <Check size={18} />
                  ) : (
                    <Copy size={18} />
                  )}
                </button>
              </div>
            ))}
          </div>
          <output className="contact-copy-status" aria-live="polite">
            {copyError
              ? t('Não foi possível copiar. Seleccione o contacto apresentado.')
              : copied
                ? t('Contacto copiado.')
                : ''}
          </output>
          <small className="contact-external-note">
            {t(
              'O WhatsApp abre numa nova janela. O email abre na sua aplicação de email.',
            )}
          </small>
          {purpose === 'support' && (
            <nav className="contact-shortcuts" aria-label={t('Resolver agora')}>
              <Link href="/acompanhar">
                <Package size={18} />
                {t('Acompanhar a minha encomenda')}
                <ArrowUpRight size={16} />
              </Link>
              <Link href="/recuperar">
                <KeyRound size={18} />
                {t('Recuperar acesso à conta')}
                <ArrowUpRight size={16} />
              </Link>
            </nav>
          )}
        </div>
        <details className="contact-context">
          <summary>{t('Preparar a minha mensagem (opcional)')}</summary>
          <p>
            {t(
              'Estes detalhes só são partilhados quando abrir o email ou o WhatsApp.',
            )}
          </p>
          {purpose === 'support' && (
            <label htmlFor={id + '-reference'}>
              {t('Referência da encomenda (se tiver)')}
              <input
                id={id + '-reference'}
                value={reference}
                maxLength={80}
                onChange={(e) => setReference(e.target.value)}
                placeholder="FC-OR-26-…"
              />
            </label>
          )}
          <label htmlFor={id + '-message'}>
            {t('O que precisa de nos dizer?')}
            <textarea
              id={id + '-message'}
              value={message}
              maxLength={1800}
              rows={4}
              onChange={(e) => setMessage(e.target.value)}
            />
          </label>
          <small>
            {t(
              'Nunca partilhe palavras-passe, códigos de acesso ou dados de cartão.',
            )}
          </small>
        </details>
      </section>
      {purpose === 'partnerships' && (
        <section
          className="contact-representatives"
          aria-labelledby={id + '-founders'}
        >
          <h2 id={id + '-founders'}>{t('Representantes da empresa')}</h2>
          <p>
            {t(
              'Firmino Chambale e Jelisse Langa são co-fundadores da Framy Connect.',
            )}
          </p>
          <div>
            {supportContacts.founders.map((person) => (
              <article key={person.email}>
                <span>{person.role}</span>
                <h3>{person.name}</h3>
                <a href={'mailto:' + person.email}>
                  {person.email}
                  <ArrowUpRight size={16} />
                </a>
              </article>
            ))}
          </div>
        </section>
      )}
      <div className="contact-help-link">
        <span>{t('Prefere encontrar a resposta?')}</span>
        {onHelp ? (
          <button type="button" onClick={onHelp}>
            {t('Abrir o Centro de ajuda')}
            <ArrowUpRight size={17} />
          </button>
        ) : (
          <Link href="/ajuda">
            {t('Abrir o Centro de ajuda')}
            <ArrowUpRight size={17} />
          </Link>
        )}
      </div>
    </div>
  );
}
