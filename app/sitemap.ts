import { siteURL } from '@/lib/server-site';
export default function sitemap() {
  const site = siteURL();
  return site ? ['/', '/produtos', '/sobre', '/contacto', '/ajuda', '/termos', '/privacidade']
    .map(path => ({ url:new URL(path,site).href })) : [];
}
