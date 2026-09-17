import handler from 'vinext/server/fetch-handler';
import { securityHeaders } from './lib/security-headers';
const worker = {
  async fetch(request: Request, env: Cloudflare.Env, ctx: ExecutionContext) {
    const response = await handler.fetch(request, env, ctx);
    // Preserve development websocket upgrades and streams.
    if (response.status === 101) return response;
    const next = new Response(response.body, response);
    securityHeaders(next.headers, new URL(request.url).protocol === 'https:');
    return next;
  },
};

export default worker;
