'use client';
import { SourceImage } from '@/components/source-image';
import { useEffect, useState } from 'react';
import type { Product } from '@/lib/catalog';
import { PersonalisationManager } from './personalisation-manager';
import { money } from '@/lib/catalog';
import { Button } from './ui/button';
import { Input } from './ui/input';

export function ProductManager({ onSaved }: { onSaved?: () => void }) {
  const [items, setItems] = useState<Product[]>([]),
    [draft, setDraft] = useState<Product | null>(null),
    [error, setError] = useState(''),
    [notice, setNotice] = useState(''),
    [busy, setBusy] = useState(false),
    [loading, setLoading] = useState(true);
  const [price, setPrice] = useState(''),
    [cost, setCost] = useState('');
  async function load() {
    setLoading(true);
    setError('');
    try {
      const r = await fetch('/api/manage-products', { cache: 'no-store' });
      const d = (await r.json()) as {
        products: Product[];
        product: Product;
        imageUrl: string;
        error?: string;
      };
      if (!r.ok) throw new Error(d.error);
      setItems(d.products);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Não foi possível carregar.');
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    void Promise.resolve().then(load);
  }, []);
  function edit(p: Product) {
    setDraft({ ...p });
    setPrice(String(p.amount / 100));
    setCost(String(p.cost / 100));
    setError('');
    setNotice('');
  }
  async function upload(file: File | undefined) {
    if (!file || !draft) return;
    if (file.size > 8 * 1024 * 1024) {
      setError('A imagem deve ter até 8 MB.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const r = await fetch('/api/product-image', {
        method: 'POST',
        headers: { 'Content-Type': file.type },
        body: file,
      });
      const d = (await r.json()) as {
        products: Product[];
        product: Product;
        imageUrl: string;
        error?: string;
      };
      if (!r.ok) throw new Error(d.error);
      setDraft((p) => (p ? { ...p, imageUrl: d.imageUrl } : p));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Não foi possível carregar.');
    } finally {
      setBusy(false);
    }
  }
  async function save(event: React.SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draft) return;
    const parse = (value: string) => {
      if (!/^\d+(?:[.,]\d{1,2})?$/.test(value))
        throw new Error(
          'Indique um valor positivo com até duas casas decimais.',
        );
      return Math.round(Number(value.replace(',', '.')) * 100);
    };
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const payload = { ...draft, amount: parse(price), cost: parse(cost) };
      const r = await fetch('/api/manage-products', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const d = (await r.json()) as {
        products: Product[];
        product: Product;
        imageUrl: string;
        error?: string;
      };
      if (!r.ok) throw new Error(d.error);
      setItems((all) =>
        all.some((p) => p.id === d.product.id)
          ? all.map((p) => (p.id === d.product.id ? d.product : p))
          : [...all, d.product],
      );
      setDraft(null);
      setNotice('Produto guardado. O site já usa os novos dados.');
      onSaved?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Não foi possível guardar.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <section
      className="panel product-management"
      aria-labelledby="product-management-title"
    >
      <PersonalisationManager />
      <header>
        <Button
          disabled={busy || !!draft}
          onClick={() =>
            edit({
              id: crypto.randomUUID().replace(/^/, 'product-'),
              name: 'Novo produto',
              category: 'Cartões',
              icon: 'card',
              tagline: '',
              description: '',
              amount: 100,
              cost: 0,
              audience: 'Indivíduos',
              available: false,
              imageUrl: '/products/pvc.png',
              version: 0,
            })
          }
        >
          Novo produto
        </Button>
        <div>
          <h2 id="product-management-title">Gestão de produtos</h2>
          <p className="muted">
            Edite o catálogo apresentado no site. Valores em meticais (MZN).
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => void load()}
          disabled={busy || loading || !!draft}
        >
          Actualizar
        </Button>
      </header>
      {notice && <output className="product-save-notice">{notice}</output>}
      {error && (
        <p role="alert" className="product-save-error">
          {error}
        </p>
      )}
      {loading ? (
        <p>A carregar…</p>
      ) : draft ? (
        <form onSubmit={save} className="product-management-form">
          <div className="product-image-editor">
            <SourceImage src={draft.imageUrl} alt={draft.name} />
            <label>
              Substituir imagem
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                disabled={busy}
                onChange={(e) => void upload(e.target.files?.[0])}
              />
            </label>
            <small>PNG, JPG ou WebP, até 8 MB.</small>
          </div>
          <fieldset disabled={busy}>
            <div className="product-fields">
              <label htmlFor="field-componentsproductmanagertsx-0">
                Nome
                <Input
                  id="field-componentsproductmanagertsx-0"
                  required
                  maxLength={90}
                  value={draft.name}
                  onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                />
              </label>
              <label>
                Categoria
                <select
                  value={draft.category}
                  onChange={(e) =>
                    setDraft({ ...draft, category: e.target.value })
                  }
                >
                  {['Cartões', 'Acessórios', 'Para organizações'].map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </label>
              <label
                htmlFor="field-componentsproductmanagertsx-1"
                className="product-field-wide"
              >
                Frase curta
                <Input
                  id="field-componentsproductmanagertsx-1"
                  required
                  maxLength={160}
                  value={draft.tagline}
                  onChange={(e) =>
                    setDraft({ ...draft, tagline: e.target.value })
                  }
                />
              </label>
              <label className="product-field-wide">
                Descrição
                <textarea
                  required
                  maxLength={2000}
                  rows={4}
                  value={draft.description}
                  onChange={(e) =>
                    setDraft({ ...draft, description: e.target.value })
                  }
                />
              </label>
              <label htmlFor="field-componentsproductmanagertsx-2">
                Preço (MZN)
                <Input
                  id="field-componentsproductmanagertsx-2"
                  required
                  inputMode="decimal"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                />
              </label>
              <label htmlFor="field-componentsproductmanagertsx-3">
                Custo interno (MZN)
                <Input
                  id="field-componentsproductmanagertsx-3"
                  required
                  inputMode="decimal"
                  value={cost}
                  onChange={(e) => setCost(e.target.value)}
                />
              </label>
              <label htmlFor="field-componentsproductmanagertsx-4">
                Público
                <Input
                  id="field-componentsproductmanagertsx-4"
                  required
                  maxLength={60}
                  value={draft.audience}
                  onChange={(e) =>
                    setDraft({ ...draft, audience: e.target.value })
                  }
                />
              </label>
              <label className="product-availability">
                <input
                  type="checkbox"
                  checked={draft.available}
                  onChange={(e) =>
                    setDraft({ ...draft, available: e.target.checked })
                  }
                />
                Disponível para pedido
              </label>
            </div>
            <p className="muted">
              Desactivado: o produto continua visível como solução sob consulta.
            </p>
            <div className="product-form-actions">
              <Button type="submit">
                {busy ? 'A guardar…' : 'Guardar produto'}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setDraft(null)}
              >
                Cancelar
              </Button>
            </div>
          </fieldset>
        </form>
      ) : (
        <div className="managed-products">
          {items.map((p) => (
            <article key={p.id}>
              <SourceImage src={p.imageUrl} alt={p.name} />
              <div>
                <h3>{p.name}</h3>
                <p>{p.available ? money(p.amount) : 'Sob consulta'}</p>
              </div>
              <Button variant="outline" onClick={() => edit(p)}>
                Editar
              </Button>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
