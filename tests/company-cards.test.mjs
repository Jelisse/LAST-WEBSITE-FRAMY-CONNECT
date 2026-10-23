import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
import {companyTemplate,companyCard,companyCardProfile,companyFollowup,companyPresentation} from '../lib/company-cards.ts';
import {profileBody,profileJSON} from '../lib/profile-api.ts';
import {profileTheme} from '../lib/profile-business.ts';

const template={company:'Example Studio',headline:'Company introduction',website:'www.example.com',accent:'sage'};
const card={name:'Example Employee',title:'Architect',email:'private@example.com',phone:'+258840000000',showEmail:false,showPhone:false};
test('company template and card validate safe content without exposing hidden contacts',()=>{
 const t=companyTemplate(template);assert.equal(t.website,'https://www.example.com/');
 const p=companyCardProfile(companyCard(card),t,'card-id');assert.equal(p.email,'');assert.equal(p.phone,'');assert.equal(p.username,'equipa/card-id');
 assert.ok(!JSON.stringify(companyCardProfile(companyCard({...card,internalName:'PRIVATE INTERNAL LABEL'}),t,'card-id')).includes('PRIVATE INTERNAL LABEL'));
 assert.equal(companyPresentation({...t,internalName:'PRIVATE',editable:['email']}).internalName,undefined);
 assert.throws(()=>companyTemplate({...template,website:'javascript:alert(1)'}));
 assert.throws(()=>companyTemplate({...template,accent:'url(evil)'}));assert.throws(()=>companyCard({...card,showEmail:'true'}));
 assert.throws(()=>companyFollowup({status:'new',note:'',dueDate:'2026-02-30'}));
 assert.throws(()=>companyFollowup({status:'unknown',note:'',dueDate:''}));
 assert.equal(companyFollowup({status:'waiting',note:'A\nB',dueDate:'2028-02-29'}).dueDate,'2028-02-29');
});
import {fixture} from './helpers/company-fixture.mjs';

test('company templates require active leaders and versioned employee cards preserve published privacy',async()=>{
 const f=fixture();assert.equal((await f.post({action:'template',version:0,template})).status,200);f.actor('worker');assert.notEqual((await f.post({action:'template',version:1,template})).status,200);
 assert.equal((await f.post({action:'publish-card',version:0,templateVersion:1,card})).status,200);
 const before=f.sql.prepare('SELECT * FROM corporate_cards').get();assert.equal(before.account_id,'worker');
 assert.equal((await f.post({action:'save-card',version:1,templateVersion:1,card:{...card,title:'Draft'}})).status,200);
 const after=f.sql.prepare('SELECT * FROM corporate_cards').get();assert.equal(JSON.parse(after.published_json).title,'Architect');assert.equal(JSON.parse(after.draft_json).title,'Draft');
 assert.equal((await f.post({action:'publish-card',version:1,templateVersion:1,card})).status,409);
 assert.equal((await f.post({action:'unpublish-card',version:2,templateVersion:1,card:{...card,email:'invalid'}})).status,200);assert.equal(f.sql.prepare('SELECT published_json FROM corporate_cards').get().published_json,null);
 f.actor('peer');assert.equal((await f.get()).body.card,null);f.actor(null);assert.equal((await f.get()).status,401);f.sql.close();
});
test('followup writes enforce tenant/employee boundaries, versions and demotion at write time',async()=>{
 const f=fixture();f.actor('worker');const request={action:'followup',version:0,leadId:'c',status:'progress',note:'Internal note',dueDate:'2026-10-22'};
 assert.equal((await f.post(request)).status,200);assert.equal((await f.post(request)).status,409);
 f.actor('peer');assert.equal((await f.post({...request,version:1})).status,409);
 f.actor('owner');assert.equal((await f.post({...request,version:1,status:'waiting'})).status,200);
 assert.equal((await f.post({...request,leadId:'c2'})).status,409);
 f.race(()=>f.sql.prepare("UPDATE corporate_members SET role='member' WHERE organisation_id='org' AND account_id='owner'").run());assert.equal((await f.post({...request,version:2})).status,409);
 f.actor('worker');f.sql.prepare("UPDATE corporate_requests SET status='suspended' WHERE owner_id='owner'").run();assert.notEqual((await f.post({...request,version:2})).status,200);f.sql.close();
});

test('prepared cards stay private, require employee publication and enforce template permissions',async()=>{
 const f=fixture();
 const rich={...template,design:'editorial',accent:'#113355',headline:'Line one\nLine two',editable:['name','email','phone','photoUrl','whatsapp','links']};
 assert.equal(companyTemplate(rich).headline,'Line one\nLine two');
 assert.equal((await f.post({action:'template',version:0,template:rich})).status,200);
 assert.equal((await f.post({action:'save-card',account:'worker',version:0,templateVersion:1,card})).status,200);
 assert.equal((await f.post({action:'publish-card',account:'worker',version:1,templateVersion:1,card})).status,422);
 f.actor('worker');assert.equal((await f.get()).body.card.draft.title,'Architect');
 assert.equal((await f.post({action:'publish-card',version:1,templateVersion:1,card:{...card,title:'Override'}})).status,422);
 assert.equal((await f.post({action:'publish-card',version:1,templateVersion:1,card})).status,200);
 f.actor('peer');assert.equal((await f.get('&account=worker')).status,403);
 assert.equal((await f.post({action:'save-card',account:'worker',version:2,templateVersion:1,card})).status,422);
 f.actor('owner');
 f.sql.prepare("INSERT INTO corporate_invites(id,organisation_id,account_id,created_by,email,name,role,account_version,token_hash,expires_at,created_at) VALUES('pending','org','other','owner','other@example.com','Other','member',1,'hash',?,0)").run(Date.now()+60000);
 const request={action:'save-card',account:'other',version:0,templateVersion:1,card:{...card,name:'Other'}};
 assert.equal((await f.post(request)).status,200);
 assert.equal((await f.post({...request,version:1,card:{...request.card,title:'Updated'}})).status,200);
 assert.equal((await f.post({...request,version:1})).status,409);
 assert.equal((await f.get('&account=other')).body.prepared.title,'Updated');
 assert.equal(f.sql.prepare("SELECT COUNT(*) AS n FROM corporate_cards WHERE account_id='other'").get().n,0);
 f.sql.prepare("UPDATE corporate_invites SET used_at=? WHERE id='pending'").run(Date.now());
 f.sql.prepare("INSERT INTO corporate_members(organisation_id,account_id,role,accepted_at) VALUES('org','other','member',2)").run();
 f.actor('other');const data=(await f.get()).body;assert.equal(data.prepared.title,'Updated');assert.equal(data.card,null);
 assert.equal((await f.post({action:'publish-card',version:0,templateVersion:1,card:data.prepared})).status,200);
 f.sql.close();
});
test('contact assignment and history preserve authorisation and ninety-day retention',async()=>{
 const f=fixture();const r={action:'followup',leadId:'c',version:0,status:'progress',note:'First',tags:'Event, Architecture',dueDate:'2026-10-23',assignee:'peer'};
 assert.equal((await f.post(r)).status,200);
 f.actor('peer');assert.equal((await f.post({...r,version:1,note:'Followed up'})).status,200);
 assert.equal((await f.post({...r,version:2,assignee:'worker'})).status,422);
 assert.equal((await f.get('&lead=c')).body.history.length,2);
 f.actor('other');assert.equal((await f.get('&lead=c')).status,403);
 f.actor('owner');f.race(()=>f.sql.prepare("UPDATE corporate_members SET role='member' WHERE account_id='owner' AND organisation_id='org'").run());
 assert.equal((await f.post({...r,version:2,assignee:'worker'})).status,409);
 f.sql.prepare("DELETE FROM corporate_leads WHERE id='c'").run();
 assert.equal(f.sql.prepare('SELECT COUNT(*) AS n FROM corporate_followup_history').get().n,0);
 assert.equal(f.sql.prepare('SELECT COUNT(*) AS n FROM corporate_followups').get().n,0);
 f.sql.close();
});

test('company metrics count only eligible published cards, respect privacy signals and do not accept arbitrary targets',async()=>{
 const f=fixture();await f.post({action:'template',version:0,template});f.actor('worker');await f.post({action:'publish-card',version:0,templateVersion:1,card});const id=f.sql.prepare('SELECT id FROM corporate_cards').get().id;
 let analytics=true;
 const deps={'@/lib/server-db':{database:()=>f.db},'@/lib/server-corporate':{corporatePlan:async()=>({analytics})},'@/lib/profile-api':{profileBody,profileJSON},'@/lib/request-limits':{rateLimit:async()=>true}};
 const js=ts.transpileModule(readFileSync('app/api/company-metrics/route.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;const module={exports:{}};new Function('require','exports','module',js)(name=>deps[name],module.exports,module);
 async function post(target,extra={},headers={}){return module.exports.POST(new Request('https://framy.example/api/company-metrics',{method:'POST',headers:{Origin:'https://framy.example','Content-Type':'application/json',...headers},body:JSON.stringify({cardId:id,target,...extra})}));}
 const total=()=>f.sql.prepare('SELECT COALESCE(SUM(count),0) AS n FROM corporate_card_metrics').get().n;
 await post('view');assert.equal(total(),0);
 await post('view',{consent:true});assert.equal(total(),1);
 await post('whatsapp',{}, {dnt:'1'});await post('email',{}, {'sec-gpc':'1'});assert.equal(total(),1);
 await post('whatsapp');await post('link:1');assert.equal(total(),3);
 assert.equal((await post('arbitrary-private-data')).status,422);assert.equal(total(),3);
 analytics=false;await post('phone');assert.equal(total(),3);analytics=true;
 f.sql.prepare('UPDATE corporate_cards SET published_json=NULL').run();await post('contact');assert.equal(total(),3);
 f.sql.close();
});

test('exact company brand colours keep AA contrast for all text tones',()=>{
 const luminance=hex=>{const c=[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);return c[0]*.2126+c[1]*.7152+c[2]*.0722;};
 for(const color of ['#000000','#ffffff','#777777','#888888','#ee590d','#336699','#00aa00']){const theme=profileTheme(color);for(const text of [theme.ink,theme.muted,theme.accent]){const a=luminance(color),b=luminance(text);assert.ok((Math.max(a,b)+.05)/(Math.min(a,b)+.05)>=4.5,color+' '+text);}}
});
