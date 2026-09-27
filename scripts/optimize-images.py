from pathlib import Path
from PIL import Image
import json
root=Path('public')
paths=sorted([*root.glob('home/*.png'), *root.glob('products/*.png'), root/'brand/profile-mountains.png'])
mapping={}
before=after=0
for src in paths:
    target=src.with_suffix('.webp')
    with Image.open(src) as im:
        im.save(target, 'WEBP', lossless=True, method=6, exact=True)
    before+=src.stat().st_size
    after+=target.stat().st_size
    mapping['/'+src.relative_to(root).as_posix()]='/'+target.relative_to(root).as_posix()
Path('lib/optimized-images.ts').write_text('// Lossless WebP copies of bundled images. Uploaded media keeps its original URL.\nconst images: Record<string, string> = '+json.dumps(mapping,indent=2)+';\nexport function optimizedImageSource(src: string): string {\n  return images[src] ?? src;\n}\n',encoding='utf8')
print(json.dumps({'originalBytes':before,'webpBytes':after,'files':len(paths)}))
