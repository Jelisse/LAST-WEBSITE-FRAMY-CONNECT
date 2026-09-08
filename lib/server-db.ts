import { env } from 'cloudflare:workers';
export function database() {
  if (!env.DB) throw new Error('Armazenamento indisponível.');
  return env.DB;
}
