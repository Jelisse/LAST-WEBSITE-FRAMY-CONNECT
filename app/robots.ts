import { siteURL } from '@/lib/server-site';
export default function robots() {
  const site = siteURL();
  if (!site) return { rules: { userAgent: '*', disallow: '/' } };
  return { rules: { userAgent: '*', allow: ['/$','/produtos','/sobre','/contacto','/ajuda','/termos','/privacidade'],
    disallow: '/' }, sitemap: new URL('/sitemap.xml',site).href };
}
