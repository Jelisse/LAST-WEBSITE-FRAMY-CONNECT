import type { ComponentPropsWithoutRef } from 'react';
import { responsiveImage } from '@/lib/responsive-images';
// R2 originals and local blob previews have intrinsic dimensions and no image optimiser.
/* oxlint-disable next/no-img-element -- Original R2/blob images preserve intrinsic dimensions without a Next.js optimiser. */
export function SourceImage({
  alt,
  loading = 'lazy',
  decoding = 'async',
  src,
  ...props
}: ComponentPropsWithoutRef<'img'>) {
  const image =
    typeof src === 'string' ? responsiveImage(src) : { src, srcSet: undefined };
  return (
    <img
      {...image}
      sizes={image.srcSet ? '(max-width: 640px) 100vw, 640px' : undefined}
      {...props}
      alt={alt ?? ''}
      loading={loading}
      decoding={decoding}
    />
  );
}
