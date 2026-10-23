import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
import sharp from 'sharp';
import QRCode from 'qrcode';
import {fixture} from './helpers/company-fixture.mjs';
import {companyCard,companyTemplate,companyPresentation} from '../lib/company-cards.ts';
import {defaultToolSettings,toolSettings,directoryCard,signatureHTML,signatureText} from '../lib/company-tools.ts';
import {qrPNG} from '../lib/qr-png.ts';
import {profileBody,profileJSON} from '../lib/profile-api.ts';
import {sealCRM,openCRM,verifyHubSpot,sendHubSpot,HubSpotError} from '../lib/hubspot.ts';

function load(file,deps){const module={exports:{}};const js=ts.transpileModule(readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;new Function('require','exports','module',js)(name=>{assert.ok(deps[name],name);return deps[name];},module.exports,module);return module.exports;}
function toolsFixture(){const f=fixture();let actor='owner',race=null,calls=0;const secret=btoa('x'.repeat(32));
 const deps={'cloudflare:workers':{env:{CRM_ENCRYPTION_KEY:secret}},'@/app/chatgpt-auth':{getChatGPTUser:async()=>actor?{userId:actor}:null},'@/lib/server-db':{database:()=>f.db},'@/lib/server-corporate':{corporateAccess:async(user,id,leader)=>{const row=f.sql.prepare("SELECT o.*,m.role FROM corporate_active_organisations o JOIN corporate_effective_members m ON m.organisation_id=o.id AND m.account_id=? AND m.active=1 WHERE o.id=?").get(user,id);if(!row||leader&&row.role!=='leader')throw Error('Denied');if(race){race();race=null;}return row;}},'@/lib/profile-api':{profileBody,profileJSON},'@/lib/company-cards':{companyCard,companyTemplate,companyPresentation},'@/lib/company-tools':{defaultToolSettings,toolSettings,directoryCard},'@/lib/server-site':{siteURL:()=>new URL('https://framy.example/')},'@/lib/request-limits':{rateLimit:async()=>true},'@/lib/hubspot':{sealCRM,openCRM,verifyHubSpot:async()=>{},sendHubSpot:async()=>{calls++;return {id:'123',existing:false};},HubSpotError}};
 const tools=load('app/api/company-tools/route.ts',deps),crm=load('app/api/company-crm/route.ts',deps);
 return {...f,deps,secret,calls:()=>calls,as(id){actor=id;f.actor(id);},race(fn){race=fn;},async request(api,method,body={},origin='https://framy.example'){const r=await ({tools,crm}[api])[method](new Request('https://framy.example/api?organisation='+ (body.organisation||'org'),method==='POST'?{method,headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify({organisation:'org',...body})}:{}));return {status:r.status,body:await r.json()};}};
}
const brand={company:'Example <Studio>',website:'https://example.com/',headline:'Hello',accent:'sage'},card={name:'Ana "Example"',title:'Architect',email:'private@example.com',phone:'+258840000000',showEmail:false,showPhone:false,internalName:'PRIVATE LABEL'};
test('signature/directory only expose explicit published fields and escape HTML',()=>{
 const c=directoryCard('id','worker','Design',companyCard(card),'https://framy.example');const html=signatureHTML(c,companyTemplate(brand),defaultToolSettings,'https://framy.example');
 assert.ok(!html.includes('private@example.com'));assert.ok(!html.includes('+258840000000'));assert.ok(!JSON.stringify(c).includes('PRIVATE LABEL'));assert.ok(html.includes('&lt;Studio&gt;'));assert.ok(html.includes('&quot;Example&quot;'));assert.ok(html.includes('/api/company-tools/qr/id'));assert.ok(!signatureHTML(c,companyTemplate(brand),{...defaultToolSettings,signature:'compact'},'https://framy.example').includes('<img'));
 assert.ok(!signatureText(c,brand.company).includes('private@'));assert.throws(()=>toolSettings({...defaultToolSettings,background:'url(evil)'}));
});
test('PNG QR has quiet zone and exact QR module pixels without a native encoder',async()=>{
 const url='https://framy.example/equipa/example',qr=QRCode.create(url,{errorCorrectionLevel:'M'}),blob=await qrPNG(url),{data,info}=await sharp(Buffer.from(await blob.arrayBuffer())).raw().toBuffer({resolveWithObject:true});
 assert.equal(info.width,(qr.modules.size+8)*6);assert.equal(info.height,info.width);const pixel=(x,y)=>data[(y*info.width+x)*info.channels];assert.equal(pixel(0,0),255);
 for(let y=0;y<qr.modules.size;y++)for(let x=0;x<qr.modules.size;x++)assert.equal(pixel((x+4)*6+3,(y+4)*6+3),qr.modules.get(y,x)?0:255);
});
test('tools enforce member/tenant publication privacy and optimistic leader settings',async()=>{
 const f=toolsFixture();await f.post({action:'template',version:0,template:brand});f.as('worker');await f.post({action:'publish-card',version:0,templateVersion:1,card});await f.post({action:'save-card',version:1,templateVersion:1,card:{...card,name:'PRIVATE DRAFT'}});
 let r=await f.request('tools','GET');assert.equal(r.status,200);assert.equal(r.body.cards.length,1);assert.equal(r.body.cards[0].name,card.name);assert.equal(r.body.cards[0].email,'');assert.ok(!JSON.stringify(r.body).includes('PRIVATE DRAFT'));assert.equal((await f.request('tools','POST',{settings:defaultToolSettings,version:0})).status,422);
 f.as('owner');assert.equal((await f.request('tools','POST',{settings:defaultToolSettings,version:3})).status,409);assert.equal((await f.request('tools','POST',{settings:defaultToolSettings,version:0})).status,200);assert.equal((await f.request('tools','POST',{settings:defaultToolSettings,version:0})).status,409);assert.equal((await f.request('tools','POST',{settings:{...defaultToolSettings,signature:'compact'},version:1})).status,200);
 f.race(()=>f.sql.prepare("UPDATE corporate_members SET role='member' WHERE account_id='owner' AND organisation_id='org'").run());assert.equal((await f.request('tools','POST',{settings:defaultToolSettings,version:2})).status,409);
 f.as('other');assert.equal((await f.request('tools','GET')).status,403);f.as(null);assert.equal((await f.request('tools','GET')).status,401);f.as('worker');f.sql.prepare("UPDATE corporate_members SET active=0 WHERE account_id='worker'").run();f.as('peer');assert.equal((await f.request('tools','GET')).body.cards.length,0);f.sql.close();
});
test('HubSpot tokens are encrypted, bound to the company and reject invalid encryption keys',async()=>{
 const key=btoa('k'.repeat(32)),cipher=await sealCRM('private-token','org',key);assert.ok(!cipher.includes('private-token'));assert.equal(await openCRM(cipher,'org',key),'private-token');await assert.rejects(openCRM(cipher,'other-org',key));await assert.rejects(sealCRM('token','org','weak'));
});
test('HubSpot connector requires owner setup, explicit consent, scoped contacts and deduplicates sends',async()=>{
 const f=toolsFixture();f.sql.prepare('UPDATE corporate_leads SET created_at=?').run(Date.now());f.as('worker');assert.equal((await f.request('crm','GET')).status,403);assert.equal((await f.request('crm','POST',{action:'connect',token:'x'.repeat(30),version:0})).status,422);
 f.as('owner');let r=await f.request('crm','POST',{action:'connect',token:'x'.repeat(30),version:0});assert.equal(r.status,200);let info=(await f.request('crm','GET')).body;assert.equal(info.leads.length,1);assert.ok(!JSON.stringify(info).includes('token_cipher'));assert.ok(!f.sql.prepare('SELECT token_cipher FROM corporate_crm_connections').get().token_cipher.includes('x'.repeat(30)));
 const send={action:'sync',version:info.version,leads:['c','c2'],confirm:true};assert.equal((await f.request('crm','POST',{...send,confirm:false})).status,422);assert.equal((await f.request('crm','POST',send,'https://evil.example')).status,422);
 r=await f.request('crm','POST',send);assert.equal(r.body.results[0].status,'sent');assert.equal(r.body.results[1].status,'unavailable');assert.equal(f.calls(),1);assert.equal((await f.request('crm','POST',send)).body.results[0].status,'already-processed');assert.equal(f.calls(),1);
 f.sql.prepare("DELETE FROM corporate_leads WHERE id='c'").run();assert.equal(f.sql.prepare('SELECT COUNT(*) n FROM corporate_crm_syncs').get().n,0);
 f.race(()=>f.sql.prepare("UPDATE corporate_members SET role='member' WHERE account_id='owner' AND organisation_id='org'").run());assert.equal((await f.request('crm','POST',{action:'disconnect',version:info.version})).status,409);f.sql.close();
});
test('HubSpot transport reads before creating, does not overwrite and handles throttling/uncertain results',async()=>{
 const original=globalThis.fetch;const calls=[];try{
 globalThis.fetch=async(url,init)=>{calls.push({url,init});return Response.json({id:'42'});};assert.deepEqual(await sendHubSpot('secret',{name:'Ana Example',email:'ana@example.com',phone:''}),{id:'42',existing:true});assert.equal(calls.length,1);assert.equal(calls[0].init.redirect,'manual');
 calls.length=0;globalThis.fetch=async(url,init)=>{calls.push({url,init});return calls.length===1?new Response(null,{status:404}):Response.json({id:'43'});};assert.equal((await sendHubSpot('secret',{name:'Ana Example',email:'ana@example.com',phone:'+258840000000'})).id,'43');const sent=JSON.parse(calls[1].init.body);assert.deepEqual(sent.properties,{email:'ana@example.com',firstname:'Ana',lastname:'Example',phone:'+258840000000'});assert.ok(calls.every(c=>c.url.startsWith('https://api.hubapi.com/')));
 globalThis.fetch=async()=>new Response(null,{status:429});await assert.rejects(verifyHubSpot('secret'),e=>e.code==='limited');globalThis.fetch=async()=>{throw Error('timeout');};await assert.rejects(sendHubSpot('secret',{name:'Ana',email:'a@example.com',phone:''}),e=>e.code==='uncertain');
 }finally{globalThis.fetch=original;}
});


test('HubSpot verification uses a concrete minimal property and safe actionable failure codes',async()=>{
 const original=globalThis.fetch;
 try {
  globalThis.fetch=async(url)=>{const u=new URL(url);assert.equal(u.origin,'https://api.hubapi.com');assert.equal(u.searchParams.get('properties'),'hs_object_id');return Response.json({results:[]});};
  await verifyHubSpot('fictional-token');
  for(const [status,code] of [[400,'request'],[401,'credentials'],[403,'permissions'],[429,'limited'],[503,'unavailable']]) {
   globalThis.fetch=async()=>new Response('private-provider-body',{status});
   await assert.rejects(verifyHubSpot('fictional-token'),e=>e.code===code&&!e.message.includes('private-provider-body'));
  }
  globalThis.fetch=async()=>{throw Error('private transport information');};
  await assert.rejects(verifyHubSpot('fictional-token'),e=>e.code==='uncertain'&&!e.message.includes('private transport'));
 } finally {globalThis.fetch=original;}
});


test('CRM connection trims pasted whitespace and returns safe permission diagnostics without storing failures',async()=>{
 const f=toolsFixture();
 try {
  let received='';
  f.deps['@/lib/hubspot'].verifyHubSpot=async(token)=>{received=token;throw new HubSpotError('permissions');};
  let r=await f.request('crm','POST',{action:'connect',token:'  '+'x'.repeat(30)+'\n',version:0});
  assert.equal(received,'x'.repeat(30));assert.equal(r.status,422);assert.ok(r.body.error.includes('crm.objects.contacts.read'));
  assert.equal(f.sql.prepare('SELECT COUNT(*) n FROM corporate_crm_connections').get().n,0);
  assert.ok(!JSON.stringify(r.body).includes(received));
  r=await f.request('crm','POST',{action:'connect',token:'invalid token inside',version:0});assert.equal(r.status,422);assert.ok(r.body.error.includes('sem espaços internos'));
 } finally {f.sql.close();}
});


test('HubSpot rejects redirects without forwarding bearer credentials',async()=>{
 const original=globalThis.fetch;let calls=0;
 try {
  globalThis.fetch=async(url,init)=>{calls++;assert.equal(new URL(url).origin,'https://api.hubapi.com');assert.equal(init.redirect,'manual');return new Response(null,{status:302,headers:{Location:'https://other.example/collect'}});};
  await assert.rejects(verifyHubSpot('fictional-token'),e=>e.code==='rejected');
  assert.equal(calls,1);
 } finally {globalThis.fetch=original;}
});
