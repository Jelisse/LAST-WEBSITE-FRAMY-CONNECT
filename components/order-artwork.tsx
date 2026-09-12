'use client';
import type { SandboxOrder } from '@/lib/domain';
import { blankProfile } from '@/lib/domain';
import { ProductDesigner } from './product-designer';
export function OrderArtwork({ order }: { order: SandboxOrder }) {
  const d = order.design;
  if (!d) return null;
  return (
    <section>
      <h3>Modelo e ficheiros de produção</h3>
      <ProductDesigner
        product={{
          id: order.productId,
          category: order.productId === 'keychain' ? 'Acessórios' : 'Cartões',
        }}
        design={d}
        onChange={() => {}}
        profile={{
          ...blankProfile,
          name: d.holderName ?? '',
          email: d.holderEmail ?? '',
          username: order.profileUsername ?? '',
        }}
        readOnly
      />
      {(['front', 'back'] as const).map(
        (side) =>
          d[side]?.assetId && (
            <p key={side}>
              <a href={`/api/design-assets/${d[side]!.assetId}`} download>
                Descarregar original · {side === 'front' ? 'Frente' : 'Verso'} ·{' '}
                {d[side]!.name}
              </a>
              <br />
              <small>
                Página {d[side]!.page} · tamanho {d[side]!.scale}% · X{' '}
                {d[side]!.x}% · Y {d[side]!.y}%
              </small>
            </p>
          ),
      )}
      {d.profileUrl && (
        <p>
          QR ligado a: <a href={d.profileUrl}>{d.profileUrl}</a>
        </p>
      )}
    </section>
  );
}
