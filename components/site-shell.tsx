import Image from 'next/image';
import Link from 'next/link';
import { ArrowUpRight, UserRound, Mail, ShieldCheck } from 'lucide-react';
export function SiteHeader() {
  return (
    <header className="site-header">
      <Link href="/" className="brand">
        <Image
          width={220}
          height={100}
          unoptimized
          src="/brand/logo.svg"
          alt="Framy Connect"
        />
      </Link>
      <nav aria-label="Navegação principal">
        <Link href="/">Página Inicial</Link>
        <Link href="/sobre">Sobre nós</Link>
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
  );
}
export function SiteFooter() {
  return (
    <footer className="brand-footer">
      <div className="brand-footer-inner">
        <div className="brand-footer-grid">
          <div className="brand-footer-about">
            <Link href="/" aria-label="Framy Connect — início">
              <Image
                src="/brand/logo.svg"
                alt="Framy Connect"
                width={220}
                height={100}
                unoptimized
              />
            </Link>
            <p>
              A sua identidade, os seus contactos e o seu trabalho. Tudo ligado,
              num único toque.
            </p>
            <p className="brand-footer-tagline">O Seu Mundo num Toque.</p>
          </div>
          <nav aria-label="Navegação do rodapé">
            <h2>Navegação</h2>
            <Link href="/">Página Inicial</Link>
            <Link href="/sobre">Sobre nós</Link>
            <Link href="/produtos">Produtos</Link>
            <Link href="/contacto">Contacto</Link>
            <Link href="/aplicar">Torne-se agente</Link>
          </nav>
          <div className="brand-footer-contact">
            <h2>Fale connosco</h2>
            <a href="mailto:info@framyconnect.co.mz">
              <Mail size={16} />
              <span>
                <small>Produtos e soluções</small>info@framyconnect.co.mz
              </span>
            </a>
            <a href="mailto:support@framyconnect.co.mz">
              <Mail size={16} />
              <span>
                <small>Apoio ao cliente</small>support@framyconnect.co.mz
              </span>
            </a>
            <Link className="brand-footer-pill" href="/contacto">
              Vamos conversar <ArrowUpRight size={15} />
            </Link>
          </div>
          <nav aria-label="Conta e apoio">
            <h2>A sua Framy</h2>
            <Link href="/dashboard">Minha Conta</Link>
            <Link href="/perfil">A minha identidade</Link>
            <Link href="/ajuda">Centro de ajuda</Link>
            <Link className="brand-footer-pill" href="/privacidade">
              <ShieldCheck size={15} />
              Privacidade
            </Link>
          </nav>
        </div>
        <div className="brand-footer-bottom">
          <span>
            © {new Date().getFullYear()} Framy Connect. Todos os direitos
            reservados.
          </span>
          <div>
            <Link href="/privacidade">Política de privacidade</Link>
            <Link href="/termos">Termos de utilização</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
