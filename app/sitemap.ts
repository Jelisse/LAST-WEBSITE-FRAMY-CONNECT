import { siteURL } from '@/lib/server-site';
import { solutionPaths } from '@/lib/solution-paths';
export default function sitemap() {
  const site = siteURL();
  return site
    ? [
        '/',
        '/porque-framy',
        '/para-empresas',
        '/produtos',
        '/sobre',
        '/contacto',
        '/ajuda',
        '/termos',
        '/privacidade',
        ...solutionPaths.map((path) => path.href),
      ].map((path) => ({ url: new URL(path, site).href }))
    : [];
}
