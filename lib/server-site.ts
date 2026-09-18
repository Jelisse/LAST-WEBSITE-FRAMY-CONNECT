import { env } from 'cloudflare:workers';
import { publicSiteURL } from './site-url';
export function siteURL() { return publicSiteURL(env.PUBLIC_SITE_URL); }
export function publicPageRobots() {
  const configured = !!siteURL();
  return { index: configured, follow: configured };
}
