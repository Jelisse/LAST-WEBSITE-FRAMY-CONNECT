import { database } from '@/lib/server-db';
import { HomeProfilePlans } from '@/components/home-profile-plans';
import { getTranslations } from '@/lib/server-i18n';
import { LanguageSelector } from '@/components/language-provider';
import { planMeticais } from '@/lib/plan-pricing';
import { publicPageRobots } from '@/lib/server-site';
import { HomePurchaseOffers } from '@/components/home-purchase-offers';
import { AccountMenu } from '@/components/account-menu';
import { HomeMobileMenu } from '@/components/home-mobile-menu';
import { HomeHeader } from '@/components/home-header';
import Image from 'next/image';
import Link from '@/components/hard-link';
import { ArrowUpRight, Nfc, Smartphone, RefreshCw } from 'lucide-react';
import { SiteFooter } from '@/components/site-shell';
import { getHeroMedia } from '@/lib/server-hero-media';
import { HomeHeroScene } from '@/components/home-hero-scene';
import { HomeSharingScene } from '@/components/home-sharing-scene';
import { getProducts } from '@/lib/server-catalog';
import { getManagedPlans } from '@/lib/server-plans';
import './home-solutions.css';
import './home.css';
import './home-atmosphere.css';
import './home-interactions.css';
import './home-featured.css';

const audiences = [
  [
    'Indivíduos',
    'Reúna os seus contactos e partilhe-os nas conversas do dia a dia.',
  ],
  [
    'Criadores',
    'Dê acesso às suas redes sociais, vídeos e portefólio num único perfil.',
  ],
  [
    'Profissionais',
    'Apresente o seu trabalho e facilite o contacto depois de cada encontro.',
  ],
  [
    'Instituições',
    'Organize os links e os recursos que quer disponibilizar à sua comunidade.',
  ],
  [
    'Organizações',
    'Apresente a equipa, os serviços e os contactos da sua organização.',
  ],
];
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
    'O produto físico é pago separadamente do perfil digital. Pode experimentar o perfil durante 30 dias, sem renovação automática. Consulte as condições do plano antes de comprar.',
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
export const metadata = { robots: publicPageRobots() };
export default async function Home() {
  const t = await getTranslations();
  const billing = await database()
    .prepare('SELECT enabled FROM profile_billing_settings WHERE id=1')
    .first<{ enabled: number }>()
    .catch(() => null);
  const [products, allPlans, heroMedia] = await Promise.all([
    getProducts(),
    getManagedPlans(),
    getHeroMedia(),
  ]);
  const plans = allPlans
    .filter((p) => p.active)
    .sort((a, b) => planMeticais(a) - planMeticais(b));
  return (
    <div className="framy-home">
      <HomeHeader>
        <Link href="/" aria-label={t('Framy Connect — início')}>
          <Image
            src="/brand/logo.svg"
            alt={t('Framy Connect')}
            width={220}
            height={100}
            unoptimized
            className="home-brand"
          />
        </Link>
        <nav aria-label={t('Navegação principal')}>
          <a href="#como-funciona">{t('Como funciona')}</a>
          <a href="#produtos">{t('Produtos')}</a>
          <a href="#planos">{t('Planos')}</a>
          <a href="#sobre">{t('Sobre nós')}</a>
        </nav>
        <div className="home-nav-actions">
          <LanguageSelector />
          <Link className="home-agent" href="/aplicar">
            {t('Tornar-se agente')}
          </Link>
          <AccountMenu className="home-account" />
          <HomeMobileMenu />
        </div>
      </HomeHeader>
      <main id="main">
        <section className="home-hero">
          <div className="home-hero-inner">
            <div className="home-hero-copy">
              <h1>
                <span>
                  {t('Uma identidade,')}
                  <br />
                  {t('mais conexões.')}
                </span>
                <svg
                  className="home-contactless-mark"
                  viewBox="0 0 48 64"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  aria-hidden="true"
                  focusable="false"
                >
                  <path d="M7 25 Q12 32 7 39" />
                  <path d="M17 18 Q27 32 17 46" />
                  <path d="M27 11 Q42 32 27 53" />
                  <path d="M37 4 Q57 32 37 60" />
                </svg>
              </h1>
              <p className="home-offer">
                {t(
                  'Cartão e porta-chaves. Uma presença profissional, ligada ao mesmo perfil digital.',
                )}
              </p>
              <div className="home-hero-actions">
                <Link className="home-primary" href="/comprar">
                  {t('Explorar o kit completo ')}
                  <ArrowUpRight size={18} />
                </Link>
                <a className="home-secondary" href="#como-funciona">
                  {t('Como funciona ')}
                  <Nfc size={19} />
                </a>
              </div>
              <div className="home-hero-benefits">
                <span>
                  <Nfc />
                  {t('Toque ou QR')}
                </span>
                <span>
                  <Smartphone />
                  {t('Abre no navegador')}
                </span>
                <span>
                  <RefreshCw />
                  {t('Perfil actualizável')}
                </span>
              </div>
            </div>
            <HomeHeroScene media={heroMedia} />
          </div>
        </section>
        <HomeSharingScene media={heroMedia} />
        <HomePurchaseOffers products={products} />
        <section className="home-plans" id="planos">
          <div className="home-section-heading">
            <div>
              <h2>{t('Planos para o seu perfil digital')}</h2>
              <p>
                {t(
                  'Um perfil para o cartão e o porta-chaves. Escolha a presença digital que acompanha o seu trabalho.',
                )}
              </p>
            </div>
          </div>
          <p className="home-disclosure">
            {t(
              billing?.enabled
                ? 'Experimente grátis durante 30 dias. Renove mensalmente quando quiser, sem renovação automática.'
                : 'Experimente durante 30 dias, sem renovação automática. Enquanto os planos mensais não abrirem, prolongamos o acesso sem cobrança.',
            )}
          </p>
          {plans.find((p) => p.id === 'free-30') && (
            <div className="home-trial-banner">
              <strong>{t('30 dias grátis')}</strong>
              <span>
                {t(
                  'Experimente 20 links e 600 caracteres de biografia, sem renovação automática.',
                )}
              </span>
              <Link className="home-text-link" href="/perfil?plans=1">
                {t('Começar 30 dias grátis')} <ArrowUpRight size={18} />
              </Link>
            </div>
          )}
          <p className="home-disclosure">
            {t(
              'Instagram, WhatsApp e website: 3 links à sua escolha. Nome, email, telefone e dados do negócio não ocupam links.',
            )}
          </p>
          <HomeProfilePlans
            plans={plans}
            billingAvailable={billing?.enabled === 1}
          />
          {plans.length === 0 ? (
            <p>
              {t(
                'Os planos estão a ser actualizados. Contacte-nos para mais informações.',
              )}
            </p>
          ) : (
            <Link className="home-text-link" href="/perfil?plans=1">
              {t('Explorar planos na minha conta ')}
              <ArrowUpRight size={18} />
            </Link>
          )}
        </section>
        <section className="home-audience" id="quem-atendemos">
          <h2>{t('Uma conexão à sua medida.')}</h2>
          <div className="home-audience-grid">
            {audiences.map(([name, text]) => (
              <article className="home-audience-card" key={name}>
                <h3>{t(name)}</h3>
                <p>{t(text)}</p>
              </article>
            ))}
          </div>
        </section>
        <section className="home-about" id="sobre">
          <h2>
            {t('Quem somos')}
            <span aria-hidden="true">.</span>
          </h2>
          <div className="home-about-content">
            <p className="home-about-intro">
              {t(
                'A Framy Connect liga os seus produtos NFC a um perfil digital com contactos, redes sociais e trabalho. Uma forma simples de se apresentar e manter a sua informação actualizada.',
              )}
            </p>
            <Link className="home-text-link" href="/sobre">
              {t('Conheça a Framy Connect')} <ArrowUpRight size={18} />
            </Link>
          </div>
        </section>
        <section className="home-faq" id="perguntas">
          <h2>{t('Antes do primeiro toque.')}</h2>
          <div>
            {questions.map(([q, a]) => (
              <details key={q}>
                <summary>{t(q)}</summary>
                <p>{t(a)}</p>
              </details>
            ))}
          </div>
          <Link className="home-text-link" href="/contacto">
            {t('Falar com a Framy ')}
            <ArrowUpRight size={18} />
          </Link>
        </section>
        <section className="home-how" id="primeiros-passos">
          <h2>{t('Pronto para a próxima conexão?')}</h2>
          <p>
            {t(
              'Explore a sua solução, escolha os materiais e o design. Prepare a sua próxima apresentação.',
            )}
          </p>
          <Link className="home-primary" href="/comprar">
            {t('Explorar o kit completo ')}
            <ArrowUpRight size={18} />
          </Link>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
