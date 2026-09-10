import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowUpRight, Check, ChevronLeft } from 'lucide-react';
import { money } from '@/lib/catalog';
import { getProducts } from '@/lib/server-catalog';
export const dynamic = 'force-dynamic';
import { SiteHeader, SiteFooter } from '@/components/site-shell';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return {
    title: (await getProducts()).find((p) => p.id === id)?.name ?? 'Produto',
  };
}
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const p = (await getProducts()).find((p) => p.id === id);
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
            <img src={p.imageUrl} alt={p.name} width={1254} height={1254} />
            <span>{p.name}</span>
          </div>
          <div>
            <span className="eyebrow">{p.category}</span>
            <h1>{p.name}</h1>
            <h2>{p.tagline}</h2>
            <p className="product-detail-price">
              {p.available ? money(p.amount) : 'Sob consulta'}
            </p>
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
              href={p.available ? `/encomendar/${p.id}` : '/contacto'}
            >
              {p.available
                ? 'Personalizar e comprar'
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
