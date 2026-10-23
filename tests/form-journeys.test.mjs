import test from 'node:test';
import assert from 'node:assert/strict';
import {companyStepIssue,isFirstProfile} from '../lib/form-journeys.ts';
import {publicNavigation} from '../lib/public-navigation.ts';
test('company journey validates only the current step and does not invent required optional fields',()=>{
 const d={company:'Framy Test',location:'Maputo',phone:'+258841234567',offer:'business',people:3};
 assert.equal(companyStepIssue(0,d),null);assert.equal(companyStepIssue(1,d),null);assert.equal(companyStepIssue(2,d),null);
 assert.equal(companyStepIssue(0,{...d,company:''}),'Indique o nome da empresa.');assert.ok(companyStepIssue(0,{...d,location:''}));assert.ok(companyStepIssue(0,{...d,phone:'abc'}));
 for(const people of [2,51,3.2,NaN])assert.ok(companyStepIssue(1,{...d,people}));
 assert.equal(companyStepIssue(1,{...d,offer:'enterprise',people:51}),null);assert.ok(companyStepIssue(1,{...d,offer:'enterprise',people:50}));
 assert.equal(companyStepIssue(0,{...d,people:0}),null);
});
test('first-account welcome is shown only before any saved profile and never replaces an existing profile',()=>{assert.equal(isFirstProfile(0,false),true);assert.equal(isFirstProfile(1,false),false);assert.equal(isFirstProfile(1,true),false);assert.equal(isFirstProfile(0,true),false);});
test('desktop and mobile navigation share concrete Framy destinations for support, products and trust',()=>{const all=publicNavigation.flatMap(s=>s.groups.flatMap(g=>g.links));for(const href of ['/ajuda','/acompanhar','/contacto','/produtos','/privacidade','/termos'])assert.ok(all.some(l=>l.href===href));for(const link of all)assert.match(link.href,/^(\/(?!\/)|mailto:sales@framyconnect\.co\.mz$)/);});


test('account header returns only the signed-in account identity with no-store caching',async()=>{
 const ts=await import('typescript');const {readFileSync}=await import('node:fs');const {dashboardFor}=await import('../lib/auth-policy.ts');let actor=null;
 const module={exports:{}};const code=ts.default.transpileModule(readFileSync('app/api/session/route.ts','utf8'),{compilerOptions:{module:ts.default.ModuleKind.CommonJS,target:ts.default.ScriptTarget.ES2022}}).outputText;
 new Function('require','exports','module',code)(name=>name==='@/app/chatgpt-auth'?{getChatGPTUser:async()=>actor}:{dashboardFor},module.exports,module);
 let r=await module.exports.GET();assert.equal(r.headers.get('Cache-Control'),'no-store');assert.deepEqual(await r.json(),{dashboard:null,account:null});
 actor={role:'customer',fullName:'Local Test',displayName:'Local',email:'local@example.invalid'};r=await module.exports.GET();assert.deepEqual(await r.json(),{dashboard:'/dashboard',account:{name:'Local Test',email:'local@example.invalid'}});
});
