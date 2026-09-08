import Image from 'next/image';
import Link from 'next/link';
import {
  ArrowUpRight,
  ArrowRight,
  Nfc,
  UserRound,
  Fingerprint,
  Globe2,
  ContactRound,
} from 'lucide-react';
export default function Home() {
  return (
    <>
      <header className="site-header">
        <Link href="/" aria-label="Framy Connect — início" className="brand">
          <Image
            width={220}
            height={100}
            unoptimized
            src="/brand/logo.svg"
            alt="Framy Connect"
          />
        </Link>
        <nav aria-label="Navegação principal">
          <Link className="active" href="/">
            Página Inicial
          </Link>
          <a href="#sobre">Sobre nós</a>
          <Link href="/produtos">Produtos</Link>
          <Link href="/contacto">Contacto</Link>
        </nav>
        <div className="header-actions">
          <Link className="account-link" href="/dashboard">
            <UserRound size={18} /> Minha Conta
          </Link>
          <Link className="btn btn-primary" href="/produtos">
            Compre agora <ArrowUpRight size={19} />
          </Link>
        </div>
      </header>
      <main id="main">
        <section className="hero section-wrap">
          <div className="hero-copy">
            <span className="eyebrow">
              <span className="tiny-dot" /> UMA NOVA FORMA DE SE CONECTAR
            </span>
            <h1>
              O Seu Mundo,
              <br />
              <span>Num Toque.</span>
            </h1>
            <p className="hero-english">An entire identity, instantly.</p>
            <p className="hero-description">
              Quem você é. O que conquistou. O que representa. Tudo acessível,
              partilhável e pronto para ser descoberto, num único toque.
            </p>
            <div className="hero-actions">
              <Link className="btn btn-primary" href="/produtos">
                Descobrir produtos <ArrowUpRight size={22} />
              </Link>
              <a className="btn btn-outline" href="#como-funciona">
                Como funciona <ArrowRight size={19} />
              </a>
            </div>
            <div className="hero-note">
              <Nfc size={20} />
              <span>Um toque. Sem aplicações. Mais conexões.</span>
            </div>
          </div>
          <div className="identity-stage">
            <div className="stage-label">
              <span>IDENTIDADE DIGITAL</span>
              <ArrowUpRight size={19} />
            </div>
            <article className="identity-card">
              <div className="identity-cover">
                <Fingerprint size={42} strokeWidth={1} />
                <span>
                  O seu próximo
                  <br />
                  encontro começa aqui.
                </span>
                <Nfc size={34} />
              </div>
              <div className="identity-body">
                <div className="avatar">FC</div>
                <span className="small-label">EXEMPLO DE PERFIL</span>
                <h2>
                  A sua melhor
                  <br />
                  primeira impressão.
                </h2>
                <p>
                  O seu nome. O seu trabalho.
                  <br />
                  Todas as suas ligações.
                </p>
                <div className="contact-chips">
                  <span>
                    <Globe2 size={18} /> Portefólio
                  </span>
                  <span>
                    <ContactRound size={18} /> Contactos
                  </span>
                </div>
                <Link className="btn btn-dark" href="/dashboard">
                  Criar a minha identidade <ArrowUpRight size={20} />
                </Link>
              </div>
            </article>
            <div className="stage-bottom">
              <span>
                FEITO PARA PESSOAS.
                <br />
                PENSADO PARA CONECTAR.
              </span>
              <span className="round-arrow">
                <ArrowUpRight />
              </span>
            </div>
          </div>
        </section>
        <div className="audience-strip">
          <span>INDIVÍDUOS</span>
          <span>CRIADORES</span>
          <span>PROFISSIONAIS</span>
          <span>INSTITUIÇÕES</span>
          <span>ORGANIZAÇÕES</span>
        </div>
        <section className="about-section section-wrap" id="sobre">
          <div>
            <span className="eyebrow">01 / QUEM SOMOS</span>
            <h2>
              Mais do que um cartão.
              <br />
              <em>Uma porta para si.</em>
            </h2>
          </div>
          <div>
            <p className="large-copy">
              Fazemos do toque uma forma simples de apresentar quem é — e abrir
              espaço para o que vem a seguir.
            </p>
            <p>
              A Framy Connect liga a sua identidade ao mundo físico. Do cartão
              que leva consigo ao perfil que pode actualizar, as suas conexões
              acompanham a sua evolução.
            </p>
            <Link className="text-link" href="/sobre">
              Conheça a Framy Connect <ArrowUpRight size={20} />
            </Link>
          </div>
        </section>
        <section className="how-section section-wrap" id="como-funciona">
          <span className="eyebrow">SIMPLES, DO PRIMEIRO AO PRÓXIMO TOQUE</span>
          <div className="steps">
            <article>
              <span>01</span>
              <h3>Crie a sua identidade</h3>
              <p>Escolha os contactos e as ligações que quer partilhar.</p>
            </article>
            <article>
              <span>02</span>
              <h3>Escolha o seu produto</h3>
              <p>Encontre o formato que faz parte do seu dia a dia.</p>
            </article>
            <article>
              <span>03</span>
              <h3>Toque. E conecte-se.</h3>
              <p>Aproxime de um telemóvel compatível ou partilhe o seu link.</p>
            </article>
          </div>
          <Link className="btn btn-primary" href="/produtos">
            Encontre o seu próximo toque <ArrowUpRight size={22} />
          </Link>
        </section>
      </main>
      <footer className="site-footer">
        <div className="footer-top">
          <Link className="brand" href="/">
            <Image
              width={220}
              height={100}
              unoptimized
              src="/brand/logo.svg"
              alt="Framy Connect"
            />
          </Link>
          <p>O Seu Mundo. Num Toque.</p>
          <Link href="/contacto">
            Vamos conversar <ArrowUpRight size={19} />
          </Link>
        </div>
        <div className="footer-bottom">
          <span>© 2026 Framy Connect</span>
          <span>Feito para Moçambique. Ligado ao mundo.</span>
          <Link href="/dashboard">Minha Conta</Link>
        </div>
      </footer>
    </>
  );
}
