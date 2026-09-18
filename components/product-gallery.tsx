'use client';
import { useI18n } from '@/components/language-provider';

import { useEffect, useState } from 'react';
import { SourceImage } from './source-image';
export function ProductGallery({
  id,
  name,
  images,
}: {
  id: string;
  name: string;
  images: string[];
}) {
  const { t } = useI18n();
  const [selected, setSelected] = useState(0);
  useEffect(() => {
    let session = '';
    try {
      session =
        sessionStorage.getItem('framy-product-session') || crypto.randomUUID();
      sessionStorage.setItem('framy-product-session', session);
    } catch {
      session = crypto.randomUUID();
    }
    void fetch('/api/product-visits', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productId: id, session }),
    }).catch(() => {});
  }, [id]);
  return (
    <div className="product-gallery">
      <SourceImage
        src={images[selected] || images[0]}
        alt={t('{0} — fotografia {1}', [name, selected + 1])}
        width={1254}
        height={1254}
      />
      {images.length > 1 && (
        <div
          className="gallery-thumbnails"
          aria-label={t('Fotografias do produto')}
        >
          {images.map((src, i) => (
            <button
              type="button"
              key={src}
              aria-label={t('Ver fotografia {0}', [i + 1])}
              aria-pressed={i === selected}
              onClick={() => setSelected(i)}
            >
              <SourceImage src={src} alt="" width={90} height={90} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
