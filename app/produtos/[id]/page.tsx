import { ProductGallery } from '@/components/product-gallery';
import { publicPageRobots } from '@/lib/server-site';
import { notFound } from 'next/navigation';
import Link from '@/components/hard-link';
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
    robots: publicPageRobots(),
    title:
      (await getProducts()).find((p) => p.id === id && p.published !== false)
        ?.name ?? 'Produto',
  };
}
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const p = (await getProducts()).find(
    (p) => p.id === id && p.published !== false,
  );
  if (!p) notFound();
  return (
    <>
      <SiteHeader />
      <main id="main" className="section-wrap detail-page">
        <Link className="back-link" href="/produtos">
          <ChevronLeft size={18} /> Todos os produtos
        </Link>
        <div className={`product-detail ${p.available ? 'is-available' : 'is-coming-soon'}`}>
          <div className="product-detail-art">
            <ProductGallery
              id={p.id}
              name={p.name}
              images={p.images ?? [p.imageUrl]}
            />
            <span>{p.name}</span>
          </div>
          <div>
            <span className="eyebrow">{p.category}</span>
            <h1>{p.name}</h1>
            <h2>{p.tagline}</h2>
            <p className="product-detail-price">
              {p.available ? money(p.amount) : 'Brevemente'}
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
              {p.available
                ? 'A encomenda reserva o produto durante 24 horas. O pagamento é confirmado após verificação pela equipa.'
                : 'Este produto está em preparação. A compra será activada quando estiver disponível.'}
            </div>
            {p.available ? (
              <Link className="btn btn-primary" href={`/encomendar/${p.id}`}>
                Personalizar e comprar <ArrowUpRight size={20} />
              </Link>
            ) : (
              <button className="btn btn-outline" disabled>
                Brevemente
              </button>
            )}
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
