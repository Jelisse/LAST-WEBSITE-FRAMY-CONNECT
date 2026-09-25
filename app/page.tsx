import { CorporatePlan } from '@/components/corporate-plan';
import { getTranslations } from '@/lib/server-i18n';
import { LanguageSelector } from '@/components/language-provider';
import { planMeticais, planPrice } from '@/lib/plan-pricing';
import { publicPageRobots } from '@/lib/server-site';
import { SourceImage } from '@/components/source-image';
import { AccountMenu } from '@/components/account-menu';
import { HomeMobileMenu } from '@/components/home-mobile-menu';
import Image from 'next/image';
import Link from '@/components/hard-link';
import {
  ArrowUpRight,
  Nfc,
  Smartphone,
  RefreshCw,
} from 'lucide-react';
import { SiteFooter } from '@/components/site-shell';
import { getHeroMedia } from '@/lib/server-hero-media';
import { HomeHeroScene } from '@/components/home-hero-scene';
import { HomeSharingScene } from '@/components/home-sharing-scene';
import { getProducts } from '@/lib/server-catalog';
import { getManagedPlans } from '@/lib/server-plans';
import { money, productOrder } from '@/lib/catalog';
import './home.css';
import './home-atmosphere.css';

const productNames: Record<string, string> = {
  'PVC Business Cards': 'Cartão NFC em PVC',
  'Wooden Business Cards': 'Cartão NFC em madeira',
  'Metal NFC Card': 'Cartão NFC em metal',
  'NFC Keychain': 'Porta-chaves NFC',
  'NFC Tag': 'Etiqueta NFC',
  'NFC Sticker': 'Autocolante NFC',
  'NFC Bracelet': 'Pulseira NFC',
  'Smart Event Badge': 'Crachá para eventos',
  'Restaurant QR Menu': 'Menu digital QR',
  'Google Review Stand': 'Suporte de avaliações Google',
  'Digital Catalog': 'Catálogo digital',
  'Employee Card': 'Cartão de colaborador',
};
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
  const [products, allPlans, heroMedia] = await Promise.all([
    getProducts(),
    getManagedPlans(),
    getHeroMedia(),
  ]);
  const featured = products
    .filter((p) => p.published !== false)
    .sort((a, b) => Number(b.available) - Number(a.available) || productOrder(a, b))
    .slice(0, 4);
  const plans = allPlans
    .filter((p) => p.active)
    .sort((a, b) => planMeticais(a) - planMeticais(b));
  return (
    <div className="framy-home">
      <header className="home-nav">
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
      </header>
      <main id="main">
        <section className="home-hero">
          <div className="home-hero-inner">
            <div className="home-hero-copy">
              <h1>
                <span>
                {t('O Seu Mundo,')}
                <br />
                {t('Num Toque.')}
                </span>
                <svg className="home-contactless-mark" viewBox="0 0 48 64" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" aria-hidden="true" focusable="false">
                  <path d="M7 25 Q12 32 7 39" />
                  <path d="M17 18 Q27 32 17 46" />
                  <path d="M27 11 Q42 32 27 53" />
                  <path d="M37 4 Q57 32 37 60" />
                </svg>
              </h1>
              <p className="home-offer">
                {t(
                  'Partilhe contactos, redes sociais e trabalho por toque ou QR.',
                )}
              </p>
              <div className="home-hero-actions">
                <Link className="home-primary" href="/produtos">
                  {t('Escolher o meu produto ')}
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
        <section className="home-products" id="produtos">
          <div className="home-section-heading">
            <div>
              <h2>{t('Um formato para o seu dia.')}</h2>
              <p>
                {t(
                  'Explore os produtos em destaque e encontre o seu próximo toque.',
                )}
              </p>
            </div>
            <Link className="home-text-link" href="/produtos">
              {t('Ver todos os produtos ')}
              <ArrowUpRight size={18} />
            </Link>
          </div>
          <p className="home-disclosure">
            {t(
              'Porta-chaves NFC disponíveis. Os restantes produtos chegam brevemente.',
            )}
          </p>
          <div className={`home-products-grid${featured.some(p => p.available) ? " has-available" : ""}`}>
            {featured.map((p) => (
              <Link
                className={`home-product ${p.available ? 'is-available' : 'is-coming-soon'}`}
                key={p.id}
                href={`/produtos/${p.id}`}
              >
                <div className="home-product-art">
                  <SourceImage
                    src={p.imageUrl}
                    alt=""
                    width={1254}
                    height={1254}
                    loading="lazy"
                  />
                </div>
                <div className="home-product-copy">
                  <h3>{t(productNames[p.name] ?? p.name)}</h3>
                  <p>{t(p.tagline)}</p>
                  <strong className="home-product-price">
                    {p.available ? money(p.amount, t.locale) : t('Brevemente')}
                  </strong>
                  <span className="home-product-status">
                    {p.available
                      ? t('Produto físico · disponível para encomenda')
                      : t('Brevemente · compra ainda indisponível')}
                  </span>
                  <span className="home-product-action">{p.available ? t("Encomendar agora") : t("Ver detalhes")} <ArrowUpRight size={18} /></span>
                </div>
              </Link>
            ))}
          </div>
        </section>
        <section className="home-plans" id="planos">
          <div className="home-section-heading">
            <div>
              <h2>{t('Mais espaço para o seu perfil.')}</h2>
              <p>
                {t(
                  'Planos digitais mensais em meticais. Compare o número de links e o espaço de apresentação.',
                )}
              </p>
            </div>
          </div>
          <p className="home-disclosure">
            {t(
              'Comece com 30 dias gratuitos, sem renovação automática. Os planos mensais ainda não aceitam adesões. O produto físico é pago separadamente.',
            )}
          </p>
          {plans.find(p => p.id === 'free-30') && <div className="home-trial-banner">
            <strong>{t('30 dias grátis')}</strong>
            <span>{t('Experimente 20 links e 600 caracteres de biografia, sem renovação automática.')}</span>
            <Link className="home-text-link" href="/perfil?plans=1">{t('Começar 30 dias grátis')} <ArrowUpRight size={18} /></Link>
          </div>}
          <div className="home-plans-grid">
            {plans.filter(p => p.id !== 'free-30').map((p) => (
              <article className={`home-plan${p.id === "free-30" ? " home-plan-trial" : ""}`} key={p.id}>
                <span className="home-plan-label">{p.id === "free-30" ? t("Experimente primeiro") : t("Adesões em breve")}</span>
                <h3>{t(p.name)}</h3>
                <p>{t(p.description)}</p>
                <div className="home-plan-price">
                  {planPrice(p, t.locale)}
                  <span>
                    {p.id === 'free-30' ? t(' / 30 dias') : t(' / mês')}
                  </span>
                </div>
                <ul>
                  <li>
                    {t('Até ')}
                    {p.links}
                    {t(' links no perfil')}
                  </li>
                  <li>
                    {p.bio > 0
                      ? t('Biografia até {0} caracteres', [p.bio])
                      : t('Contactos essenciais, sem biografia')}
                  </li>
                </ul>
              </article>
            ))}
            <CorporatePlan />
          </div>
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
            <Link className="home-text-link" href="/sobre">{t("Conheça a Framy Connect")} <ArrowUpRight size={18} /></Link>
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
              'Escolha o seu produto. Depois, seleccione o plano e personalize o seu perfil.',
            )}
          </p>
          <Link className="home-primary" href="/produtos">
            {t('Escolher o meu produto ')}
            <ArrowUpRight size={18} />
          </Link>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
