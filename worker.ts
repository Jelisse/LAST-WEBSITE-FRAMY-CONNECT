import handler from 'vinext/server/fetch-handler';
import { securityHeaders } from './lib/security-headers';
import { cleanupReservations } from './lib/reservation-cleanup';
const worker = {
  async scheduled(
    _controller: ScheduledController,
    env: Cloudflare.Env,
    ctx: ExecutionContext,
  ) {
    ctx.waitUntil(cleanupReservations(env.DB));
    const cutoff = Date.now() - 90 * 86400000;
    ctx.waitUntil(
      env.DB.batch([
        env.DB.prepare(
          'DELETE FROM site_events WHERE id IN (SELECT id FROM site_events WHERE at<? LIMIT 10000)',
        ).bind(cutoff),
        env.DB.prepare(
          'DELETE FROM site_sessions WHERE id IN (SELECT id FROM site_sessions WHERE last_seen<? AND NOT EXISTS(SELECT 1 FROM site_events WHERE session_id=site_sessions.id) LIMIT 10000)',
        ).bind(cutoff),
      ]),
    );
  },
  async fetch(request: Request, env: Cloudflare.Env, ctx: ExecutionContext) {
    const started = performance.now();
    const response = await handler.fetch(request, env, ctx);
    // Preserve development websocket upgrades and streams.
    if (response.status === 101) return response;
    const next = new Response(response.body, response);
    const duration = Math.round(performance.now() - started);
    next.headers.append('Server-Timing', `app;dur=${duration}`);
    // Never log URLs, query strings, customer names, cookies or order identifiers.
    if (duration >= 1500 || response.status >= 500) {
      const path = new URL(request.url).pathname;
      const route = [
        '/api/workspace',
        '/api/auth',
        '/api/product-options',
        '/api/payments',
        '/api/site-analytics',
      ].includes(path)
        ? path
        : path.startsWith('/api/')
          ? 'other-api'
          : 'page';
      console.warn(
        JSON.stringify({
          event: 'request-performance',
          route,
          method: request.method,
          status: response.status,
          durationMs: duration,
        }),
      );
    }
    securityHeaders(next.headers, new URL(request.url).protocol === 'https:');
    return next;
  },
};

export default worker;
