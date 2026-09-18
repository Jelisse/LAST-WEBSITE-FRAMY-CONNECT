'use client';
import { useI18n } from '@/components/language-provider';

import type { SandboxOrder } from '@/lib/domain';
import { blankProfile } from '@/lib/domain';
import { ProductDesigner } from './product-designer';
export function OrderArtwork({
  order,
}: {
  order: Pick<SandboxOrder, 'productId' | 'design' | 'profileUsername'>;
}) {
  const { t } = useI18n();
  const d = order.design;
  if (!d) return null;
  return (
    <section>
      <h3>{t('Modelo e ficheiros de produção')}</h3>
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
                {t('Descarregar original · ')}
                {side === 'front' ? t('Frente') : t('Verso')} · {d[side]!.name}
              </a>
              <br />
              <small>
                {t('Página ')}
                {d[side]!.page}
                {t(' · tamanho ')}
                {d[side]!.scale}
                {t('% · X')} {d[side]!.x}
                {t('% · Y ')}
                {d[side]!.y}%
              </small>
            </p>
          ),
      )}
      {d.profileUrl && (
        <p>
          {t('QR ligado a: ')}
          <a href={d.profileUrl}>{d.profileUrl}</a>
        </p>
      )}
    </section>
  );
}
