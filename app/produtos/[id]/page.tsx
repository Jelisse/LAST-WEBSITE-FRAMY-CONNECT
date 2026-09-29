import { getTranslations } from '@/lib/server-i18n';
import { ProductGallery } from '@/components/product-gallery';
import { publicPageRobots } from '@/lib/server-site';
import { notFound } from 'next/navigation';
import Link from '@/components/hard-link';
import { ArrowUpRight, Check, ChevronLeft } from 'lucide-react';
import { checkoutMaintenanceMessage } from '@/lib/purchase-structure';
import { getProducts } from '@/lib/server-catalog';
export const dynamic = 'force-dynamic';
import { SiteHeader, SiteFooter } from '@/components/site-shell';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const t = await getTranslations();
  return {
    robots: publicPageRobots(),
    title: t(
      (await getProducts()).find((p) => p.id === id && p.published !== false)
        ?.name ?? 'Produto',
    ),
  };
}
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const t = await getTranslations();
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
          <ChevronLeft size={18} />
          {t(' Todos os produtos')}
        </Link>
        <div
          className={`product-detail ${p.available ? 'is-available' : 'is-coming-soon'}`}
        >
          <div className="product-detail-art">
            <ProductGallery
              id={p.id}
              name={p.name}
              images={p.images ?? [p.imageUrl]}
            />
            <span>{t(p.name)}</span>
          </div>
          <div>
            <span className="eyebrow">{t(p.category)}</span>
            <h1>{t(p.name)}</h1>
            <h2>{t(p.tagline)}</h2>
            <p className="product-detail-price">
              {t('Checkout em manutenção')}
            </p>
            <p>{t(p.description)}</p>
            <ul className="benefit-list">
              <li>
                <Check size={19} />
                {t(' Design alinhado à sua identidade')}
              </li>
              <li>
                <Check size={19} />
                {t(' Partilha simples por link')}
              </li>
              <li>
                <Check size={19} />
                {t(' Configuração orientada ao seu uso')}
              </li>
            </ul>
            <div className="quiet-note">
              {t(checkoutMaintenanceMessage)}
            </div>
            <Link className="btn btn-primary" href={`/comprar?formato=${encodeURIComponent(p.id)}`}>
              {t('Explorar configuração')} <ArrowUpRight size={20}/>
            </Link>
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
