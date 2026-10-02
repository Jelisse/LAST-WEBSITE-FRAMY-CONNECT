import { translator, validLocale } from './i18n';

// Translate only system errors. Never translate profile content, identifiers,
// payment states or other data that clients use as stable protocol values.
export async function localizedResponse(request: Request, response: Response) {
  if (
    !new URL(request.url).pathname.startsWith('/api/') ||
    response.status < 400 ||
    !response.headers.get('content-type')?.includes('application/json')
  )
    return response;
  const locale = validLocale(
    request.headers
      .get('cookie')
      ?.match(/(?:^|;\s*)framy-language=([^;]+)/)?.[1],
  );
  if (locale === 'pt-MZ') return response;
  try {
    const data = (await response.clone().json()) as Record<string, unknown>;
    if (!data || typeof data.error !== 'string') return response;
    const headers = new Headers(response.headers);
    headers.delete('content-length');
    headers.delete('etag');
    headers.set('Cache-Control', 'private, no-store');
    headers.set('Content-Language', locale);
    return Response.json(
      { ...data, error: translator(locale)(data.error) },
      { status: response.status, headers },
    );
  } catch {
    return response;
  }
}
