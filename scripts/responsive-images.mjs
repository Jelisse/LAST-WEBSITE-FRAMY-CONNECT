import sharp from 'sharp';
import { createHash } from 'node:crypto';
import { mkdir, readdir, readFile, writeFile, unlink } from 'node:fs/promises';

// Build-time only: never resize an image in a customer request.
const output = 'public/media-optimized';
await mkdir(output, { recursive: true });
const manifest = {};
const generated = new Set();
let originalBytes = 0,
  fallbackBytes = 0;
for (const directory of ['home', 'products', 'brand']) {
  for (const file of (await readdir(`public/${directory}`)).sort()) {
    if (!/\.(png|jpg)$/.test(file)) continue;
    if (directory === 'brand' && file !== 'profile-mountains.png') continue;
    const input = await readFile(`public/${directory}/${file}`);
    const { width } = await sharp(input).metadata();
    const widths = [
      ...new Set([320, 640, 960, 1440].map((w) => Math.min(w, width))),
    ];
    const variants = [];
    for (const size of widths) {
      const buffer = await sharp(input)
        .resize({ width: size, withoutEnlargement: true })
        .webp({ quality: 88, alphaQuality: 100, effort: 2 })
        .toBuffer();
      const hash = createHash('sha256')
        .update(buffer)
        .digest('hex')
        .slice(0, 12);
      const name = `${directory}-${file.replace(/\.[^.]+$/, '')}-${size}-${hash}.webp`;
      await writeFile(`${output}/${name}`, buffer);
      generated.add(name);
      variants.push({
        src: `/media-optimized/${name}`,
        width: size,
        bytes: buffer.length,
      });
    }
    const fallback = variants.find((v) => v.width >= 640) ?? variants.at(-1);
    const entry = {
      src: fallback.src,
      srcSet: variants.map((v) => `${v.src} ${v.width}w`).join(', '),
    };
    manifest[`/${directory}/${file}`] = entry;
    if (file.endsWith('.png'))
      manifest[`/${directory}/${file.replace(/\.png$/, '.webp')}`] = entry;
    if (directory === 'brand') {
      // Decorative backgrounds do not need the multi-megabyte source bitmap.
      for (const css of [
        'app/entrar/style.css',
        'app/globals.css',
        'app/home-atmosphere.css',
        'app/home.css',
      ]) {
        const original = await readFile(css, 'utf8');
        const next = original.replace(
          /\/(?:brand\/profile-mountains\.(?:png|webp)|media-optimized\/brand-profile-mountains-\d+-[a-f0-9]{12}\.webp)/g,
          variants.at(-1).src,
        );
        if (next !== original) await writeFile(css, next);
      }
    }
    originalBytes += input.length;
    fallbackBytes += fallback.bytes;
  }
}
await writeFile(
  'lib/responsive-images.json',
  JSON.stringify(manifest, null, 2) + '\n',
);
// Only remove stale derivatives in this script's dedicated output directory.
for (const name of await readdir(output)) {
  if (
    /^(home|products|brand)-[a-z0-9-]+-\d+-[a-f0-9]{12}\.webp$/.test(name) &&
    !generated.has(name)
  )
    await unlink(`${output}/${name}`);
}
console.log(
  JSON.stringify({
    originalBytes,
    fallbackBytes,
    reductionPercent: Math.round(100 * (1 - fallbackBytes / originalBytes)),
  }),
);
