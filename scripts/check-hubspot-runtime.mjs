import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { Miniflare } from 'miniflare';
// Isolated workerd regression check: fictional token, intercepted outbound requests.
const bundle = await build({
  stdin: { contents: `import {verifyHubSpot} from './lib/hubspot.ts'; export default {async fetch(){try{await verifyHubSpot('fictional-runtime-token');return Response.json({ok:true});}catch(e){return Response.json({code:e.code});}}};`, resolveDir: process.cwd(), sourcefile:'hubspot-runtime-worker.ts' },
  bundle:true,write:false,format:'esm',platform:'browser',target:'es2022',
});
let status=200, calls=0;
const runtime = new Miniflare({
  modules:true,compatibilityDate:'2026-05-22',script:bundle.outputFiles[0].text,
  outboundService:async(request)=>{
    calls++;
    assert.equal(new URL(request.url).origin,'https://api.hubapi.com');
    assert.equal(request.headers.get('Authorization'),'Bearer fictional-runtime-token');
    return status===200 ? Response.json({results:[]}) : new Response(null,{status,headers:{Location:'https://redirect.example/blocked'}});
  },
});
try {
  assert.deepEqual(await (await runtime.dispatchFetch('https://runtime.test/')).json(),{ok:true});
  status=302;
  assert.deepEqual(await (await runtime.dispatchFetch('https://runtime.test/')).json(),{code:'rejected'});
  assert.equal(calls,2,'Redirect must not produce an extra request');
  console.log('workerd: HubSpot verification succeeds; redirect rejected without following it. No external network or real token used.');
} finally {await runtime.dispose();}
