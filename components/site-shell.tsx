import Image from 'next/image';
import Link from 'next/link';
import { ArrowUpRight, UserRound } from 'lucide-react';
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
        <Link href="/ajuda">Ajuda</Link>
        <Link href="/dashboard">Minha Conta</Link>
        <Link href="/privacidade">Privacidade</Link>
      </div>
    </footer>
  );
}
