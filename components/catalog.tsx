'use client';
import { useI18n } from '@/components/language-provider';

import { SourceImage } from '@/components/source-image';
import { useState } from 'react';
import Link from '@/components/hard-link';
import { ArrowUpRight, Search } from 'lucide-react';
import { money, productOrder, type PublicProduct } from '@/lib/catalog';

import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
export function Catalog({ products }: { products: PublicProduct[] }) {
  const { t } = useI18n();
  const [category, setCategory] = useState('Todos');
  const [query, setQuery] = useState('');
  const shown = [...products]
    .sort(productOrder)
    .filter(
      (p) =>
        (category === 'Todos' || p.category === category) &&
        `${p.name} ${p.description} ${t(p.name)} ${t(p.description)}`
          .toLocaleLowerCase()
          .includes(query.toLocaleLowerCase()),
    );
  return (
    <>
      <div className="catalog-tools">
        <Tabs value={category} onValueChange={(v) => setCategory(String(v))}>
          <TabsList className="filter-tabs">
            {['Todos', 'Cartões', 'Acessórios', 'Para organizações'].map(
              (c) => (
                <TabsTrigger key={c} value={c}>
                  {t(c)}
                </TabsTrigger>
              ),
            )}
          </TabsList>
        </Tabs>
        <label className="search" htmlFor="catalog-search">
          <Search size={18} />
          <Input
            id="catalog-search"
            aria-label={t('Pesquisar produtos')}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('Encontre o seu produto')}
          />
        </label>
      </div>
      <div className="product-grid">
        {shown.map((p, i) => (
          <Link
            className={`product-card ${p.available ? 'is-available' : 'is-coming-soon'}`}
            key={p.id}
            href={`/produtos/${p.id}`}
          >
            <div className={`product-visual tone-${i % 3}`}>
              <span className="product-category">{t(p.category)}</span>
              <SourceImage
                className="catalog-product-image"
                src={p.imageUrl}
                alt={t(p.name)}
                width={1254}
                height={1254}
                loading="lazy"
              />
              <span className="product-arrow">
                <ArrowUpRight size={22} />
              </span>
            </div>
            <div className="product-info">
              <h2>{t(p.name)}</h2>
              <p>{t(p.tagline)}</p>
              <span>
                {p.available ? money(p.amount, t.locale) : t('Brevemente')}{' '}
                <ArrowUpRight size={15} />
              </span>
            </div>
          </Link>
        ))}
      </div>
      {!shown.length && (
        <p className="empty-panel">
          {t('Nenhum produto encontrado. Experimente outro termo.')}
        </p>
      )}
      <div className="quiet-note">
        {t(
          'Os produtos assinalados como Brevemente ainda não estão disponíveis para compra.',
        )}
      </div>
    </>
  );
}
