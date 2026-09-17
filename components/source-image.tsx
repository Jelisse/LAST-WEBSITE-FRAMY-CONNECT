import type { ComponentPropsWithoutRef } from 'react';
// R2 originals and local blob previews have intrinsic dimensions and no image optimiser.
/* oxlint-disable next/no-img-element -- Original R2/blob images preserve intrinsic dimensions without a Next.js optimiser. */
export function SourceImage({
  alt,
  loading = 'lazy',
  decoding = 'async',
  ...props
}: ComponentPropsWithoutRef<'img'>) {
  return (
    <img {...props} alt={alt ?? ''} loading={loading} decoding={decoding} />
  );
}
