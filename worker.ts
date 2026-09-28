import { profileReminders } from './lib/profile-reminders';
import { refreshProfileDomains } from './lib/profile-domains';
import { customDomainRequest } from './lib/custom-domain-request';
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
    ctx.waitUntil(
      env.DB.prepare(
        'DELETE FROM auth_recovery WHERE token_hash IN (SELECT token_hash FROM auth_recovery WHERE expires_at<? LIMIT 1000)',
      )
        .bind(Date.now())
        .run(),
    );
    ctx.waitUntil(profileReminders(env));
    ctx.waitUntil(refreshProfileDomains(env));
    ctx.waitUntil(
      env.DB.prepare(
        'DELETE FROM profile_enquiries WHERE id IN (SELECT id FROM profile_enquiries WHERE created_at<? LIMIT 1000)',
      )
        .bind(Date.now() - 90 * 86400000)
        .run(),
    );
    const cutoff = Date.now() - 90 * 86400000;
    ctx.waitUntil(
      env.DB.prepare(
        'DELETE FROM profile_engagement WHERE id IN (SELECT id FROM profile_engagement WHERE at<? LIMIT 10000)',
      )
        .bind(cutoff)
        .run(),
    );
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
    let routed: Request | Response;
    try {
      routed = await customDomainRequest(request, env);
    } catch {
      routed = new Response('Serviço temporariamente indisponível', {
        status: 503,
        headers: { 'Cache-Control': 'private, no-store' },
      });
    }
    const response =
      routed instanceof Response
        ? routed
        : await handler.fetch(routed, env, ctx);
    // Preserve development websocket upgrades and streams.
    if (response.status === 101) return response;
    const next = new Response(response.body, response);
    if (routed instanceof Response)
      next.headers.set('Cache-Control', 'private, no-store');
    if (routed instanceof Request && routed.url !== request.url) {
      next.headers.delete('Set-Cookie');
      next.headers.set('Cache-Control', 'private, no-store');
    }
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
