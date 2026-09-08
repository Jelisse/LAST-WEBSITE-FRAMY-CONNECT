'use client';
import { useState } from 'react';
import Link from 'next/link';
import { ArrowUpRight, Search } from 'lucide-react';
import { products } from '@/lib/catalog';
import { ProductIcon } from './product-icon';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
export function Catalog() {
  const [category, setCategory] = useState('Todos');
  const [query, setQuery] = useState('');
  const shown = products.filter(
    (p) =>
      (category === 'Todos' || p.category === category) &&
      `${p.name} ${p.description}`
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
                  {c}
                </TabsTrigger>
              ),
            )}
          </TabsList>
        </Tabs>
        <label className="search" htmlFor="catalog-search">
          <Search size={18} />
          <Input
            id="catalog-search"
            aria-label="Pesquisar produtos"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Encontre o seu produto"
          />
        </label>
      </div>
      <div className="product-grid">
        {shown.map((p, i) => (
          <Link className="product-card" key={p.id} href={`/produtos/${p.id}`}>
            <div className={`product-visual tone-${i % 3}`}>
              <span className="product-category">{p.category}</span>
              <ProductIcon type={p.icon} />
              <span className="product-arrow">
                <ArrowUpRight size={22} />
              </span>
            </div>
            <div className="product-info">
              <h2>{p.name}</h2>
              <p>{p.tagline}</p>
              <span>
                {p.available ? 'Conhecer o produto' : 'Solução sob consulta'}{' '}
                <ArrowUpRight size={15} />
              </span>
            </div>
          </Link>
        ))}
      </div>
      {!shown.length && (
        <p className="empty-panel">
          Nenhum produto encontrado. Experimente outro termo.
        </p>
      )}
      <div className="quiet-note">
        Catálogo em preparação. Preços e disponibilidade comercial serão
        confirmados antes do lançamento.
      </div>
    </>
  );
}
