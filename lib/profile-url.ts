export function hasInvalidProfileURLCharacters(value: string): boolean {
  return Array.from(value).some((character) => character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127 || character === '\\');
}

/** Add HTTPS only to a complete, unambiguous domain. Never guess handles or upgrade other protocols. */
export function normalizeProfileURL(value: string): string {
  const text = value.trim();
  if (!text || hasInvalidProfileURLCharacters(text)) return text;
  try {
    let url: URL;
    if (/^https:/i.test(text)) url = new URL(text);
    else {
      // A missing scheme is safe to infer only for a domain, optionally with a port/path.
      if (!/^[^\s/@?#:]+\.[^\s/@?#:]+(?::[0-9]{1,5})?(?:[/?#]|$)/u.test(text))
        return text;
      url = new URL('https://' + text);
      if (
        !/^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z](?:[a-z0-9-]{0,61}[a-z0-9])?$/i.test(
          url.hostname,
        )
      )
        return text;
    }
    return url.protocol === 'https:' && !url.username && !url.password
      ? url.href
      : text;
  } catch {
    return text;
  }
}

export class ProfileWebsiteError extends Error {
  readonly errorField = 'website';
}
