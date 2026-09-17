export function securityHeaders(headers: Headers, secure: boolean) {
  headers.set('X-Content-Type-Options', 'nosniff');
  headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  headers.set(
    'Permissions-Policy',
    'camera=(self), microphone=(), geolocation=()',
  );
  if (secure) headers.set('Strict-Transport-Security', 'max-age=31536000');
  // Vinext streams inline bootstrap scripts; unsafe-inline is required until nonce support is wired.
  if (!headers.has('Content-Security-Policy'))
    headers.set(
      'Content-Security-Policy',
      "default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'self' https://chatgpt.com https://*.chatgpt.com; form-action 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' data: blob: https:; media-src 'self' blob:; worker-src 'self' blob:; connect-src 'self'" +
        (secure ? '' : ' ws: http://localhost:*'),
    );
}
