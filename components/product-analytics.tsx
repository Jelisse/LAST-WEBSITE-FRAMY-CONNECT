'use client';
import { useI18n } from '@/components/language-provider';

import { useEffect, useState } from 'react';
import type { Product } from '@/lib/catalog';
export function ProductAnalytics({ products }: { products: Product[] }) {
  const { t } = useI18n();
  const [data, setData] = useState<{
      visits: { product_id: string; visits: number }[];
      orders: { product_id: string; orders: number }[];
    } | null>(null),
    [error, setError] = useState('');
  async function load() {
    try {
      const r = await fetch('/api/product-visits', { cache: 'no-store' });
      const b = (await r.json()) as {
        error: string;
        visits: { product_id: string; visits: number }[];
        orders: { product_id: string; orders: number }[];
      };
      if (!r.ok) throw Error(b.error);
      setData(b);
      setError('');
    } catch (e) {
      setError((e as Error).message);
    }
  }
  useEffect(() => {
    void load();
  }, []);
  const rows = products
    .map((p) => ({
      ...p,
      visits: data?.visits.find((v) => v.product_id === p.id)?.visits ?? 0,
      orders: data?.orders.find((v) => v.product_id === p.id)?.orders ?? 0,
    }))
    .sort((a, b) => b.visits - a.visits);
  return (
    <section className="product-analytics">
      <header>
        <div>
          <h2>{t('Interesse nos produtos')}</h2>
          <p>{t('Últimos 30 dias · visitas às páginas, mesmo sem compra')}</p>
        </div>
        <button type="button" onClick={() => void load()}>
          {t('Actualizar estatísticas')}
        </button>
      </header>
      {error ? (
        <p role="alert">{t(error)}</p>
      ) : !data ? (
        <p>{t('A carregar…')}</p>
      ) : (
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>{t('Produto')}</th>
                <th>{t('Estado')}</th>
                <th>{t('Visitas')}</th>
                <th>{t('Encomendas')}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((p) => (
                <tr key={p.id}>
                  <td>{t(p.name)}</td>
                  <td>
                    {p.published === false
                      ? t('Oculto')
                      : p.available
                        ? t('Vendas activas')
                        : t('Brevemente')}
                  </td>
                  <td>{p.visits}</td>
                  <td>{p.orders}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <small>
        {t(
          'Uma visita por produto, sessão e dia UTC. Contas da equipa são excluídas. Não representa pessoas únicas nem pagamentos confirmados; a medição começou com esta funcionalidade.',
        )}
      </small>
    </section>
  );
}
