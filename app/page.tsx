import { SourceImage } from '@/components/source-image';
import { AccountMenu } from '@/components/account-menu';
import Image from 'next/image';
import Link from '@/components/hard-link';
import {
  ArrowUpRight,
  Eye,
  Target,
  Nfc,
  Smartphone,
  RefreshCw,
} from 'lucide-react';
import { SiteFooter } from '@/components/site-shell';
import { HomeHeroScene } from '@/components/home-hero-scene';
import { HomeSharingScene } from '@/components/home-sharing-scene';
import { getProducts } from '@/lib/server-catalog';
import { getManagedPlans } from '@/lib/server-plans';
import { money } from '@/lib/catalog';
import './home.css';

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
    'Os produtos físicos e os planos digitais são apresentados separadamente. A inclusão de um plano na compra e as condições comerciais serão confirmadas antes do lançamento.',
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
export default async function Home() {
  const [products, allPlans] = await Promise.all([
    getProducts(),
    getManagedPlans(),
  ]);
  const featured = [...products]
    .sort((a, b) => Number(b.available) - Number(a.available))
    .slice(0, 4);
  const plans = allPlans
    .filter((p) => p.active)
    .sort((a, b) => a.dollars - b.dollars);
  return (
    <div className="framy-home">
      <header className="home-nav">
        <Link href="/" aria-label="Framy Connect — início">
          <Image
            src="/brand/logo.svg"
            alt="Framy Connect"
            width={220}
            height={100}
            unoptimized
            className="home-brand"
          />
        </Link>
        <nav aria-label="Navegação principal">
          <a href="#como-funciona">Como funciona</a>
          <a href="#produtos">Produtos</a>
          <a href="#planos">Planos</a>
          <a href="#sobre">Sobre nós</a>
        </nav>
        <div className="home-nav-actions">
          <AccountMenu className="home-account" />
          <Link className="home-buy" href="/produtos">
            Ver produtos <ArrowUpRight size={16} />
          </Link>
        </div>
      </header>
      <main id="main">
        <section className="home-hero">
          <div className="home-hero-inner">
            <div className="home-hero-copy">
              <h1>
                O Seu Mundo,
                <br />
                Num Toque.
              </h1>
              <p className="home-offer">
                Cartões e acessórios NFC que partilham o seu perfil digital por
                toque ou QR.
              </p>
              <p>
                Os seus contactos, redes sociais e trabalho num só lugar.
                Escolha o formato que o acompanha e actualize o perfil sempre
                que precisar.
              </p>
              <div className="home-hero-actions">
                <Link className="home-primary" href="/produtos">
                  Escolher o meu produto <ArrowUpRight size={18} />
                </Link>
                <a className="home-secondary" href="#como-funciona">
                  Como funciona <Nfc size={19} />
                </a>
              </div>
              <div className="home-hero-benefits">
                <span>
                  <Nfc />
                  Toque ou QR
                </span>
                <span>
                  <Smartphone />
                  Abre no navegador
                </span>
                <span>
                  <RefreshCw />
                  Perfil actualizável
                </span>
              </div>
            </div>
            <HomeHeroScene />
          </div>
        </section>
        <HomeSharingScene />
        <section className="home-products" id="produtos">
          <div className="home-section-heading">
            <div>
              <h2>Um formato para o seu dia.</h2>
              <p>
                Explore os produtos em destaque e encontre o seu próximo toque.
              </p>
            </div>
            <Link className="home-text-link" href="/produtos">
              Ver todos os produtos <ArrowUpRight size={18} />
            </Link>
          </div>
          <p className="home-disclosure">
            Catálogo em preparação. Valores de demonstração em MT; preços e
            disponibilidade comercial a confirmar antes do lançamento.
          </p>
          <div className="home-products-grid">
            {featured.map((p) => (
              <Link
                className="home-product"
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
                  <h3>{productNames[p.name] ?? p.name}</h3>
                  <p>{p.tagline}</p>
                  <strong className="home-product-price">
                    {p.available ? money(p.amount) : 'Sob consulta'}
                  </strong>
                  <span className="home-product-status">
                    {p.available
                      ? 'Produto físico · valor de demonstração'
                      : 'Contacte-nos para conhecer esta solução'}
                  </span>
                  <ArrowUpRight size={18} />
                </div>
              </Link>
            ))}
          </div>
        </section>
        <section className="home-plans" id="planos">
          <div className="home-section-heading">
            <div>
              <h2>Mais espaço para o seu perfil.</h2>
              <p>
                Planos digitais mensais em USD. Compare o número de links e o
                espaço de apresentação.
              </p>
            </div>
          </div>
          <p className="home-disclosure">
            Planos de demonstração, sem cobrança nesta prévia. Produto físico e
            subscrição apresentados separadamente.
          </p>
          <div className="home-plans-grid">
            {plans.map((p) => (
              <article className="home-plan" key={p.id}>
                <h3>{p.name}</h3>
                <p>{p.description}</p>
                <div className="home-plan-price">
                  US${' '}
                  {new Intl.NumberFormat('pt-MZ', {
                    maximumFractionDigits: 2,
                  }).format(p.dollars)}
                  <span>{p.id === 'free-30' ? ' / 30 dias' : ' / mês'}</span>
                </div>
                <ul>
                  <li>Até {p.links} links no perfil</li>
                  <li>
                    {p.bio > 0
                      ? `Biografia até ${p.bio} caracteres`
                      : 'Contactos essenciais, sem biografia'}
                  </li>
                </ul>
              </article>
            ))}
          </div>
          {plans.length === 0 ? (
            <p>
              Os planos estão a ser actualizados. Contacte-nos para mais
              informações.
            </p>
          ) : (
            <Link className="home-text-link" href="/perfil?plans=1">
              Explorar planos na minha conta <ArrowUpRight size={18} />
            </Link>
          )}
        </section>
        <section className="home-audience" id="quem-atendemos">
          <h2>Uma conexão à sua medida.</h2>
          <div className="home-audience-grid">
            {audiences.map(([name, text]) => (
              <article className="home-audience-card" key={name}>
                <h3>{name}</h3>
                <p>{text}</p>
              </article>
            ))}
          </div>
        </section>
        <section className="home-about" id="sobre">
          <h2>
            Quem somos<span aria-hidden="true">.</span>
          </h2>
          <div className="home-about-content">
            <p className="home-about-intro">
              A Framy Connect transforma cartões, etiquetas e pulseiras em
              identidades digitais instantâneas. Com um simples toque, pessoas e
              organizações podem partilhar e comprovar quem são, o que
              conquistaram e o que representam, de forma simples, confiável e
              acessível.
            </p>
            <div className="home-purpose-grid">
              <article>
                <span className="home-purpose-icon">
                  <Eye />
                </span>
                <h3>Visão</h3>
                <p>
                  Fazer do toque a linguagem universal da identidade, para cada
                  pessoa e cada instituição à qual pertencem.
                </p>
              </article>
              <article>
                <span className="home-purpose-icon">
                  <Target />
                </span>
                <h3>Missão</h3>
                <p>
                  Transformar cada toque numa conexão de confiança, tornando
                  identidades, conquistas e pertenças instantaneamente
                  acessíveis, verificáveis e universais.
                </p>
              </article>
            </div>
          </div>
        </section>
        <section className="home-faq" id="perguntas">
          <h2>Antes do primeiro toque.</h2>
          <div>
            {questions.map(([q, a]) => (
              <details key={q}>
                <summary>{q}</summary>
                <p>{a}</p>
              </details>
            ))}
          </div>
          <Link className="home-text-link" href="/contacto">
            Falar com a Framy <ArrowUpRight size={18} />
          </Link>
        </section>
        <section className="home-how" id="primeiros-passos">
          <h2>Pronto para a próxima conexão?</h2>
          <p>
            Escolha o seu produto. Depois, seleccione o plano e personalize o
            seu perfil.
          </p>
          <Link className="home-primary" href="/produtos">
            Escolher o meu produto <ArrowUpRight size={18} />
          </Link>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
