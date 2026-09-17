'use client';
import { useEffect, useState } from 'react';
import type { StockOption } from '@/lib/customisation';
export function PersonalisationManager() {
  const [rows, setRows] = useState<StockOption[]>([]),
    [message, setMessage] = useState(''),
    [busy, setBusy] = useState(false);
  async function load() {
    const r = await fetch('/api/product-options', { cache: 'no-store' });
    const d = (await r.json()) as { error?: string; options: StockOption[] };
    if (!r.ok) throw Error(d.error);
    setRows(d.options);
  }
  useEffect(() => {
    void Promise.resolve()
      .then(load)
      .catch((e) => setMessage(e.message));
  }, []);
  async function save(row: StockOption) {
    setBusy(true);
    setMessage('');
    try {
      const r = await fetch('/api/product-options', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(row),
      });
      const d = (await r.json()) as { error?: string; options: StockOption[] };
      if (!r.ok) throw Error(d.error);
      await load();
      setMessage('Stock e disponibilidade guardados.');
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Erro ao guardar.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="panel">
      <h2>Modelos e personalização</h2>
      <p>
        As quantidades por modelo não aumentam o stock físico total. A contagem
        inicial confirmada é de 500 porta-chaves no conjunto; novas entradas e
        atribuições são geridas em Operações → Stock.
      </p>
      <p>
        Stock disponível para novas encomendas. Ao chegar a zero, a opção fica
        indisponível automaticamente. As unidades são reservadas ao confirmar o
        pedido e devolvidas ao cancelar.
      </p>
      <button
        className="btn"
        disabled={busy}
        onClick={() => void load().catch((e) => setMessage(e.message))}
      >
        Actualizar stock
      </button>
      <div className="stock-options">
        {rows.map((row) => (
          <div key={row.id}>
            <strong>{row.label}</strong>
            <label>
              Unidades disponíveis
              <input
                type="number"
                min="0"
                max="1000000"
                value={row.quantity}
                onChange={(e) =>
                  setRows(
                    rows.map((r) =>
                      r.id === row.id
                        ? { ...r, quantity: Number(e.target.value) }
                        : r,
                    ),
                  )
                }
              />
            </label>
            <label>
              <input
                type="checkbox"
                checked={row.enabled === 1}
                onChange={(e) =>
                  setRows(
                    rows.map((r) =>
                      r.id === row.id
                        ? { ...r, enabled: e.target.checked ? 1 : 0 }
                        : r,
                    ),
                  )
                }
              />{' '}
              {row.id.startsWith('blank-')
                ? 'Permitir personalização'
                : 'Disponibilizar modelo'}
            </label>
            <small>
              {row.quantity === 0
                ? 'Sem stock: desactivado para clientes'
                : row.enabled
                  ? 'Disponível'
                  : 'Desactivado pelo gestor'}
            </small>
            <button
              className="btn"
              disabled={busy}
              onClick={() => void save(row)}
            >
              Guardar
            </button>
          </div>
        ))}
      </div>
      {message && <output>{message}</output>}
    </section>
  );
}
