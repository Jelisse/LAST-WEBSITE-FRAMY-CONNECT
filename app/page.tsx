import { AccountMenu } from '@/components/account-menu';
import Image from 'next/image';
import Link from 'next/link';
import {
  ArrowUpRight,
  Eye,
  Target,
  Star,
  BriefcaseBusiness,
  Store,
  Building2,
  UsersRound,
  Nfc,
  ShieldCheck,
  Smartphone,
} from 'lucide-react';
import { SiteFooter } from '@/components/site-shell';
import { HomeHeroScene } from '@/components/home-hero-scene';
import { HomeSharingScene } from '@/components/home-sharing-scene';

import { getProducts } from '@/lib/server-catalog';
import './home.css';

const audiences = [
  { name: 'Indivíduos', text: 'Este sou eu.', icon: Star },
  {
    name: 'Criadores',
    text: 'Este é o meu trabalho, segue-me.',
    icon: BriefcaseBusiness,
  },
  {
    name: 'Profissionais',
    text: 'Esta é a minha credencial, confie nela.',
    icon: Store,
  },
  { name: 'Instituições', text: 'Este é quem pertence aqui.', icon: Building2 },
  {
    name: 'Organizações',
    text: 'Este é quem nos representa.',
    icon: UsersRound,
  },
];

export const dynamic = 'force-dynamic';
export default async function Home() {
  const products = await getProducts();
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
          <Link href="/" aria-current="page">
            Página Inicial
          </Link>
          <a href="#sobre">Sobre nós</a>
          <a href="#produtos">Produtos</a>
          <Link href="/contacto">Contacto</Link>
        </nav>
        <div className="home-nav-actions">
          <AccountMenu className="home-account" />
          <Link className="home-buy" href="/produtos">
            Compre agora
          </Link>
          <Link className="home-agent" href="/aplicar">
            Torne-se agente
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
              <h2>
                An entire identity,
                <br />
                instantly.
              </h2>
              <p>
                Quem você é. O que conquistou. O que representa. Tudo acessível,
                partilhável e pronto para ser descoberto, num único toque.
              </p>
              <div className="home-hero-actions">
                <Link className="home-primary" href="/produtos">
                  Compre agora <ArrowUpRight size={18} />
                </Link>
                <a className="home-secondary" href="#como-funciona">
                  Como funciona <Nfc size={19} />
                </a>
              </div>
              <div className="home-hero-benefits">
                <span>
                  <Nfc />
                  Partilhe instantaneamente
                  <br />o que importa
                </span>
                <span>
                  <Smartphone />
                  Sem apps.
                  <br />
                  Sem complicações.
                </span>
                <span>
                  <ShieldCheck />
                  Ligação segura
                  <br />e actualizável
                </span>
              </div>
            </div>
            <HomeHeroScene />
          </div>
        </section>
        <HomeSharingScene />
        <section className="home-about" id="sobre">
          <h2>
            Quem
            <br />
            Somos
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
                <h3>VISÃO</h3>
                <p>
                  Fazer do toque a linguagem universal da identidade, para cada
                  pessoa e cada instituição à qual pertencem.
                </p>
              </article>
              <article>
                <span className="home-purpose-icon">
                  <Target />
                </span>
                <h3>MISSÃO</h3>
                <p>
                  Transformar cada toque numa conexão de confiança, tornando
                  identidades, conquistas e pertenças instantaneamente
                  acessíveis, verificáveis e universais.
                </p>
              </article>
            </div>
          </div>
        </section>
        <section className="home-products" id="produtos">
          <h2>PRODUTOS</h2>
          <div className="home-products-grid">
            {products.map((p) => (
              <Link
                className="home-product"
                key={p.id}
                href={`/produtos/${p.id}`}
              >
                <div className="home-product-art">
                  <img
                    src={p.imageUrl}
                    alt={p.name}
                    width={1254}
                    height={1254}
                    loading="lazy"
                  />
                </div>
                <div className="home-product-copy">
                  <h3>{p.name}</h3>
                  <p>{p.tagline}</p>
                  <ArrowUpRight size={18} />
                </div>
              </Link>
            ))}
          </div>
        </section>
        <section className="home-audience" id="quem-atendemos">
          <h2>
            Quem
            <br />
            atendemos
          </h2>
          <div className="home-audience-grid">
            {audiences.map(({ name, text, icon: Icon }) => (
              <Link href="/produtos" className="home-audience-card" key={name}>
                <div>
                  <h3>{name}</h3>
                  <p>{text}</p>
                </div>
                <span>
                  <Icon />
                </span>
              </Link>
            ))}
          </div>
        </section>
        <section className="home-how" id="primeiros-passos">
          <h2>Do primeiro toque à próxima conexão.</h2>
          <div>
            {[
              [
                '01',
                'Crie a sua identidade',
                'Escolha a fotografia, os contactos e os links que quer partilhar.',
              ],
              [
                '02',
                'Escolha o seu produto',
                'Encontre o formato que faz parte do seu dia a dia.',
              ],
              [
                '03',
                'Toque. E conecte-se.',
                'Aproxime de um telemóvel compatível ou partilhe o seu QR.',
              ],
            ].map(([number, title, text]) => (
              <article key={number}>
                <span>{number}</span>
                <h3>{title}</h3>
                <p>{text}</p>
              </article>
            ))}
          </div>
          <Link className="home-primary" href="/dashboard">
            Criar a minha identidade <ArrowUpRight size={18} />
          </Link>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
