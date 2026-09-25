import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
import { heroMediaType, isHeroSlot } from '../lib/hero-media.ts';
const source = readFileSync(new URL('../app/api/hero-media/route.ts', import.meta.url), 'utf8').replace(/^import .*;\r?\n/gm, '').replace(/export /g, '');
const js = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } }).outputText;
let user = null, allowed = false, quota = true;
const objects = new Map();
const deps = {
 env: { PROFILE_PHOTOS: { put: async (k,v) => objects.set(k,v), delete: async k => objects.delete(k) } },
 getChatGPTUser: async () => user,
 canManageCatalog: async () => allowed,
 getHeroMedia: async () => ({}),
 isHeroSlot, heroMediaType,
 reserveUpload: async () => quota, releaseUpload: async () => {}, rateLimit: async () => true,
};
const { POST } = new Function(...Object.keys(deps), js + '\nreturn { GET, POST };')(...Object.values(deps));
const png = Uint8Array.from([137,80,78,71,13,10,26,10]);
const request = (slot='card', body=png, origin='http://localhost') => new Request(`http://localhost/api/hero-media?slot=${slot}`, { method:'POST',headers:{origin},body });
assert.equal((await POST(request())).status,401);
user = { userId:'test-manager' };
assert.equal((await POST(request())).status,403);
allowed = true;
assert.equal((await POST(request('card',png,'https://other.test'))).status,403);
assert.equal((await POST(request('../settings'))).status,422);
assert.equal((await POST(request('video1'))).status,422);
assert.equal((await POST(request('card',new TextEncoder().encode('<svg/>')))).status,422);
quota = false;
assert.equal((await POST(request())).status,413);
quota = true;
const result = await POST(request());
assert.equal(result.status,200);
const { url } = await result.json();
assert.match(url,/^\/api\/hero-media\/[0-9a-f-]{36}$/);
assert.equal(JSON.parse(objects.get('hero/settings/card')).url,url);
assert.equal(objects.size,2);
assert.equal((await POST(request('card',new Uint8Array(8*1024*1024+1)))).status,413);
console.log('Hero upload authorization, validation, quota and persistence passed');
