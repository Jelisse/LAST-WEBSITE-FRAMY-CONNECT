'use client';
import { useState, useId } from 'react';
import {
  Search,
  ArrowUpRight,
  MessageCircle,
  Package,
  UserRound,
  ScanLine,
  KeyRound,
  Users,
  ShieldCheck,
  ChevronDown,
} from 'lucide-react';
import Link from './hard-link';
import { useI18n } from './language-provider';
import { helpTopics } from '@/lib/help-content';

const icons = [UserRound, ScanLine, Package, KeyRound, Users, ShieldCheck];
const searchable = (text: string) =>
  text.normalize('NFD').replace(/\p{M}/gu, '').toLocaleLowerCase();

export function HelpCentre({
  embedded = false,
  onContact,
}: {
  embedded?: boolean;
  onContact?: () => void;
}) {
  const prefix = useId();
  const Heading = embedded ? 'h2' : 'h1';
  const { t } = useI18n();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('all');
  const needle = searchable(query.trim());
  const topics = helpTopics
    .map((topic, index) => ({
      ...topic,
      index,
      articles: topic.articles.filter(
        (article) =>
          !needle ||
          searchable(
            [t(topic.title), ...article.map((text) => t(text))].join(' '),
          ).includes(needle),
      ),
    }))
    .filter(
      (topic) =>
        (category === 'all' || category === topic.id) &&
        topic.articles.length > 0,
    );
  return (
    <>
      <section className="help-hero">
        <div className="help-wrap">
          <span className="public-eyebrow">{t('CENTRO DE AJUDA FRAMY')}</span>
          <Heading>{t('O que precisa de resolver hoje?')}</Heading>
          <p>
            {t(
              'Encontre o próximo passo ou fale directamente com a nossa equipa.',
            )}
          </p>
          <div className="help-search">
            <Search aria-hidden="true" size={22} />
            <label className="sr-only" htmlFor={prefix + '-search'}>
              {t('Pesquisar na ajuda')}
            </label>
            <input
              id={prefix + '-search'}
              type="search"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setCategory('all');
              }}
              placeholder={t('Pesquisar perfil, NFC, pagamento…')}
              aria-controls={prefix + '-guides'}
            />
            {query && (
              <button onClick={() => setQuery('')}>{t('Limpar')}</button>
            )}
          </div>
          <div className="help-quick">
            <Link href="/acompanhar">
              <Package size={17} aria-hidden="true" />
              {t('Acompanhar a minha encomenda')}
            </Link>
            <Link href="/recuperar">
              <KeyRound size={17} aria-hidden="true" />
              {t('Recuperar acesso à conta')}
            </Link>
            <Link
              href="/contacto"
              onClick={(event) => {
                if (onContact) {
                  event.preventDefault();
                  onContact();
                }
              }}
            >
              <MessageCircle size={17} aria-hidden="true" />
              {t('Contactar a Framy')}
            </Link>
          </div>
        </div>
      </section>
      <section
        className="help-wrap help-library"
        id={prefix + '-guides'}
        aria-labelledby={prefix + '-guides-title'}
      >
        <div className="help-library-heading">
          <div>
            <span className="public-eyebrow">{t('GUIAS PRÁTICOS')}</span>
            <h2 id={prefix + '-guides-title'}>{t('Ajuda para cada etapa.')}</h2>
          </div>
          <output aria-live="polite">
            {topics.reduce((total, topic) => total + topic.articles.length, 0)}{' '}
            {t(
              topics.reduce(
                (total, topic) => total + topic.articles.length,
                0,
              ) === 1
                ? 'resposta disponível'
                : 'respostas disponíveis',
            )}
          </output>
        </div>
        <fieldset className="help-filters">
          <legend className="sr-only">{t('Filtrar por assunto')}</legend>
          <button
            aria-pressed={category === 'all'}
            onClick={() => setCategory('all')}
          >
            {t('Todos os assuntos')}
          </button>
          {helpTopics.map((topic) => (
            <button
              key={topic.id}
              aria-pressed={category === topic.id}
              onClick={() => setCategory(topic.id)}
            >
              {t(topic.title)}
            </button>
          ))}
        </fieldset>
        <div className="help-topic-grid">
          {topics.map((topic) => {
            const Icon = icons[topic.index];
            return (
              <article className="help-topic" key={topic.id}>
                <Icon
                  className="help-topic-icon"
                  size={24}
                  aria-hidden="true"
                />
                <h3>{t(topic.title)}</h3>
                <p>{t(topic.description)}</p>
                {topic.articles.map(([question, answer]) => (
                  <details
                    key={`${question}-${needle ? 'search' : 'browse'}`}
                    open={needle ? true : undefined}
                  >
                    <summary>
                      {t(question)}
                      <ChevronDown size={17} aria-hidden="true" />
                    </summary>
                    <p>{t(answer)}</p>
                  </details>
                ))}
                <Link className="public-text-link" href={topic.href}>
                  {t(topic.action)}
                  <ArrowUpRight size={17} aria-hidden="true" />
                </Link>
              </article>
            );
          })}
        </div>
        {!topics.length && (
          <div className="help-empty">
            <Search size={30} aria-hidden="true" />
            <h3>{t('Não encontrou a resposta?')}</h3>
            <p>
              {t(
                'Experimente outra palavra ou fale com a nossa equipa na página de contacto.',
              )}
            </p>
            <button
              className="public-button"
              onClick={() => {
                setQuery('');
                setCategory('all');
              }}
            >
              {t('Ver todos os guias')}
            </button>
            <Link
              className="public-text-link"
              href="/contacto"
              onClick={(event) => {
                if (onContact) {
                  event.preventDefault();
                  onContact();
                }
              }}
            >
              {t('Contactar a Framy')}
              <ArrowUpRight size={17} aria-hidden="true" />
            </Link>
          </div>
        )}
      </section>
      <section className="help-wrap help-bottom" id="falar-framy">
        <div>
          <h2>{t('Ainda precisa de uma mão?')}</h2>
          <p>
            {t(
              'Diga-nos em que página está e o que tentou fazer. Assim conseguimos compreender melhor o pedido.',
            )}
          </p>
          <small>
            {t(
              'Nunca partilhe palavras-passe, códigos de acesso ou dados de cartão.',
            )}
          </small>
        </div>
        <Link
          className="public-button"
          href="/contacto"
          onClick={(event) => {
            if (onContact) {
              event.preventDefault();
              onContact();
            }
          }}
        >
          {t('Contactar a Framy')}
          <ArrowUpRight size={18} aria-hidden="true" />
        </Link>
      </section>
    </>
  );
}
