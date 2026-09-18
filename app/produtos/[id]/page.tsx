import { getTranslations } from '@/lib/server-i18n';
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
              {p.available ? money(p.amount, t.locale) : t('Brevemente')}
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
              {p.available
                ? t(
                    'A encomenda reserva o produto durante 24 horas. O pagamento é confirmado após verificação pela equipa.',
                  )
                : t(
                    'Este produto está em preparação. A compra será activada quando estiver disponível.',
                  )}
            </div>
            {p.available ? (
              <Link className="btn btn-primary" href={`/encomendar/${p.id}`}>
                {t('Personalizar e comprar ')}
                <ArrowUpRight size={20} />
              </Link>
            ) : (
              <button className="btn btn-outline" disabled>
                {t('Brevemente')}
              </button>
            )}
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
