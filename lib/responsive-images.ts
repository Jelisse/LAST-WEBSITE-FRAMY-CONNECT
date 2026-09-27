import manifest from './responsive-images.json';
import { optimizedImageSource } from './optimized-images';
export function responsiveImage(src: string): { src: string; srcSet?: string } {
  return (
    (manifest as Record<string, { src: string; srcSet: string }>)[src] ?? {
      src: optimizedImageSource(src),
      srcSet: undefined,
    }
  );
}
