// Lossless WebP copies of bundled images. Uploaded media keeps its original URL.
const images: Record<string, string> = {
  "/brand/profile-mountains.png": "/brand/profile-mountains.webp",
  "/home/framy-keychain.png": "/home/framy-keychain.webp",
  "/home/iphone-shell.png": "/home/iphone-shell.webp",
  "/home/iphone-side-shell.png": "/home/iphone-side-shell.webp",
  "/home/nfc-card-blank.png": "/home/nfc-card-blank.webp",
  "/home/nfc-card-matte.png": "/home/nfc-card-matte.webp",
  "/home/nfc-card.png": "/home/nfc-card.webp",
  "/home/orange-card-front.png": "/home/orange-card-front.webp",
  "/home/pedestal.png": "/home/pedestal.webp",
  "/home/solange-card-front.png": "/home/solange-card-front.webp",
  "/home/solange-card.png": "/home/solange-card.webp",
  "/products/bracelet.png": "/products/bracelet.webp",
  "/products/catalog.png": "/products/catalog.webp",
  "/products/employee.png": "/products/employee.webp",
  "/products/event.png": "/products/event.webp",
  "/products/keychain.png": "/products/keychain.webp",
  "/products/menu.png": "/products/menu.webp",
  "/products/metal.png": "/products/metal.webp",
  "/products/pvc.png": "/products/pvc.webp",
  "/products/review.png": "/products/review.webp",
  "/products/sticker.png": "/products/sticker.webp",
  "/products/tag.png": "/products/tag.webp",
  "/products/wood.png": "/products/wood.webp"
};
export function optimizedImageSource(src: string): string {
  return images[src] ?? src;
}
