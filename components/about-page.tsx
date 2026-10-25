import { getTranslations } from '@/lib/server-i18n';
import { SiteHeader, SiteFooter } from '@/components/site-shell';
import { ProfileStart } from '@/components/profile-start';
import { SourceImage } from '@/components/source-image';
import Link from '@/components/hard-link';
import { ArrowUpRight } from 'lucide-react';

export async function AboutPage() {
  const t = await getTranslations();
  return (
    <>
      <SiteHeader />
      <main id="main" className="about-framy">
        <section className="section-wrap about-hero">
          <div>
            <span className="eyebrow">{t('SOBRE A FRAMY CONNECT')}</span>
            <h1>{t('Conectar começa por si.')}</h1>
            <p className="page-intro">
              {t(
                'Somos a Framy Connect: uma plataforma de identidade digital que aproxima pessoas, trabalho e oportunidades em Moçambique.',
              )}
            </p>
            <a className="text-link" href="#a-nossa-razao">
              {t('Conheça a nossa razão de ser')} <ArrowUpRight size={18} />
            </a>
          </div>
          <figure>
            <SourceImage
              src="/solutions/professionals.webp"
              width={1200}
              height={800}
              loading="eager"
              alt={t('Profissionais a apresentar um projecto num atelier.')}
            />
            <figcaption>
              {t('Fotografias ilustrativas geradas por IA.')}
            </figcaption>
          </figure>
        </section>
        <section id="a-nossa-razao" className="section-wrap about-story">
          <span className="eyebrow">{t('QUEM SOMOS')}</span>
          <div>
            <h2>{t('O encontro é só o princípio.')}</h2>
            <p>
              {t(
                'Uma boa conversa pode terminar com um número guardado, um nome esquecido ou um cartão com informação que já mudou. Queremos tornar mais fácil o que vem a seguir: encontrar a pessoa certa, conhecer o seu trabalho e voltar a entrar em contacto.',
              )}
            </p>
            <p>
              {t(
                'A Framy Connect junta a apresentação digital aos momentos da vida real. O perfil é o ponto de partida; o link, o QR e os produtos NFC são formas de o levar consigo.',
              )}
            </p>
          </div>
        </section>
        <section id="missao-e-visao" className="section-wrap about-institution">
          <span className="eyebrow">{t('O NOSSO PROPÓSITO')}</span>
          <div className="about-purpose-grid">
            <article>
              <span className="about-section-number" aria-hidden="true">
                01
              </span>
              <h2>{t('A nossa missão')}</h2>
              <p>
                {t(
                  'Simplificar a forma como pessoas e organizações se apresentam, partilham contactos e dão continuidade às suas conexões, ligando a identidade digital aos encontros do dia a dia.',
                )}
              </p>
            </article>
            <article>
              <span className="about-section-number" aria-hidden="true">
                02
              </span>
              <h2>{t('A nossa visão')}</h2>
              <p>
                {t(
                  'Tornar a Framy Connect uma referência em identidade digital e conexões profissionais em Moçambique, com uma experiência acessível, útil e preparada para acompanhar a evolução de cada pessoa e organização.',
                )}
              </p>
            </article>
          </div>
        </section>
        <section className="about-local">
          <div className="section-wrap about-local-inner">
            <div>
              <span className="eyebrow">
                {t('MOÇAMBIQUE, NO NOSSO DIA A DIA')}
              </span>
              <h2>{t('Pensada para as conexões que fazemos aqui.')}</h2>
              <p>
                {t(
                  'Do profissional independente à equipa no terreno, do criador ao consultório: partimos das situações do nosso mercado para organizar uma experiência clara, próxima e útil.',
                )}
              </p>
              <p>
                {t(
                  'Uma experiência em português, com opções de idioma para continuar a conversa com mais pessoas. Tecnologia ao serviço da apresentação, sem complicar o encontro.',
                )}
              </p>
              <Link className="text-link" href="/#problemas">
                {t('Encontre a solução para si')} <ArrowUpRight size={18} />
              </Link>
            </div>
            <SourceImage
              src="/solutions/teams.webp"
              width={1200}
              height={800}
              alt={t('Equipa a colaborar num escritório luminoso.')}
            />
          </div>
        </section>
        <section id="valores" className="section-wrap about-principles">
          <span className="eyebrow">{t('O QUE ORIENTA O NOSSO TRABALHO')}</span>
          <h2>{t('Os nossos valores')}</h2>
          <div className="about-values">
            {[
              [
                'Simplicidade',
                'Tornar cada apresentação e cada próximo passo claros e fáceis de compreender.',
              ],
              [
                'Inovação útil',
                'Usar a tecnologia para resolver necessidades reais, com ferramentas que acompanham as pessoas e o seu trabalho.',
              ],
              [
                'Transparência',
                'Comunicar as opções, os custos e as condições antes de cada confirmação.',
              ],
              [
                'Respeito pela privacidade',
                'Dar a cada pessoa a escolha do que publica e respeitar o consentimento nos pedidos de contacto.',
              ],
              [
                'Proximidade',
                'Ouvir as necessidades do nosso mercado e manter um caminho claro para contactar a equipa.',
              ],
            ].map(([title, text]) => (
              <article key={title}>
                <h3>{t(title)}</h3>
                <p>{t(text)}</p>
              </article>
            ))}
          </div>
        </section>
        <section id="politicas" className="section-wrap about-policies">
          <span className="eyebrow">{t('COMPROMISSOS NA PRÁTICA')}</span>
          <h2>{t('Políticas da empresa')}</h2>
          <p className="about-policy-intro">
            {t(
              'Estes princípios orientam a utilização do serviço e a relação com a Framy. Consulte as condições completas nas páginas indicadas.',
            )}
          </p>
          <div className="about-purpose-grid">
            {[
              {
                title: 'Privacidade e dados pessoais',
                text: 'Escolhe os dados publicados no perfil. Os rascunhos exigem sessão e o acesso aos dados da conta e das encomendas está sujeito a permissões.',
                href: '/privacidade',
                label: 'Consultar a política de privacidade',
              },
              {
                title: 'Transparência comercial',
                text: 'Personal é gratuito, sem prazo. Produtos físicos, design e entrega são pagos separadamente. Confirme as opções e os valores apresentados antes de pagar.',
                href: '/termos',
                label: 'Consultar as condições do serviço',
              },
              {
                title: 'Qualidade e personalização',
                text: 'Confirme o material, o design e os detalhes da encomenda. Esclareça com a equipa as condições de personalização, entrega, cancelamento e devolução antes do pagamento.',
                href: '/contacto',
                label: 'Esclarecer a minha encomenda',
              },
              {
                title: 'Atendimento e acompanhamento',
                text: 'Use os canais oficiais para pedir informações ou apoio. Para assuntos de uma compra, guarde a referência da encomenda e da transacção.',
                href: '/ajuda',
                label: 'Obter ajuda',
              },
            ].map(({ title, text, href, label }) => (
              <article key={title}>
                <h3>{t(title)}</h3>
                <p>{t(text)}</p>
                <Link className="text-link" href={href}>
                  {t(label)} <ArrowUpRight size={18} />
                </Link>
              </article>
            ))}
          </div>
        </section>
        <section className="section-wrap about-next">
          <span className="eyebrow">{t('O SEU PRÓXIMO PASSO')}</span>
          <h2>{t('Comece por si. Cresça à sua maneira.')}</h2>
          <p>
            {t(
              'Personal para começar gratuitamente. Professional para apresentar serviços e portefólio. Business e Enterprise para organizar a sua equipa, mediante proposta.',
            )}
          </p>
          <div className="about-actions">
            <ProfileStart className="btn btn-primary" />
            <Link className="btn btn-secondary" href="/contacto">
              {t('Fale connosco')} <ArrowUpRight size={18} />
            </Link>
          </div>
          <Link className="text-link" href="/#planos">
            {t('Conhecer os planos')} <ArrowUpRight size={18} />
          </Link>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
