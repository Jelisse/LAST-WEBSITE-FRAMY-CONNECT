import './why-framy.css';
import { ProblemPaths } from '@/components/problem-paths';
import { PlanComparison, PlanQuestions } from '@/components/plan-comparison';
import { env } from 'cloudflare:workers';
import { paysuiteReady } from '@/lib/server-paysuite';
import { database } from '@/lib/server-db';
import { HomeProfilePlans } from '@/components/home-profile-plans';
import { getTranslations } from '@/lib/server-i18n';
import { planMeticais } from '@/lib/plan-pricing';
import { publicPageRobots } from '@/lib/server-site';
import { HomePurchaseOffers } from '@/components/home-purchase-offers';
import Link from '@/components/hard-link';
import { ArrowUpRight } from 'lucide-react';
import { SiteFooter } from '@/components/site-shell';
import { getHeroMedia } from '@/lib/server-hero-media';
import { HomeSharingScene } from '@/components/home-sharing-scene';
import { getProducts } from '@/lib/server-catalog';
import { getManagedPlans } from '@/lib/server-plans';
import './home-solutions.css';
import './home.css';
import './home-atmosphere.css';
import './home-interactions.css';
import './home-featured.css';
import './home-refinements.css';
import './public-marketing.css';
import { PublicHeader } from '@/components/public-header';
import { PublicSolutions, PublicTrust } from '@/components/public-solutions';
import { ConnectionDemo } from '@/components/connection-demo';
import { ProfileStart } from '@/components/profile-start';
import './profile-start.css';

const questions = [
  [
    'Preciso de dois planos para o kit?',
    'Não. O cartão e o porta-chaves ligam ao mesmo perfil digital, com uma única subscrição.',
  ],
  [
    'Já posso comprar?',
    'Estamos a actualizar o checkout. Pode explorar os produtos e a configuração; novos pagamentos permanecem indisponíveis até à reabertura.',
  ],
  [
    'Preciso de instalar uma aplicação?',
    'Quem recebe o seu perfil pode abri-lo no navegador. Para partilhar por toque, o telemóvel precisa de ser compatível com NFC. O código QR oferece outra forma de acesso.',
  ],
  [
    'Posso actualizar os meus contactos?',
    'Sim. Pode editar a fotografia, os contactos e os links em A minha identidade. O endereço do perfil mantém-se, para continuar a usar o mesmo cartão.',
  ],
  [
    'O produto inclui uma subscrição?',
    'O produto físico é pago separadamente do perfil digital. O plano Personal é gratuito, sem prazo. Professional, Business e Enterprise são pagos, com renovação confirmada pelo cliente.',
  ],
  [
    'Como indico o local de entrega?',
    'Antes de submeter o pedido, indique a cidade ou localidade de entrega. Pode acrescentar o bairro e um ponto de referência. A equipa usa essa informação para organizar a entrega; confirme a cobertura e o prazo antes da compra.',
  ],
  [
    'O perfil comprova uma identidade ou credencial?',
    'O perfil apresenta a informação partilhada pelo seu titular. A presença de informação no perfil não constitui, por si só, uma verificação de identidade ou certificação de credenciais.',
  ],
];
export const dynamic = 'force-dynamic';
export async function generateMetadata() {
  const t = await getTranslations();
  return {
    title: t('Perfis profissionais e equipas conectadas'),
    description: t(
      'Perfis digitais, produtos NFC e ferramentas para equipas. Partilhe contactos, organize campanhas e acompanhe a actividade da sua empresa com a Framy Connect.',
    ),
    robots: publicPageRobots(),
  };
}
export default async function Home() {
  const t = await getTranslations();
  const billing = await database()
    .prepare('SELECT enabled FROM profile_billing_settings WHERE id=1')
    .first<{ enabled: number }>()
    .catch(() => null);
  const checkoutSettings = await database()
    .prepare('SELECT enabled FROM checkout_pricing WHERE id=1')
    .first<{ enabled: number }>()
    .catch(() => null);
  const checkoutAvailable =
    paysuiteReady(env) && checkoutSettings?.enabled === 1;
  const [products, allPlans, heroMedia] = await Promise.all([
    getProducts(),
    getManagedPlans(),
    getHeroMedia(),
  ]);
  const plans = allPlans
    .filter((p) => p.active)
    .sort((a, b) => planMeticais(a) - planMeticais(b));
  return (
    <div className="framy-home phase-one">
      <PublicHeader />
      <main id="main">
        <section className="public-hero">
          <div className="public-hero-copy">
            <span className="public-eyebrow">
              {t('PESSOAS. EQUIPAS. NOVAS CONEXÕES.')}
            </span>
            <h1>
              {t('A sua equipa conecta.')}{' '}
              <em>{t('A sua empresa acompanha.')}</em>
            </h1>
            <p>
              {t(
                'Apresente-se com um perfil profissional. Partilhe contactos por NFC ou QR e acompanhe a actividade e os contactos recebidos nas campanhas da sua equipa.',
              )}
            </p>
            <div className="public-actions">
              <ProfileStart />
              <Link
                className="public-button public-button-outline"
                href="#produtos"
              >
                {t('Escolher produto NFC')}
                <ArrowUpRight size={18} aria-hidden="true" />
              </Link>
            </div>
            <p className="public-hero-note">
              {t(
                'Personal gratuito, sem prazo. Produtos físicos e planos pagos à parte.',
              )}
            </p>
            <div className="public-hero-utility">
              <span>{t('O Seu Mundo, Num Toque.')}</span>
              <Link href="/acompanhar">
                {t('Acompanhar a minha encomenda')}
                <ArrowUpRight size={14} aria-hidden="true" />
              </Link>
            </div>
          </div>
          <ConnectionDemo />
        </section>
        <PublicSolutions />
        <HomeSharingScene media={heroMedia} />
        <HomePurchaseOffers
          products={products}
          checkoutAvailable={checkoutAvailable}
        />
        <section className="home-plans" id="planos">
          <div className="home-section-heading">
            <div>
              <h2>{t('Planos e preços')}</h2>
            </div>
          </div>
          <HomeProfilePlans
            plans={plans}
            billingAvailable={billing?.enabled === 1}
            annualAvailable={billing?.enabled === 1 && paysuiteReady(env)}
          />
          {plans.length === 0 ? (
            <p>
              {t(
                'Os planos estão a ser actualizados. Contacte-nos para mais informações.',
              )}
            </p>
          ) : null}
        </section>
        <ProblemPaths />
        <PlanComparison plans={plans} />
        <PlanQuestions />
        <PublicTrust />
        <section className="home-about" id="sobre">
          <h2>
            {t('Quem somos')}
            <span aria-hidden="true">.</span>
          </h2>
          <div className="home-about-content">
            <p className="home-about-intro">
              {t(
                'A Framy Connect aproxima pessoas e empresas através de perfis digitais, produtos NFC e ferramentas para equipas. Começamos em Moçambique, com apoio à configuração e uma experiência pensada para as suas conexões.',
              )}
            </p>
            <Link className="home-text-link" href="/sobre">
              {t('Conheça a Framy Connect')} <ArrowUpRight size={18} />
            </Link>
          </div>
        </section>
        <section className="home-faq" id="perguntas">
          <h2>{t('Perguntas frequentes')}</h2>
          <div>
            {questions.map(([q, a]) => (
              <details key={q}>
                <summary>{t(q)}</summary>
                <p>
                  {q === 'Já posso comprar?' && checkoutAvailable
                    ? t(
                        'Sim. Configure o produto e confirme o total antes de pagar na PaySuite. Entregas fora da cidade de Maputo requerem proposta.',
                      )
                    : t(a)}
                </p>
              </details>
            ))}
          </div>
          <Link className="home-text-link" href="/contacto">
            {t('Falar com a Framy ')}
            <ArrowUpRight size={18} />
          </Link>
        </section>
      </main>
      <div className="home-brand-finale">
        <section className="home-how" id="primeiros-passos">
          <h2>{t('A próxima conexão começa consigo.')}</h2>
          <p>
            {t(
              'Crie o seu perfil gratuito ou descubra como organizar as conexões da sua equipa.',
            )}
          </p>
          <ProfileStart className="home-primary" />
        </section>
        <SiteFooter />
      </div>
    </div>
  );
}
