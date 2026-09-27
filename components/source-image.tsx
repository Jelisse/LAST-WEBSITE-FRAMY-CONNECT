import type { ComponentPropsWithoutRef } from 'react';
import { optimizedImageSource } from '@/lib/optimized-images';
// R2 originals and local blob previews have intrinsic dimensions and no image optimiser.
/* oxlint-disable next/no-img-element -- Original R2/blob images preserve intrinsic dimensions without a Next.js optimiser. */
export function SourceImage({
  alt,
  loading = 'lazy',
  decoding = 'async',
  src,
  ...props
}: ComponentPropsWithoutRef<'img'>) {
  return (
    <img {...props} src={typeof src === 'string' ? optimizedImageSource(src) : src} alt={alt ?? ''} loading={loading} decoding={decoding} />
  );
}
