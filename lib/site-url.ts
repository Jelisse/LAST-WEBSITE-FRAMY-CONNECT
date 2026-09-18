// Only an explicitly configured HTTPS origin can enable public indexing.
export function publicSiteURL(value: unknown): URL | null {
  if (typeof value !== 'string' || !value.trim()) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || url.username || url.password ||
        url.pathname !== '/' || url.search || url.hash ||
        url.hostname === 'localhost' || url.hostname.endsWith('.workers.dev') ||
        url.hostname.endsWith('.chatgpt.site')) return null;
    return url;
  } catch { return null; }
}
