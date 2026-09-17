'use client';
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
        alt={`${name} — fotografia ${selected + 1}`}
        width={1254}
        height={1254}
      />
      {images.length > 1 && (
        <div className="gallery-thumbnails" aria-label="Fotografias do produto">
          {images.map((src, i) => (
            <button
              type="button"
              key={src}
              aria-label={`Ver fotografia ${i + 1}`}
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
