import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowUpRight, Check, ChevronLeft } from 'lucide-react';
import { products } from '@/lib/catalog';
import { SiteHeader, SiteFooter } from '@/components/site-shell';
import { ProductIcon } from '@/components/product-icon';
export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return { title: products.find((p) => p.id === id)?.name ?? 'Produto' };
}
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const p = products.find((p) => p.id === id);
  if (!p) notFound();
  return (
    <>
      <SiteHeader />
      <main id="main" className="section-wrap detail-page">
        <Link className="back-link" href="/produtos">
          <ChevronLeft size={18} /> Todos os produtos
        </Link>
        <div className="product-detail">
          <div className="product-detail-art">
            <ProductIcon type={p.icon} size={130} />
            <span>{p.name}</span>
          </div>
          <div>
            <span className="eyebrow">{p.category}</span>
            <h1>{p.name}</h1>
            <h2>{p.tagline}</h2>
            <p>{p.description}</p>
            <ul className="benefit-list">
              <li>
                <Check size={19} /> Design alinhado à sua identidade
              </li>
              <li>
                <Check size={19} /> Partilha simples por link
              </li>
              <li>
                <Check size={19} /> Configuração orientada ao seu uso
              </li>
            </ul>
            <div className="quiet-note">
              Preço e entrega sob confirmação. Esta versão ainda não aceita
              pagamentos.
            </div>
            <Link
              className="btn btn-primary"
              href={p.available ? `/dashboard?product=${p.id}` : '/contacto'}
            >
              {p.available
                ? 'Experimentar no espaço de teste'
                : 'Falar sobre esta solução'}{' '}
              <ArrowUpRight size={20} />
            </Link>
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
