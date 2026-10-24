import {corporateInvitationEmail} from '../lib/corporate-invitation.ts';
import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import ts from 'typescript';
import { referralAmounts } from '../lib/ambassador.ts';
import {parseCorporateBatch,processCorporateBatch} from '../lib/corporate.ts';
test('corporate batch stops on failure and resumes remaining workers without resending successful invitations',async()=>{
 const rows=parseCorporateBatch('Ana;ana@example.invalid\nBruno;bruno@example.invalid\nCelia;celia@example.invalid');const attempted=[];
 const first=await processCorporateBatch(rows,async row=>{attempted.push(row.name);if(row.name==='Bruno')throw Error('Rate limited');return 'accepted';});
 assert.deepEqual(attempted,['Ana','Bruno']);assert.equal(first.completed,1);assert.equal(first.error,'Rate limited');assert.deepEqual(first.remaining.map(row=>row.name),['Bruno','Celia']);
 const second=await processCorporateBatch(first.remaining,async()=> 'uncertain');assert.equal(second.completed,2);assert.equal(second.uncertain,2);assert.deepEqual(second.remaining,[]);
});
test('corporate batch validation checks every row before invitations are sent',()=>{
 assert.deepEqual(parseCorporateBatch('Ana;ANA@example.invalid;Promotores\n陳美玲\tchen@example.invalid\tConteúdo'),[{name:'Ana',email:'ana@example.invalid',team:'Promotores'},{name:'陳美玲',email:'chen@example.invalid',team:'Conteúdo'}]);
 assert.throws(()=>parseCorporateBatch('Ana;a@example.invalid\nOutra;A@example.invalid'));
 assert.throws(()=>parseCorporateBatch('Ana;invalid-email'));
 assert.throws(()=>parseCorporateBatch(Array.from({length:26},(_,i)=>'Worker;worker'+i+'@example.invalid').join('\n')));
 assert.throws(()=>parseCorporateBatch(''));
});

test('ambassador commission uses original hardware and rounds each amount to cents', () => {
  assert.deepEqual(referralAmounts(100000,1000),{discount:10000,commission:10000});
  assert.deepEqual(referralAmounts(100000,1500),{discount:10000,commission:15000});
  assert.deepEqual(referralAmounts(100005,1500),{discount:10001,commission:15001});
  for (const invalid of [999,1501,1000.5,NaN]) assert.throws(()=>referralAmounts(100000,invalid));
});

test('changing ambassador conditions during checkout rolls back the order and all reservations', async t => {
  const f=fixture(t), checkout=await api('app/api/paysuite/checkout/route.ts');
  f.sql.prepare("INSERT INTO ambassadors(account_id,code,created_at) VALUES('other','ANA0001',?)").run(new Date().toISOString());
  const batch=f.db.batch.bind(f.db);
  f.db.batch=async statements=>{
    f.sql.exec("UPDATE ambassadors SET commission_bps=1500,version=version+1 WHERE account_id='other'");
    return batch(statements);
  };
  const result=await checkout.POST(request(product({ambassadorCode:'ANA0001',expectedAmount:141500})));
  assert.ok(result.status>=400,await result.clone().text());
  assert.equal(f.creates(),0);
  for(const table of ['paysuite_product_orders','ambassador_sales','paysuite_payments','paysuite_stock_reservations']) assert.equal(f.sql.prepare(`SELECT COUNT(*) n FROM ${table}`).get().n,0,table);
});

const root = fileURLToPath(new URL('../', import.meta.url));
const moduleURL = (code) =>
  'data:text/javascript;base64,' + Buffer.from(code).toString('base64');
const modules = new Map();
function loadModule(name) {
  const file = resolve(root, name);
  if (modules.has(file)) return modules.get(file);
  const mocks = {
    '@/lib/request-limits': moduleURL(
      'export async function rateLimit(){return true;}',
    ),
    '@/app/chatgpt-auth': moduleURL(
      'export async function getChatGPTUser(){return globalThis.__paysuite.user;}',
    ),
    'cloudflare:workers': moduleURL(
      'export const env=new Proxy({}, {get:(_,key)=>globalThis.__paysuite.env[key]});',
    ),
    'next/headers': moduleURL(
      'export async function cookies(){return {get:()=>({value:globalThis.__paysuite.cookie})};}',
    ),
  };
  let code = ts.transpileModule(readFileSync(file, 'utf8'), {
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  code = code.replace(/from ['"]([^'"]+)['"]/g, (whole, id) => {
    if (mocks[id]) return `from '${mocks[id]}'`;
    if (id === 'bcryptjs')
      return `from '${pathToFileURL(resolve(root, 'node_modules/bcryptjs/index.js')).href}'`;
    const target = id.startsWith('@/')
      ? resolve(root, id.slice(2))
      : id.startsWith('.')
        ? resolve(dirname(file), id)
        : null;
    return target
      ? `from '${loadModule(target.endsWith('.ts') ? target : target + '.ts')}'`
      : whole;
  });
  const result = moduleURL(code);
  modules.set(file, result);
  return result;
}
const api = async (file) => import(loadModule(file));
async function corporateFixture(t,seats=2) {
 const f=fixture(t);const now=new Date().toISOString();
 f.sql.prepare("UPDATE sandbox_memberships SET plan_id='corporate',terms_json=?,paid_started_at=?,paid_expires_at=? WHERE owner_id='buyer'").run(JSON.stringify({id:'corporate',entitlementVersion:1,memberLimit:seats,links:50,bio:1200,features:{teams:true}}),new Date(Date.now()-86400000).toISOString(),new Date(Date.now()+30*86400000).toISOString());
 f.env.RESEND_API_KEY='fake-email-key';f.env.PROFILE_EMAIL_FROM='Framy <info@example.invalid>';
 const provider=globalThis.fetch;const emails=[];
 globalThis.fetch=async(url,options)=>{if(String(url)==='https://api.resend.com/emails'){emails.push(JSON.parse(options.body));return Response.json({id:'fake-message'});}return provider(url,options);};
 const route=await api('app/api/corporate/route.ts');const created=await route.POST(request({action:'create',name:'Fictional organisation'}));assert.equal(created.status,200,await created.clone().text());const {id}=await created.json();
 return {...f,route,id,emails,token:()=>emails.at(-1).text.match(/aceitar#([a-f0-9]{64})/)[1]};
}

test('corporate onboarding confirms email, preserves existing accounts, enforces seats and scopes leaders',async t=>{
 const f=await corporateFixture(t);
 const invite=async(email,name='Employee',extra={})=>f.route.POST(request({action:'invite',organisation:f.id,email,name,role:'member',team:'Field',...extra}));
 let r=await invite('other@example.test');assert.equal(r.status,200,await r.clone().text());const token=f.token();
 const inspected=await f.route.POST(request({action:'inspect-invite',token}));assert.equal(inspected.status,200);assert.deepEqual(await inspected.json(),{organisation:'Fictional organisation',role:'member',team:'Field',newAccount:false,mode:'invite',inviterName:'buyer',name:'other'});assert.notEqual(f.sql.prepare('SELECT token_hash FROM corporate_invites').get().token_hash,token);
 globalThis.__paysuite.user={userId:'buyer',role:'customer'};assert.equal((await f.route.POST(request({action:'accept',token,confirmed:true}))).status,401);
 globalThis.__paysuite.user={userId:'other',role:'customer'};r=await f.route.POST(request({action:'accept',token,confirmed:true,password:'MustNotReplaceExisting'}));assert.equal(r.status,200,await r.clone().text());
 assert.equal(f.sql.prepare("SELECT password_hash FROM auth_accounts WHERE id='other'").get().password_hash,'!');
 assert.equal((await f.route.POST(request({action:'accept',token,confirmed:true}))).status,422);
 assert.equal((await f.route.POST(request({action:'campaign',organisation:f.id,name:'Forbidden'}))).status,422);
 const memberView=await (await f.route.GET(new Request('https://framyconnect.co.mz/api/corporate?organisation='+f.id))).json();assert.equal(memberView.members.length,1);assert.deepEqual(memberView.invites,[]);
 globalThis.__paysuite.user={userId:'buyer',role:'customer'};
 r=await invite('new-worker@example.invalid','New Employee');assert.equal(r.status,200,await r.clone().text());const oldToken=f.token();
 const pending=f.sql.prepare("SELECT * FROM auth_accounts WHERE email='new-worker@example.invalid'").get();assert.equal(pending.active,0);assert.equal(pending.role,'customer');
 assert.equal(f.sql.prepare('SELECT COUNT(*) n FROM corporate_members').get().n,2);
 assert.equal((await invite('third-worker@example.invalid')).status,422);assert.equal(f.sql.prepare("SELECT COUNT(*) n FROM auth_accounts WHERE email='third-worker@example.invalid'").get().n,0,'capacity failure rolls back pending account');
 r=await invite('new-worker@example.invalid');assert.equal(r.status,200,await r.clone().text());const newToken=f.token();assert.notEqual(newToken,oldToken);
 assert.equal((await f.route.POST(request({action:'accept',token:oldToken,confirmed:true,password:'VeryStrongPassword123'}))).status,422);
 globalThis.__paysuite.user=null;
 assert.equal((await f.route.POST(request({action:'accept',token:newToken,confirmed:false,password:'VeryStrongPassword123'}))).status,422);
 r=await f.route.POST(request({action:'accept',token:newToken,confirmed:true,password:'VeryStrongPassword123'}));assert.equal(r.status,200,await r.clone().text());
 assert.equal(f.sql.prepare('SELECT active FROM auth_accounts WHERE id=?').get(pending.id).active,1);
 assert.ok(f.sql.prepare('SELECT password_hash FROM auth_accounts WHERE id=?').get(pending.id).password_hash.startsWith('$2'));
 assert.equal(f.sql.prepare('SELECT plan_id FROM sandbox_memberships WHERE owner_id=?').get(pending.id).plan_id,'personal');
 assert.equal(f.sql.prepare('SELECT COUNT(*) n FROM corporate_members').get().n,3);
 assert.ok(!JSON.stringify(await (await f.route.GET(new Request('https://framyconnect.co.mz/api/corporate'))).json()).includes(newToken));
});

test('corporate campaigns isolate metrics and contacts, require consent and revoke access on suspension',async t=>{
 const f=await corporateFixture(t);const publicApi=await api('app/api/corporate-public/route.ts');
 await f.route.POST(request({action:'invite',organisation:f.id,email:'other@example.test',name:'Employee',team:'Field',role:'member'}));const token=f.token();globalThis.__paysuite.user={userId:'other',role:'customer'};assert.equal((await f.route.POST(request({action:'accept',token,confirmed:true}))).status,200);
 globalThis.__paysuite.user={userId:'buyer',role:'customer'};
 assert.equal((await f.route.POST(request({action:'campaign',organisation:f.id,name:'Event'}))).status,200);
 const campaign=f.sql.prepare('SELECT id FROM corporate_campaigns').get().id;
 assert.equal((await f.route.POST(request({action:'assign',organisation:f.id,id:campaign,accountId:'other'}))).status,200);
 const assignment=f.sql.prepare('SELECT id FROM corporate_assignments').get().id;
 f.sql.prepare("INSERT INTO profiles(owner_id,username,draft_json,published_json,updated_at) VALUES('other','worker_profile','{}','{}',?)").run(new Date().toISOString());
 globalThis.__paysuite.user=null;
 assert.equal((await publicApi.GET(new Request('https://framyconnect.co.mz/api/corporate-public?assignment='+assignment))).status,200);
 const metric=()=>publicApi.POST(request({action:'metric',assignment,target:'profile_open'}));assert.equal((await (await metric()).json()).recorded,true);
 assert.equal((await (await publicApi.POST(request({action:'metric',assignment,target:'contact',username:'worker_profile'}))).json()).recorded,true);
 assert.equal((await publicApi.POST(request({action:'metric',assignment,target:'phone',username:'worker_profile'}))).status,422);
 assert.equal((await publicApi.POST(request({action:'metric',assignment,target:'contact',username:'wrong_profile'}))).status,422);
 f.sql.exec("UPDATE sandbox_memberships SET terms_json=json_set(terms_json,'$.features.analytics',json('false')) WHERE owner_id='buyer'");assert.equal((await (await metric()).json()).recorded,false);f.sql.exec("UPDATE sandbox_memberships SET terms_json=json_set(terms_json,'$.features.analytics',json('true')) WHERE owner_id='buyer'");
 f.sql.prepare('INSERT INTO profile_click_totals VALUES(?,?,?,?,?)').run('other',Date.now(),'contact','Personal history',999);
 const lead={action:'lead',assignment,requestId:crypto.randomUUID(),name:'Visitor',email:'visitor@example.invalid',phone:'',interest:'Product',consent:false};assert.equal((await publicApi.POST(request(lead))).status,422);
 lead.consent=true;assert.equal((await publicApi.POST(request(lead))).status,200);assert.equal((await publicApi.POST(request(lead))).status,200);assert.equal(f.sql.prepare('SELECT COUNT(*) n FROM corporate_leads').get().n,1);
 globalThis.__paysuite.user={userId:'manager',role:'manager'};assert.equal((await f.route.GET(new Request('https://framyconnect.co.mz/api/corporate?organisation='+f.id))).status,403,'global manager is not an organisation leader');
 globalThis.__paysuite.user={userId:'other',role:'customer'};const view=await (await f.route.GET(new Request('https://framyconnect.co.mz/api/corporate?organisation='+f.id))).json();assert.equal(view.leads.length,1);assert.equal(view.metrics[0].count,1);assert.equal(view.metrics.reduce((sum,m)=>sum+m.count,0),2,'personal click history is not shared');assert.equal((await (await metric()).json()).recorded,false,'staff clicks are excluded');
 globalThis.__paysuite.user={userId:'buyer',role:'customer'};
 const suspend={action:'member',organisation:f.id,id:'other',version:1,active:false,role:'member',team:'Field'};assert.equal((await f.route.POST(request(suspend))).status,200);assert.equal((await f.route.POST(request(suspend))).status,409);
 globalThis.__paysuite.user={userId:'other',role:'customer'};assert.equal((await f.route.GET(new Request('https://framyconnect.co.mz/api/corporate?organisation='+f.id))).status,403);
 globalThis.__paysuite.user=null;assert.equal((await publicApi.GET(new Request('https://framyconnect.co.mz/api/corporate-public?assignment='+assignment))).status,404);assert.equal((await publicApi.POST(request({...lead,requestId:crypto.randomUUID()}))).status,404);
});

test('corporate invitations fail after cancellation, account changes or paid contract expiry',async t=>{
 const f=await corporateFixture(t);const send=()=>f.route.POST(request({action:'invite',organisation:f.id,email:'other@example.test',name:'Worker',role:'member',team:''}));
 assert.equal((await send()).status,200);const token=f.token();const invite=f.sql.prepare('SELECT id FROM corporate_invites').get().id;
 assert.equal((await f.route.POST(request({action:'revoke',organisation:f.id,id:invite}))).status,200);
 globalThis.__paysuite.user={userId:'other',role:'customer'};assert.equal((await f.route.POST(request({action:'accept',token,confirmed:true}))).status,422);
 globalThis.__paysuite.user={userId:'buyer',role:'customer'};assert.equal((await send()).status,200);const changed=f.token();f.sql.exec("UPDATE auth_accounts SET version=version+1 WHERE id='other'");
 globalThis.__paysuite.user={userId:'other',role:'customer'};assert.equal((await f.route.POST(request({action:'accept',token:changed,confirmed:true}))).status,422);
 globalThis.__paysuite.user={userId:'buyer',role:'customer'};assert.equal((await send()).status,200);const expired=f.token();f.sql.prepare("UPDATE sandbox_memberships SET paid_started_at=?,paid_expires_at=? WHERE owner_id='buyer'").run(new Date(Date.now()-60*86400000).toISOString(),new Date(Date.now()-8*86400000).toISOString());
 globalThis.__paysuite.user={userId:'other',role:'customer'};assert.equal((await f.route.POST(request({action:'accept',token:expired,confirmed:true}))).status,422);
 assert.equal(f.sql.prepare('SELECT COUNT(*) n FROM corporate_members').get().n,1);
});

test('corporate delegated leaders cannot promote others or read another company; members can leave',async t=>{
 const f=await corporateFixture(t,3);
 assert.equal((await f.route.POST(request({action:'invite',organisation:f.id,name:'Leader',email:'other@example.test',role:'leader',team:''}))).status,200);
 globalThis.__paysuite.user={userId:'other',role:'customer'};
 assert.equal((await f.route.POST(request({action:'accept',token:f.token(),confirmed:true}))).status,200);
 assert.equal((await f.route.POST(request({action:'invite',organisation:f.id,name:'Other leader',email:'manager@example.test',role:'leader',team:''}))).status,422);
 assert.equal((await f.route.POST(request({action:'member',organisation:f.id,id:'buyer',version:1,active:false,role:'member',team:''}))).status,422,'owner cannot be suspended');
 const plan=f.sql.prepare("SELECT terms_json,paid_started_at,paid_expires_at FROM sandbox_memberships WHERE owner_id='buyer'").get();
 f.sql.prepare("UPDATE sandbox_memberships SET plan_id='corporate',terms_json=?,paid_started_at=?,paid_expires_at=? WHERE owner_id='other'").run(plan.terms_json,plan.paid_started_at,plan.paid_expires_at);
 const created=await f.route.POST(request({action:'create',name:'Second company'}));assert.equal(created.status,200,await created.clone().text());const second=(await created.json()).id;
 globalThis.__paysuite.user={userId:'buyer',role:'customer'};assert.equal((await f.route.GET(new Request('https://framyconnect.co.mz/api/corporate?organisation='+second))).status,403);
 globalThis.__paysuite.user={userId:'other',role:'customer'};assert.equal((await f.route.POST(request({action:'leave',organisation:f.id}))).status,200);assert.equal((await f.route.GET(new Request('https://framyconnect.co.mz/api/corporate?organisation='+f.id))).status,403);
 globalThis.__paysuite.user={userId:'buyer',role:'customer'};assert.equal((await f.route.POST(request({action:'member',organisation:f.id,id:'other',role:'member',active:true,team:'',version:2}))).status,422,'a leader cannot override withdrawal');
 assert.equal((await f.route.POST(request({action:'invite',organisation:f.id,name:'Rejoining employee',email:'other@example.test',role:'member',team:''}))).status,200);globalThis.__paysuite.user={userId:'other',role:'customer'};assert.equal((await f.route.POST(request({action:'accept',token:f.token(),confirmed:true}))).status,200);assert.equal(f.sql.prepare('SELECT left_at FROM corporate_members WHERE organisation_id=? AND account_id=?').get(f.id,'other').left_at,null);
});

test('corporate contract seat reductions stop excess campaign access without disabling personal accounts',async t=>{
 const f=await corporateFixture(t,3),publicApi=await api('app/api/corporate-public/route.ts');
 for(const id of ['other','manager']){
  globalThis.__paysuite.user={userId:'buyer',role:'customer'};
  assert.equal((await f.route.POST(request({action:'invite',organisation:f.id,email:id+'@example.test',name:id,role:'member',team:''}))).status,200);
  globalThis.__paysuite.user={userId:id,role:id==='manager'?'manager':'customer'};
  assert.equal((await f.route.POST(request({action:'accept',token:f.token(),confirmed:true}))).status,200);
 }
 globalThis.__paysuite.user={userId:'buyer',role:'customer'};await f.route.POST(request({action:'campaign',organisation:f.id,name:'Event'}));const campaign=f.sql.prepare('SELECT id FROM corporate_campaigns').get().id;
 for(const id of ['other','manager'])assert.equal((await f.route.POST(request({action:'assign',organisation:f.id,id:campaign,accountId:id}))).status,200);
 f.sql.exec("UPDATE sandbox_memberships SET terms_json=json_set(terms_json,'$.memberLimit',1) WHERE owner_id='buyer'");
 const effective=f.sql.prepare("SELECT account_id FROM corporate_effective_members WHERE account_id<>'buyer'").all();assert.equal(effective.length,1);const outside=effective[0].account_id==='other'?'manager':'other';
 const assignment=f.sql.prepare('SELECT id FROM corporate_assignments WHERE account_id=?').get(outside).id;globalThis.__paysuite.user=null;
 assert.equal((await publicApi.GET(new Request('https://framyconnect.co.mz/api/corporate-public?assignment='+assignment))).status,404);
 assert.equal(f.sql.prepare('SELECT active FROM auth_accounts WHERE id=?').get(outside).active,1);
 globalThis.__paysuite.user={userId:outside,role:'customer'};assert.equal((await f.route.GET(new Request('https://framyconnect.co.mz/api/corporate?organisation='+f.id))).status,403);
 globalThis.__paysuite.user={userId:'buyer',role:'customer'};assert.equal((await f.route.POST(request({action:'member',organisation:f.id,id:outside,active:false,role:'member',team:'',version:1}))).status,200);
 f.sql.exec("UPDATE sandbox_memberships SET terms_json=json_set(terms_json,'$.memberLimit',3) WHERE owner_id='buyer'");assert.equal((await f.route.POST(request({action:'member',organisation:f.id,id:outside,active:true,role:'member',team:'',version:2}))).status,200);
 assert.equal((await publicApi.GET(new Request('https://framyconnect.co.mz/api/corporate-public?assignment='+assignment))).status,200);
 f.sql.exec("UPDATE sandbox_memberships SET plan_id='personal',terms_json=json_set(terms_json,'$.id','personal','$.corporateEnabled',json('true')) WHERE owner_id='buyer'");
 assert.equal((await f.route.GET(new Request('https://framyconnect.co.mz/api/corporate?organisation='+f.id))).status,403,'free plans cannot acquire company access through copied flags');
 assert.equal((await publicApi.GET(new Request('https://framyconnect.co.mz/api/corporate-public?assignment='+assignment))).status,404);
});
function fixture(t) {
  const sql = new DatabaseSync(':memory:');
  sql.exec('PRAGMA foreign_keys=ON');
  for (const file of readdirSync('drizzle')
    .filter((f) => f.endsWith('.sql'))
    .sort())
    sql.exec(readFileSync('drizzle/' + file, 'utf8'));
  const db = {
    prepare(query) {
      let args = [];
      const stmt = {
        bind(...values) {
          args = values;
          return stmt;
        },
        async first() {
          return sql.prepare(query).get(...args) ?? null;
        },
        async all() {
          return { results: sql.prepare(query).all(...args) };
        },
        exec() {
          // D1 batch returns rows for read statements, including report CTEs.
          if (/^\s*(?:WITH|SELECT|PRAGMA)\b/i.test(query))
            return { results: sql.prepare(query).all(...args), meta: { changes: 0 } };
          return {
            meta: { changes: Number(sql.prepare(query).run(...args).changes) },
          };
        },
        async run() {
          return stmt.exec();
        },
      };
      return stmt;
    },
    async batch(stmts) {
      sql.exec('BEGIN');
      try {
        const results = stmts.map((s) => s.exec());
        sql.exec('COMMIT');
        return results;
      } catch (e) {
        sql.exec('ROLLBACK');
        throw e;
      }
    },
  };
  const now = new Date().toISOString();
  for (const [id, role] of [
    ['buyer', 'customer'],
    ['other', 'customer'],
    ['manager', 'manager'],
  ])
    sql
      .prepare(
        'INSERT INTO auth_accounts(id,email,name,password_hash,role,created_at) VALUES(?,?,?,?,?,?)',
      )
      .run(id, id + '@example.test', id, '!', role, now);
  sql
    .prepare(
      "INSERT INTO sandbox_memberships(owner_id,plan_id,version,updated_at,trial_started_at,trial_expires_at) VALUES('buyer','free-30',1,?,?,?)",
    )
    .run(
      now,
      new Date(Date.now() - 31 * 86400000).toISOString(),
      new Date(Date.now() - 86400000).toISOString(),
    );
  sql
    .prepare(
      "INSERT INTO profiles(owner_id,username,draft_json,published_json,updated_at) VALUES('buyer','buyer','{}','{}',?)",
    )
    .run(now);
  sql.exec(
    // Give each isolated fixture a known version, independent of data migrations.
    'UPDATE profile_billing_settings SET enabled=1; UPDATE checkout_pricing SET enabled=1,version=0',
  );
  for (const [id, amount] of [
    ['pvc', 95000],
    ['keychain', 50000],
  ]) {
    sql
      .prepare(
        'INSERT INTO product_catalog(id,data_json,version,updated_by,updated_at) VALUES(?,?,1,?,?)',
      )
      .run(
        id,
        JSON.stringify({
          amount,
          published: true,
          available: true,
          availabilityConfigured: true,
          configurationPriceConfirmed: true,
          kitAmount: 135000,
        }),
        'manager',
        now,
      );
    sql
      .prepare(
        'INSERT INTO stock_movements(id,product_id,quantity,reason,actor,created_at) VALUES(?,?,100,?,?,?)',
      )
      .run('ps-test-' + id, id, 'test', 'manager', now);
  }
  const env = {
    DB: db,
    PAYSUITE_ENABLED: 'true',
    PUBLIC_SITE_URL: 'https://framyconnect.co.mz',
    PAYSUITE_API_TOKEN: 'test-only-fake-token',
    PAYSUITE_WEBHOOK_SECRET: 'test-only-signing-secret',
  };
  globalThis.__paysuite = { env, user: { userId: 'buyer', role: 'customer' } };
  const records = new Map();
  let creates = 0;
  const oldFetch = globalThis.fetch;
  globalThis.fetch = async (url, options) => {
    assert.ok(String(url).startsWith('https://paysuite.tech/api/v1/payments'));
    assert.equal(options.headers.Authorization, 'Bearer test-only-fake-token');
    assert.equal(options.redirect, 'manual');
    if (options.method === 'POST') {
      creates++;
      const body = JSON.parse(options.body);
      assert.equal(body.callback_url, 'https://framyconnect.co.mz/api/paysuite/webhook');
      assert.equal(body.webhook_url, undefined);
      // PaySuite only accepts letters and numbers in the reference.
      assert.match(body.reference, /^[A-Za-z0-9]+$/);
      const id = '01H' + String(creates).padStart(23, '0');
      const record = {
        ...body,
        id,
        status: 'pending',
        checkout_url: 'https://paysuite.tech/checkout/' + id,
      };
      records.set(id, record);
      return Response.json(
        { status: 'success', data: record },
        { status: 201 },
      );
    }
    const id = String(url).split('/').at(-1);
    assert.ok(records.has(id));
    return Response.json({ status: 'success', data: records.get(id) });
  };
  t.after(() => {
    globalThis.fetch = oldFetch;
    sql.close();
  });
  return { sql, db, env, records, creates: () => creates };
}
function request(body) {
  return new Request('https://framyconnect.co.mz/api/paysuite/checkout', {
    method: 'POST',
    headers: {
      Origin: 'https://framyconnect.co.mz',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
}
function product(overrides = {}) {
  return {
    kind: 'product',
    format: 'kit',
    card: 'PVC',
    keychain: 'PVC + epóxi',
    design: 'standard',
    delivery: 'standard',
    city: 'maputo',
    contact: '+258840000000',
    address: 'Maputo, rua de teste 123',
    expectedAmount: 155000,
    pricingVersion: 0,
    accepted: true,
    method: 'mpesa',
    requestId: crypto.randomUUID().replaceAll('-', ''),
    ...overrides,
  };
}
async function notify(f, id, event = 'payment.success', overrides = {}) {
  const record = f.records.get(id);
  const raw = JSON.stringify({
    event,
    data: {
      id,
      reference: record.reference,
      amount: record.amount,
      ...overrides,
    },
  });
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(f.env.PAYSUITE_WEBHOOK_SECRET),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = Buffer.from(
    await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(raw)),
  ).toString('hex');
  return (await api('app/api/paysuite/webhook/route.ts')).POST(
    new Request('https://framyconnect.co.mz/api/paysuite/webhook', {
      method: 'POST',
      headers: { 'X-Signature': signature },
      body: raw,
    }),
  );
}
test('PaySuite product checkout -> hosted payment -> signed webhook -> paid is idempotent and reserves both kit items', async (t) => {
  const f = fixture(t);
  const route = await api('app/api/paysuite/checkout/route.ts');
  const body = product();
  const created = await route.POST(request(body));
  assert.equal(created.status, 200, await created.clone().text());
  const result = await created.json();
  assert.equal(result.status, 'pending');
  assert.equal(
    f.sql.prepare('SELECT COUNT(*) n FROM paysuite_stock_reservations').get().n,
    2,
  );
  await route.POST(request(body));
  assert.equal(f.creates(), 1);
  const [id, record] = [...f.records][0];
  record.status = 'paid';
  assert.equal((await notify(f, id)).status, 204);
  assert.equal((await notify(f, id)).status, 204);
  assert.equal(
    f.sql
      .prepare('SELECT status FROM paysuite_product_orders WHERE id=?')
      .get(body.requestId).status,
    'paid',
  );
  assert.equal(
    f.sql.prepare('SELECT COUNT(*) n FROM paysuite_events').get().n,
    1,
  );
  // A delayed failed event cannot undo a verified paid transaction.
  assert.equal((await notify(f, id, 'payment.failed')).status, 204);
  assert.equal(
    f.sql.prepare('SELECT status FROM paysuite_payments').get().status,
    'paid',
  );
  globalThis.__paysuite.user = { userId: 'other', role: 'customer' };
  assert.equal(
    (
      await route.GET(
        new Request(
          'https://framyconnect.co.mz/api/paysuite/checkout?payment=' +
            result.paymentId,
        ),
      )
    ).status,
    404,
  );
});
test('references sent to PaySuite contain only letters and numbers', async (t) => {
  const f = fixture(t);
  const route = await api('app/api/paysuite/checkout/route.ts');
  const body = product();
  assert.match(body.requestId, /^[0-9a-f]{32}$/);
  assert.equal((await route.POST(request(body))).status, 200);
  // A hyphenated UUID reference is rejected before contacting the provider.
  assert.equal(
    (
      await route.POST(
        request(product({ requestId: crypto.randomUUID() })),
      )
    ).status,
    422,
  );
  assert.equal(f.creates(), 1);
});
test('PaySuite rejects forged webhooks, changed amounts, unsupported delivery and out-of-stock checkout', async (t) => {
  const f = fixture(t);
  const route = await api('app/api/paysuite/checkout/route.ts');
  assert.equal(
    (await route.POST(request(product({ expectedAmount: 1 })))).status,
    422,
  );
  assert.equal(
    (await route.POST(request(product({ delivery: 'other' })))).status,
    422,
  );
  assert.equal(f.creates(), 0);
  const body = product();
  assert.equal((await route.POST(request(body))).status, 200);
  const [id, record] = [...f.records][0];
  record.status = 'paid';
  record.amount = '1.00';
  assert.equal((await notify(f, id)).status, 503);
  assert.equal(
    f.sql.prepare('SELECT status FROM paysuite_payments').get().status,
    'pending',
  );
  const webhook = await api('app/api/paysuite/webhook/route.ts');
  assert.equal(
    (
      await webhook.POST(
        new Request('https://framyconnect.co.mz/api/paysuite/webhook', {
          method: 'POST',
          headers: { 'X-Signature': '0'.repeat(64) },
          body: '{}',
        }),
      )
    ).status,
    401,
  );
  f.sql.exec("DELETE FROM stock_movements WHERE product_id='pvc'");
  assert.equal((await route.POST(request(product()))).status, 422);
  assert.equal(
    f.sql.prepare('SELECT COUNT(*) n FROM paysuite_product_orders').get().n,
    1,
  );
});
test('failed PaySuite payments release stock once; late success is held for review', async (t) => {
  const f = fixture(t);
  const route = await api('app/api/paysuite/checkout/route.ts');
  await route.POST(request(product()));
  const [id, record] = [...f.records][0];
  record.status = 'failed';
  assert.equal((await notify(f, id, 'payment.failed')).status, 204);
  await notify(f, id, 'payment.failed');
  assert.equal(
    f.sql
      .prepare(
        "SELECT COUNT(*) n FROM stock_movements WHERE id LIKE 'ps-release-%'",
      )
      .get().n,
    2,
  );
  record.status = 'paid';
  await notify(f, id);
  assert.equal(
    f.sql.prepare('SELECT status FROM paysuite_payments').get().status,
    'review',
  );
});
test('annual and monthly subscription checkout allows an immediate paid upgrade from free Individual and extends access exactly once', async (t) => {
  const f = fixture(t);
  const route = await api('app/api/paysuite/checkout/route.ts');
  f.sql
    .prepare(
      'UPDATE sandbox_memberships SET trial_started_at=?,trial_expires_at=?',
    )
    .run(
      new Date().toISOString(),
      new Date(Date.now() + 30 * 86400000).toISOString(),
    );
  const body = {
    kind: 'subscription',
    planId: 'professional-v2',
    planVersion: 0,
    cycle: 'annual',
    expectedAmount: 250000,
    accepted: true,
    method: 'credit_card',
    requestId: crypto.randomUUID().replaceAll('-', ''),
  };
  assert.equal((await route.POST(request({...body,planId:'personal'}))).status,422);
  assert.equal(f.creates(),0);
  const created = await route.POST(request(body));
  assert.equal(created.status, 200, await created.clone().text());
  const [id, record] = [...f.records][0];
  record.status = 'paid';
  await Promise.all([notify(f, id), notify(f, id)]);
  const end = f.sql
    .prepare('SELECT paid_expires_at FROM sandbox_memberships')
    .get().paid_expires_at;
  assert.ok(Date.parse(end) > Date.now() + 364 * 86400000);
  await Promise.all([notify(f, id), notify(f, id)]);
  assert.equal(
    f.sql.prepare('SELECT paid_expires_at FROM sandbox_memberships').get()
      .paid_expires_at,
    end,
  );
  assert.equal(
    f.sql.prepare('SELECT COUNT(*) n FROM profile_receipts').get().n,
    1,
  );
  const next = {
    ...body,
    requestId: crypto.randomUUID().replaceAll('-', ''),
    cycle: 'monthly',
    expectedAmount: 25000,
  };
  assert.equal((await route.POST(request(next))).status, 200);
  const [nextId, nextRecord] = [...f.records][1];
  nextRecord.status = 'paid';
  await notify(f, nextId);
  assert.ok(
    Date.parse(
      f.sql.prepare('SELECT next_expires_at FROM sandbox_memberships').get()
        .next_expires_at,
    ) >
      Date.parse(end) + 27 * 86400000,
  );
});
test('ambiguous provider timeout does not create another payment on retry', async (t) => {
  const f = fixture(t),
    route = await api('app/api/paysuite/checkout/route.ts');
  const transport = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = async (...args) => {
    calls++;
    await transport(...args);
    throw Error('timeout');
  };
  const body = product();
  assert.equal((await route.POST(request(body))).status, 202);
  assert.equal((await route.POST(request(body))).status, 200);
  assert.equal(calls, 1);
  assert.equal(
    f.sql.prepare('SELECT status FROM paysuite_payments').get().status,
    'creating',
  );
  // The sanitized failure category is persisted for after-the-fact diagnosis.
  assert.equal(
    f.sql
      .prepare('SELECT event FROM paysuite_events WHERE payment_id=?')
      .get(body.requestId).event,
    'launch-failed:network',
  );
});

test('provider diagnostics classify rejection, timeout and malformed responses without leaking bodies', async () => {
  const { paysuiteRequest, paymentDiagnostic } = await api('lib/paysuite.ts');
  for (const [transport, expected] of [
    [async () => new Response('secret-provider-body', { status: 401 }), { category: 'http', httpStatus: 401 }],
    [async () => new Response(null, { status: 302, headers: { Location: 'https://other.example' } }), { category: 'http', httpStatus: 302 }],
    [async () => { throw new DOMException('secret-network-details', 'TimeoutError'); }, { category: 'timeout', httpStatus: null }],
    [async () => new Response('not-json'), { category: 'invalid_response', httpStatus: 200 }],
  ]) {
    await assert.rejects(() => paysuiteRequest('test-token', '/payments', {}, transport), error => {
      assert.deepEqual(paymentDiagnostic(error), expected);
      assert.doesNotMatch(JSON.stringify(paymentDiagnostic(error)) + error.message, /secret|test-token|not-json/);
      return true;
    });
  }
});

test('pending order limit explains the blocker without contacting the provider again', async t => {
  const f = fixture(t), route = await api('app/api/paysuite/checkout/route.ts');
  for (let i = 0; i < 3; i++) assert.equal((await route.POST(request(product()))).status, 200);
  const response = await route.POST(request(product()));
  assert.equal(response.status, 409);
  const payload = await response.json();
  assert.match(payload.error, /três encomendas pendentes/);
  // The blocker offers the customer's existing PaySuite checkout to resume.
  const record = [...f.records.values()].find((r) => r.reference === payload.resumePaymentId);
  assert.ok(record);
  assert.equal(payload.resumeUrl, record.checkout_url);
  assert.equal(f.creates(), 3);
});

test('stale product payments expire, release stock and free the pending-order limit', async (t) => {
  const f = fixture(t),
    route = await api('app/api/paysuite/checkout/route.ts');
  const { expireStaleProductPayments } = await api('lib/server-paysuite.ts');
  for (let i = 0; i < 3; i++)
    assert.equal((await route.POST(request(product()))).status, 200);
  assert.equal((await route.POST(request(product()))).status, 409);
  // Recent attempts are never expired.
  assert.equal(await expireStaleProductPayments(f.db), 0);
  const dayAhead = Date.now() + 25 * 3600000;
  assert.equal(await expireStaleProductPayments(f.db, dayAhead), 3);
  assert.equal(
    f.sql
      .prepare("SELECT COUNT(*) n FROM paysuite_payments WHERE status='failed'")
      .get().n,
    3,
  );
  assert.equal(
    f.sql
      .prepare(
        "SELECT COUNT(*) n FROM paysuite_product_orders WHERE status='failed'",
      )
      .get().n,
    3,
  );
  assert.equal(
    f.sql
      .prepare(
        'SELECT COUNT(*) n FROM paysuite_stock_reservations WHERE released=1',
      )
      .get().n,
    6,
  );
  // Expiry is idempotent and the customer can order again.
  assert.equal(await expireStaleProductPayments(f.db, dayAhead), 0);
  assert.equal((await route.POST(request(product()))).status, 200);
  // A launch that never reached the provider expires after one hour.
  const transport = globalThis.fetch;
  globalThis.fetch = async () => {
    throw Error('timeout');
  };
  const stuck = product();
  assert.equal((await route.POST(request(stuck))).status, 202);
  globalThis.fetch = transport;
  assert.equal(
    await expireStaleProductPayments(f.db, Date.now() + 3600001),
    1,
  );
  assert.equal(
    f.sql
      .prepare('SELECT status FROM paysuite_payments WHERE id=?')
      .get(stuck.requestId).status,
    'failed',
  );
  assert.equal(
    f.sql
      .prepare(
        "SELECT COUNT(*) n FROM paysuite_stock_reservations WHERE released=1",
      )
      .get().n,
    8,
  );
});

test('connection check is authenticated, read-only and does not expose provider bodies', async t => {
  fixture(t);
  const route = await api('app/api/paysuite/connection/route.ts');
  const check = new Request('https://framyconnect.co.mz/api/paysuite/connection');
  let calls=0;
  globalThis.fetch = async (url, options) => {
    calls++;
    assert.match(url, /payments\/00000000-0000-0000-0000-000000000000$/);
    assert.equal(options.method, 'GET');
    assert.equal(options.redirect, 'manual');
    return new Response('secret provider body', { status: 404 });
  };
  globalThis.__paysuite.user = null;
  assert.equal((await route.GET(check)).status, 401);
  assert.equal(calls, 0);
  globalThis.__paysuite.user = {userId:'buyer',role:'customer'};
  const response = await route.GET(check);
  const body = await response.json();
  assert.equal(body.providerHttpStatus, 404);
  assert.equal(body.paymentCreated, false);
  assert.doesNotMatch(JSON.stringify(body), /secret|token/);
});
test('only verified paid orders can be fulfilled and the customer sees the delivery state', async (t) => {
  const f = fixture(t), checkout = await api('app/api/paysuite/checkout/route.ts'), manager = await api('app/api/paysuite/manager/route.ts');
  const buyer = globalThis.__paysuite.user;
  const body = product();
  assert.equal((await checkout.POST(request(body))).status, 200);
  assert.equal((await manager.POST(request({ action: 'fulfilled', id: body.requestId }))).status, 403);
  globalThis.__paysuite.user = { userId: 'manager-test', role: 'manager' };
  assert.equal((await manager.POST(request({ action: 'fulfilled', id: body.requestId }))).status, 409);
  const [id, record] = [...f.records][0]; record.status = 'paid';
  await notify(f, id);
  assert.equal((await manager.POST(request({ action: 'fulfilled', id: body.requestId }))).status, 200);
  assert.equal((await manager.POST(request({ action: 'fulfilled', id: body.requestId }))).status, 409);
  globalThis.__paysuite.user = buyer;
  const status = await (await checkout.GET(new Request('https://framyconnect.co.mz/api/paysuite/checkout?payment=' + body.requestId))).json();
  assert.equal(status.status, 'paid'); assert.equal(status.orderStatus, 'fulfilled');
  assert.equal(status.configuration_json, undefined);
  const list = await (await checkout.GET(new Request('https://framyconnect.co.mz/api/paysuite/checkout'))).json();
  assert.equal(list.payments[0].orderStatus, 'fulfilled');
});

test('provider URL validation and calendar billing handle security and leap years', async () => {
  const { checkoutURL, billingPeriodEnd, minorAmount } =
    await import('../lib/paysuite.ts');
  for (const url of [
    'https://paysuite.tech.evil.test/checkout/x',
    'http://paysuite.tech/checkout/x',
    'https://user:pass@paysuite.tech/checkout/x',
    'https://paysuite.tech:444/checkout/x',
  ])
    assert.throws(() => checkoutURL(url));
  assert.equal(
    billingPeriodEnd('2024-02-29T12:00:00.000Z', 'annual'),
    '2025-02-28T12:00:00.000Z',
  );
  assert.equal(
    billingPeriodEnd('2026-01-31T12:00:00.000Z', 'monthly'),
    '2026-02-28T12:00:00.000Z',
  );
  assert.equal(minorAmount('100.50'), 10050);
  assert.throws(() => minorAmount('1.001'));
});

test('custom annual-only plan checks out and preserves effective terms when scheduling a later renewal', async(t)=>{
 const f=fixture(t),route=await api('app/api/paysuite/checkout/route.ts');
 const plan={id:'plan-custom',name:'Custom',audience:'Creators',description:'Custom',active:true,meticais:150,annualMeticais:1500,links:12,bio:400,entitlementVersion:1,features:{whatsapp:false,location:false,showcase:true,enquiries:false,english:false,analytics:true,teams:false,domain:false},monthlyEnabled:false,annualEnabled:true};
 f.sql.prepare("INSERT INTO manager_records(id,kind,data_json,version,updated_at) VALUES(?,'plan',?,1,?)").run(plan.id,JSON.stringify(plan),new Date().toISOString());
 const base={kind:'subscription',planId:plan.id,planVersion:1,accepted:true,method:'credit_card',requestId:crypto.randomUUID().replaceAll('-',''),cycle:'monthly',expectedAmount:15000};
 assert.equal((await route.POST(request(base))).status,422);
 const body={...base,cycle:'annual',expectedAmount:150000};assert.equal((await route.POST(request(body))).status,200);
 const [id,record]=[...f.records][0];record.status='paid';await notify(f,id);
 assert.equal(f.sql.prepare('SELECT plan_id FROM profile_membership_view').get().plan_id,plan.id);
 // Model a previous scheduled change that has already become effective.
 const start=new Date(Date.now()-86400000).toISOString(),end=new Date(Date.now()+20*86400000).toISOString();
 f.sql.prepare("UPDATE sandbox_memberships SET plan_id='personal',terms_json='{}',next_plan_id=?,next_terms_json=?,next_starts_at=?,next_expires_at=?").run(plan.id,JSON.stringify(plan),start,end);
 assert.equal((await route.POST(request({...body,requestId:crypto.randomUUID().replaceAll('-','')}))).status,200);
 const [nextId,nextRecord]=[...f.records][1];nextRecord.status='paid';await notify(f,nextId);
 const member=f.sql.prepare('SELECT * FROM profile_membership_view').get();assert.equal(member.plan_id,plan.id);assert.equal(JSON.parse(member.terms_json).features.analytics,true);assert.equal(member.paid_expires_at,end);assert.ok(member.next_starts_at>=end);
});


test('products can be paid before profile creation; only the owner publication attaches the paid order', async (t) => {
 const f = fixture(t), checkout = await api('app/api/paysuite/checkout/route.ts'), manager = await api('app/api/paysuite/manager/route.ts');
 f.sql.exec("DELETE FROM profiles WHERE owner_id='buyer'");
 const body = product();
 assert.equal((await checkout.POST(request(body))).status,200);
 const config = () => JSON.parse(f.sql.prepare('SELECT configuration_json FROM paysuite_product_orders WHERE id=?').get(body.requestId).configuration_json);
 assert.equal(config().profileUsername,null);
 const [id,record] = [...f.records][0]; record.status='paid'; await notify(f,id);
 const status = () => checkout.GET(new Request('https://framyconnect.co.mz/api/paysuite/checkout?payment='+body.requestId));
 assert.equal((await (await status()).json()).profileReady,false);
 assert.equal((await (await status()).json()).profileExists,false);
 const buyer=globalThis.__paysuite.user;
 globalThis.__paysuite.user={userId:'manager',role:'manager'};
 assert.equal((await manager.POST(request({action:'fulfilled',id:body.requestId}))).status,409);
 f.sql.prepare("INSERT INTO profiles(owner_id,username,draft_json,published_json,updated_at) VALUES('other','other','{}','{}',?)").run(new Date().toISOString());
 assert.equal(config().profileUsername,null);
 f.sql.prepare("INSERT INTO profiles(owner_id,username,draft_json,published_json,updated_at) VALUES('buyer','buyer','{}',NULL,?)").run(new Date().toISOString());
 assert.equal(config().profileUsername,null);
 globalThis.__paysuite.user=buyer;
 const draftStatus=await (await status()).json();
 assert.equal(draftStatus.profileExists,true); assert.equal(draftStatus.profileReady,false);
 globalThis.__paysuite.user={userId:'manager',role:'manager'};
 f.sql.prepare("UPDATE profiles SET published_json=? WHERE owner_id='buyer'").run(JSON.stringify({username:'buyer',name:'Cliente'}));
 assert.equal(config().profileUsername,'buyer'); assert.equal(config().profileSnapshot.name,'Cliente');
 f.sql.prepare("UPDATE profiles SET published_json=? WHERE owner_id='buyer'").run(JSON.stringify({username:'buyer',name:'Actualizado'}));
 assert.equal(config().profileSnapshot.name,'Cliente'); // preserve production snapshot
 assert.equal((await manager.POST(request({action:'fulfilled',id:body.requestId}))).status,200);
 globalThis.__paysuite.user=buyer;
 assert.equal((await (await status()).json()).profileReady,true);
});

test('profile published while payment is pending is attached only after verified payment', async (t) => {
 const f=fixture(t), checkout=await api('app/api/paysuite/checkout/route.ts');
 f.sql.exec("DELETE FROM profiles WHERE owner_id='buyer'");
 const body=product({format:'keychain',expectedAmount:70000});
 assert.equal((await checkout.POST(request(body))).status,200);
 f.sql.prepare("INSERT INTO profiles(owner_id,username,draft_json,published_json,updated_at) VALUES('buyer','buyer','{}','{}',?)").run(new Date().toISOString());
 const config=()=>JSON.parse(f.sql.prepare('SELECT configuration_json FROM paysuite_product_orders').get().configuration_json);
 assert.equal(config().profileUsername,null);
 const [id,record]=[...f.records][0];record.status='paid';await notify(f,id);
 assert.equal(config().profileUsername,'buyer');
 assert.equal(config().format,'keychain');
});


test('verified payments queue a detailed immutable email receipt, send once and retry safely', async (t) => {
 const f=fixture(t), checkout=await api('app/api/paysuite/checkout/route.ts');
 const {paymentReceipts}=await api('lib/payment-receipts.ts');
 const body=product(); await checkout.POST(request(body));
 assert.equal(f.sql.prepare('SELECT count(*) n FROM payment_email_receipts').get().n,0);
 const [id,record]=[...f.records][0];record.status='paid';await notify(f,id);await notify(f,id);
 assert.equal(f.sql.prepare('SELECT count(*) n FROM payment_email_receipts').get().n,1);
 const now=Date.now(), requests=[];let succeed=false;
 globalThis.fetch=async(url,options)=>{assert.equal(url,'https://api.resend.com/emails');requests.push(options);if(!succeed)throw Error('ambiguous timeout');return Response.json({id:'test-message'});};
 f.env.RESEND_API_KEY='test-only';f.env.PROFILE_EMAIL_FROM='Framy Connect <info@example.test>';
 await paymentReceipts(f.env,body.requestId,now);
 assert.equal(f.sql.prepare('SELECT status FROM payment_email_receipts').get().status,'pending');
 f.sql.exec("UPDATE auth_accounts SET name='Changed',email='changed@example.test' WHERE id='buyer'");
 succeed=true;await Promise.all([paymentReceipts(f.env,body.requestId,now+16*60000),paymentReceipts(f.env,body.requestId,now+16*60000)]);
 assert.equal(requests.length,2);assert.equal(requests[0].body,requests[1].body);assert.equal(requests[0].headers['Idempotency-Key'],requests[1].headers['Idempotency-Key']);
 const mail=JSON.parse(requests[1].body);assert.deepEqual(mail.to,['buyer@example.test']);assert.match(mail.text,/Produtos: 1350,00 MT/);assert.match(mail.text,/Entrega: 200,00 MT/);assert.match(mail.text,/Total pago: 1550,00 MT/);assert.match(mail.text,/não substitui a factura fiscal/);assert.match(mail.text,/perfil\?pagamento=/);
 assert.equal(f.sql.prepare('SELECT status FROM payment_email_receipts').get().status,'sent');
 await paymentReceipts(f.env,body.requestId,now+20*60000);assert.equal(requests.length,2);
});

test('receipt retries stop before provider deduplication expires without changing the payment', async(t)=>{
 const f=fixture(t),checkout=await api('app/api/paysuite/checkout/route.ts');const body=product();await checkout.POST(request(body));const[id,record]=[...f.records][0];record.status='paid';await notify(f,id);
 const now=Date.now();f.sql.prepare('UPDATE payment_email_receipts SET first_attempt_at=?,attempted_at=?').run(now-24*3600000,now-24*3600000);
 f.env.RESEND_API_KEY='test-only';f.env.PROFILE_EMAIL_FROM='info@example.test';globalThis.fetch=()=>{throw Error('must not resend');};
 await (await api('lib/payment-receipts.ts')).paymentReceipts(f.env,undefined,now);
 assert.equal(f.sql.prepare('SELECT status FROM payment_email_receipts').get().status,'review');assert.equal(f.sql.prepare('SELECT status FROM paysuite_payments').get().status,'paid');
});

test('approved base prices and kit discount flow through configuration plus delivery and design',async()=>{
 const {products}=await api('lib/catalog.ts');const {configurationQuote}=await api('lib/checkout-pricing.ts');
 const catalogue=products.map(p=>({...p,available:true,published:true}));const {fulfilmentDefaults}=await api('lib/fulfilment.ts');const settings={customer_design:15000,team_design:40000,maputo_delivery:20000,fulfilment_json:JSON.stringify(fulfilmentDefaults)};
 const quote=overrides=>configurationQuote(catalogue,settings,{format:'kit',card:'PVC',keychain:'PVC + epóxi',design:'standard',delivery:'standard',city:'maputo',...overrides});
 assert.equal(quote({format:'card'}).hardware,95000);assert.equal(quote({format:'keychain'}).hardware,50000);assert.equal(quote({}).hardware,95000+50000-10000);assert.equal(quote({}).total,155000);
 assert.equal(quote({format:'card',card:'Madeira',design:'customer'}).total,100000+15000+20000);
 assert.equal(quote({format:'card',card:'Metal',design:'team'}).total,150000+40000+20000);
 assert.equal(quote({format:'keychain',keychain:'Couro'}).total,120000+20000);
});


test('pickup is free, needs no customer address and snapshots the selected point for the receipt', async(t)=>{
 const f=fixture(t),checkout=await api('app/api/paysuite/checkout/route.ts');
 const body=product({delivery:'pickup',pickupPoint:'mahota',address:'',expectedAmount:135000});
 assert.equal((await checkout.POST(request(body))).status,200);
 const order=JSON.parse(f.sql.prepare('SELECT configuration_json FROM paysuite_product_orders').get().configuration_json);
 assert.equal(order.delivery,0);assert.equal(order.fulfilment.point.id,'mahota');assert.match(order.address,/Mahota/);assert.equal(order.fulfilment.mode,'pickup');
 const [id,record]=[...f.records][0];record.status='paid';await notify(f,id);
 const receipt=JSON.parse(f.sql.prepare('SELECT payload_json FROM payment_email_receipts').get().payload_json);
 const {receiptMessage}=await api('lib/payment-receipts.ts');assert.match(receiptMessage(receipt),/Levantamento gratuito/);assert.doesNotMatch(receiptMessage(receipt),/Entrega: 0/);
 const result=await(await checkout.GET(new Request('https://framyconnect.co.mz/api/paysuite/checkout?payment='+body.requestId))).json();assert.equal(result.fulfilment.point.id,'mahota');
});

test('delivery settings enforce manager access, stale-write protection, coverage and server-side repricing',async(t)=>{
 const f=fixture(t),route=await api('app/api/manager-delivery/route.ts'),checkout=await api('app/api/paysuite/checkout/route.ts');
 assert.equal((await route.GET()).status,403);
 assert.equal((await route.POST(request({}))).status,403);
 const buyer=globalThis.__paysuite.user;globalThis.__paysuite.user={userId:'manager',role:'manager'};
 const initial=await(await route.GET()).json();initial.settings.cities.find(c=>c.id==='maputo').standardFee=30000;
 assert.equal((await route.POST(request(initial))).status,200);assert.equal((await route.POST(request(initial))).status,409);
 globalThis.__paysuite.user=buyer;
 assert.equal((await checkout.POST(request(product()))).status,422);
 assert.equal((await checkout.POST(request(product({delivery:'express',pricingVersion:1})))).status,422);
 assert.equal((await checkout.POST(request(product({delivery:'pickup',city:'beira',pickupPoint:'mahota',pricingVersion:1,expectedAmount:135000})))).status,422);
 const body=product({pricingVersion:1,expectedAmount:165000});assert.equal((await checkout.POST(request(body))).status,200);
 const before=f.sql.prepare('SELECT configuration_json FROM paysuite_product_orders').get().configuration_json;
 globalThis.__paysuite.user={userId:'manager',role:'manager'};initial.settings.points[0].address='Novo endereço de levantamento';
 assert.equal((await route.POST(request({...initial,version:1}))).status,200);assert.equal(f.sql.prepare('SELECT configuration_json FROM paysuite_product_orders').get().configuration_json,before);
});

test('design image editing requires manager, validates safe sources and rejects stale edits',async(t)=>{
 const f=fixture(t),route=await api('app/api/manager-design-images/route.ts');
 assert.equal((await route.GET()).status,403);
 assert.equal((await route.PUT(request({}))).status,403);
 globalThis.__paysuite.user={userId:'manager',role:'manager'};
 const initial=await(await route.GET()).json();assert.equal(initial.images.length,3);
 const row=initial.images.find(r=>r.id==='customer');
 assert.equal((await route.PUT(request({...row,image:'https://other.example/pixel.png'}))).status,422);
 const updated={...row,image:'/api/product-image/12345678-1234-1234-1234-123456789abc',alt:'O seu cartão personalizado'};
 assert.equal((await route.PUT(request(updated))).status,200);
 assert.equal((await route.PUT(request(updated))).status,409);
 assert.equal(f.sql.prepare("SELECT image FROM design_images WHERE id='customer'").get().image,updated.image);
 const foreign=request({...updated,version:1});foreign.headers.set('origin','https://other.example');assert.equal((await route.PUT(foreign)).status,422);
 assert.equal((await route.PUT(request({...row,version:1}))).status,200);
});

test('leather checkout preserves choices and validates ownership of uploaded logos',async(t)=>{
 const f=fixture(t),checkout=await api('app/api/paysuite/checkout/route.ts');
 const now=new Date().toISOString();
 f.sql.prepare('INSERT INTO product_catalog(id,data_json,version,updated_by,updated_at) VALUES(?,?,1,?,?)').run('keychain-leather',JSON.stringify({amount:120000,published:true,available:true,availabilityConfigured:true,configurationPriceConfirmed:true}),'manager',now);
 f.sql.prepare('INSERT INTO stock_movements(id,product_id,quantity,reason,actor,created_at) VALUES(?,?,100,?,?,?)').run('leather-test','keychain-leather','test','manager',now);
 const leather={color:'black',logo:'symbol',page:1,scale:70,x:0,y:0};
 const base={format:'keychain',keychain:'Couro',delivery:'pickup',city:'maputo',pickupPoint:'mahota',expectedAmount:120000,leather};
 assert.equal((await checkout.POST(request(product({...base,leather:{...leather,color:'red'}})))).status,422);
 assert.equal((await checkout.POST(request(product({...base,design:'customer',expectedAmount:135000})))).status,422);
 assert.equal((await checkout.POST(request(product({...base,design:'team',expectedAmount:160000,designInstructions:''})))).status,422);
 const assetId='abcd1234-1234-1234-1234-123456789abc';
 globalThis.__paysuite.env.PROFILE_PHOTOS={head:async()=>({customMetadata:{ownerId:'other'},httpMetadata:{contentType:'image/png'}})};
 const custom={...base,design:'customer',expectedAmount:135000,leather:{...leather,assetId,fileName:'logo.png',x:10,scale:60}};
 assert.equal((await checkout.POST(request(product(custom)))).status,422);
 globalThis.__paysuite.env.PROFILE_PHOTOS={head:async()=>({customMetadata:{ownerId:'buyer'},httpMetadata:{contentType:'image/png'}})};
 const body=product(custom);assert.equal((await checkout.POST(request(body))).status,200);
 const saved=JSON.parse(f.sql.prepare('SELECT configuration_json FROM paysuite_product_orders WHERE id=?').get(body.requestId).configuration_json);
 assert.equal(saved.leather.assetId,assetId);assert.equal(saved.leather.color,'black');assert.equal(saved.leather.scale,60);assert.equal(saved.leather.x,10);assert.match(saved.leatherDimensions,/25 mm/);
});

test('PVC model selection is validated and snapshotted for fulfilment', async t => {
 const f=fixture(t), checkout=await api('app/api/paysuite/checkout/route.ts');
 assert.equal((await checkout.POST(request(product({pvcModel:'unlisted'})))).status,422);
 for (const id of ['tiktok','pattern','instagram']) {
   const body=product({pvcModel:id});
   assert.equal((await checkout.POST(request(body))).status,200);
   const saved=JSON.parse(f.sql.prepare('SELECT configuration_json FROM paysuite_product_orders WHERE id=?').get(body.requestId).configuration_json);
   assert.equal(saved.pvcModel.id,id);
   assert.ok(saved.pvcModel.name);
 }
});

for (const [format, amount, fields] of [
  ['card', 110000, ['cardArtwork']],
  ['keychain', 65000, ['pvcArtwork']],
  ['kit', 150000, ['cardArtwork', 'pvcArtwork']],
]) test(`custom ${format} artwork requires owned uploads and retains production transforms`, async t => {
  const f = fixture(t), checkout = await api('app/api/paysuite/checkout/route.ts');
  const artwork = { color:'brown', logo:'full', page:2, scale:60, x:10, y:-5, assetId:'abcd1234-1234-1234-1234-123456789abc', fileName:'design.pdf' };
  const input = { format, design:'customer', expectedAmount:amount, delivery:'pickup', pickupPoint:'mahota' };
  assert.equal((await checkout.POST(request(product(input)))).status,422);
  for (const field of fields) input[field] = artwork;
  f.env.PROFILE_PHOTOS = { head:async () => ({customMetadata:{ownerId:'other'},httpMetadata:{contentType:'application/pdf'}}) };
  assert.equal((await checkout.POST(request(product(input)))).status,422);
  assert.equal(f.creates(),0);
  f.env.PROFILE_PHOTOS = { head:async () => ({customMetadata:{ownerId:'buyer'},httpMetadata:{contentType:'application/pdf'}}) };
  const body = product(input);
  const result = await checkout.POST(request(body));
  assert.equal(result.status,200,JSON.stringify(await result.json()));
  const saved = JSON.parse(f.sql.prepare('SELECT configuration_json FROM paysuite_product_orders WHERE id=?').get(body.requestId).configuration_json);
  for (const field of fields) assert.deepEqual(saved[field],artwork);
});

test('checkout without a method lets the PaySuite page collect it and backfills the reported method', async (t) => {
  const f = fixture(t);
  const route = await api('app/api/paysuite/checkout/route.ts');
  const body = product();
  delete body.method;
  const created = await route.POST(request(body));
  assert.equal(created.status, 200, await created.clone().text());
  const [id, record] = [...f.records][0];
  // The provider request omits the method so the hosted checkout offers every method.
  assert.equal('method' in record, false);
  assert.equal(
    f.sql
      .prepare('SELECT method FROM paysuite_payments WHERE id=?')
      .get(body.requestId).method,
    null,
  );
  // Once the customer pays, the provider reports the chosen method.
  record.method = 'emola';
  record.status = 'paid';
  assert.equal((await notify(f, id)).status, 204);
  const row = f.sql
    .prepare('SELECT method,status FROM paysuite_payments WHERE id=?')
    .get(body.requestId);
  assert.equal(row.method, 'emola');
  assert.equal(row.status, 'paid');
});

test('checkout still rejects an unknown method', async (t) => {
  const f = fixture(t);
  const route = await api('app/api/paysuite/checkout/route.ts');
  const res = await route.POST(request(product({ method: 'bogus' })));
  assert.equal(res.ok, false);
  assert.equal(f.creates(), 0);
});


test('ambassadors enrol with unique name/four-digit codes, retain agent roles and restrict manager changes', async(t)=>{
 const f=fixture(t),route=await api('app/api/ambassadors/route.ts');
 f.sql.prepare("UPDATE auth_accounts SET name='Ana Influencer' WHERE id='other'").run();
 globalThis.__paysuite.user={userId:'other',role:'customer'};
 const joined=await route.POST(request({action:'join',code:'FORGED9999',commissionBps:1500}));assert.equal(joined.status,200);
 const {code}=await joined.json();assert.match(code,/^ANA[0-9]{4}$/);
 assert.equal((await (await route.POST(request({action:'join'}))).json()).code,code);
 assert.equal(f.sql.prepare("SELECT commission_bps FROM ambassadors WHERE account_id='other'").get().commission_bps,1000);
 f.sql.prepare("INSERT INTO auth_accounts(id,email,name,password_hash,role,created_at) VALUES('encoder','encoder@example.test','Ana Encoder','!','agent',?)").run(new Date().toISOString());
 globalThis.__paysuite.user={userId:'encoder',role:'agent'};
 assert.equal((await route.POST(request({action:'join'}))).status,200);assert.equal(f.sql.prepare("SELECT role FROM auth_accounts WHERE id='encoder'").get().role,'agent');
 assert.notEqual(f.sql.prepare("SELECT code FROM ambassadors WHERE account_id='encoder'").get().code,code);
 assert.equal((await route.POST(request({action:'settings',accountId:'other',commissionBps:1500,active:true,version:1}))).status,403);
 globalThis.__paysuite.user={userId:'manager',role:'manager'};
 const edit={action:'settings',accountId:'other',commissionBps:1500,active:true,version:1};assert.equal((await route.POST(request(edit))).status,200);assert.equal((await route.POST(request(edit))).status,409);
 assert.equal((await route.POST(request({...edit,commissionBps:1501,version:2}))).status,422);
 globalThis.__paysuite.user={userId:'other',role:'customer'};const report=await (await route.GET(new Request('https://framyconnect.co.mz/api/ambassadors'))).json();assert.equal(report.members.length,1);assert.equal(report.members[0].account_id,'other');
 globalThis.__paysuite.user=null;assert.equal((await route.GET(new Request('https://framyconnect.co.mz/api/ambassadors'))).status,401);
 assert.equal((await (await route.GET(new Request('https://framyconnect.co.mz/api/ambassadors?code='+code.toLowerCase()))).json()).valid,true);
});

test('referral discounts only hardware, commissions use original hardware, paid webhooks earn once, refunds hold payouts',async(t)=>{
 const f=fixture(t),checkout=await api('app/api/paysuite/checkout/route.ts'),ambassadors=await api('app/api/ambassadors/route.ts');
 f.sql.prepare("INSERT INTO ambassadors(account_id,code,commission_bps,created_at) VALUES('other','ANA1234',1500,?)").run(new Date().toISOString());
 const body=product({design:'team',designInstructions:'Fictional approved team design',ambassadorCode:'ana1234',expectedAmount:191500});
 const created=await checkout.POST(request(body));assert.equal(created.status,200,await created.clone().text());
 const [providerId,record]=[...f.records][0];assert.equal(record.amount,'1915.00');
 const sale=f.sql.prepare('SELECT * FROM ambassador_sales').get();assert.equal(sale.base_amount,135000);assert.equal(sale.discount_amount,13500);assert.equal(sale.commission_amount,20250);assert.equal(sale.status,'pending');
 assert.equal(f.sql.prepare('SELECT amount FROM paysuite_payments').get().amount,191500);
 assert.equal((await checkout.POST(request(body))).status,200);assert.equal(f.creates(),1);
 f.sql.prepare("UPDATE ambassadors SET commission_bps=1000,version=version+1 WHERE account_id='other'").run();
 record.status='paid';assert.equal((await notify(f,providerId)).status,204);assert.equal((await notify(f,providerId)).status,204);
 assert.equal(f.sql.prepare('SELECT COUNT(*) n FROM ambassador_sales').get().n,1);assert.equal(f.sql.prepare('SELECT status,commission_amount FROM ambassador_sales').get().status,'earned');assert.equal(f.sql.prepare('SELECT commission_amount FROM ambassador_sales').get().commission_amount,20250);
 const {receiptMessage}=await api('lib/payment-receipts.ts');const receipt=f.sql.prepare('SELECT payload_json FROM payment_email_receipts').get();assert.match(receiptMessage(JSON.parse(receipt.payload_json)),/Desconto embaixador/);
 globalThis.__paysuite.user={userId:'other',role:'customer'};let dashboard=await (await ambassadors.GET(new Request('https://framyconnect.co.mz/api/ambassadors'))).json();assert.equal(dashboard.balances[0].earned,20250);
 assert.equal((await ambassadors.POST(request({action:'payout',accountId:'other',amount:1,reference:'forged',paidAt:new Date().toISOString().slice(0,10),confirmed:true}))).status,403);
 globalThis.__paysuite.user={userId:'manager',role:'manager'};
 const payout={action:'payout',accountId:'other',amount:10000,reference:'BANK-001',paidAt:new Date().toISOString().slice(0,10),confirmed:true};assert.equal((await ambassadors.POST(request(payout))).status,200);assert.equal((await ambassadors.POST(request({...payout,reference:'bank-001'}))).status,422);assert.equal((await ambassadors.POST(request({...payout,reference:'BANK-002',amount:10251}))).status,422);
 assert.throws(()=>f.sql.prepare('DELETE FROM ambassador_payouts').run());
 assert.equal((await notify(f,providerId,'refund.success',{id:'REFUND-EXAMPLE',payment_id:providerId})).status,204);
 assert.equal(f.sql.prepare('SELECT status FROM ambassador_sales').get().status,'held');
 assert.equal((await ambassadors.POST(request({...payout,reference:'BANK-003',amount:1}))).status,422);
 assert.equal((await ambassadors.POST(request({action:'resolve-sale',orderId:sale.order_id,status:'void',reason:'Verified full product refund',confirmed:true}))).status,200);
 globalThis.__paysuite.user={userId:'buyer',role:'customer'};
 const normal=await checkout.POST(request(product({design:'team',designInstructions:'Approved design',expectedAmount:205000})));assert.equal(normal.status,200,await normal.clone().text());assert.equal([...f.records].at(-1)[1].amount,'2050.00');assert.equal(f.sql.prepare('SELECT COUNT(*) n FROM ambassador_sales').get().n,1);
});

test('invalid, inactive and own referral codes never charge or reserve stock; failed referrals never earn',async(t)=>{
 const f=fixture(t),checkout=await api('app/api/paysuite/checkout/route.ts');
 f.sql.prepare("INSERT INTO ambassadors(account_id,code,created_at) VALUES('other','ANA0001',?)").run(new Date().toISOString());
 for(const code of ['UNKNOWN9999'])assert.equal((await checkout.POST(request(product({ambassadorCode:code,expectedAmount:141500})))).status,422);
 f.sql.exec("UPDATE ambassadors SET active=0");assert.equal((await checkout.POST(request(product({ambassadorCode:'ANA0001',expectedAmount:141500})))).status,422);f.sql.exec('UPDATE ambassadors SET active=1');
 globalThis.__paysuite.user={userId:'other',role:'customer'};assert.equal((await checkout.POST(request(product({ambassadorCode:'ANA0001',expectedAmount:141500})))).status,422);
 globalThis.__paysuite.user={userId:'buyer',role:'customer'};assert.equal(f.creates(),0);assert.equal(f.sql.prepare('SELECT COUNT(*) n FROM paysuite_stock_reservations').get().n,0);
 assert.equal((await checkout.POST(request(product({ambassadorCode:'ANA0001',expectedAmount:155000})))).status,422,'stale undiscounted total rejected');
 assert.equal((await checkout.POST(request(product({ambassadorCode:'ANA0001',expectedAmount:141500})))).status,200);
 const [id,record]=[...f.records][0];record.status='failed';await notify(f,id,'payment.failed');assert.equal(f.sql.prepare('SELECT status FROM ambassador_sales').get().status,'void');
});


test('Corporate request saves without payment, sends once, and manager approval creates a bounded organization without changing billing',async t=>{
 const f=fixture(t),route=await api('app/api/corporate-request/route.ts'),accounts=await api('app/api/accounts/route.ts');
 f.env.RESEND_API_KEY='fake';f.env.PROFILE_EMAIL_FROM='Framy <info@example.invalid>';
 const emails=[];globalThis.fetch=async(url,options)=>{assert.equal(url,'https://api.resend.com/emails');emails.push(JSON.parse(options.body));return Response.json({id:'fake'});};
 const details={company:'Example Company',people:3,phone:'+258840000000',location:'Maputo',teams:'Sales, Editorial',goals:'Events',products:'Cards'};
 const billing=f.sql.prepare("SELECT * FROM sandbox_memberships WHERE owner_id='buyer'").get();
 assert.equal((await route.POST(request({...details,company:'',phone:'',location:'',action:'save',version:0}))).status,200);
 assert.equal((await route.POST(request({...details,company:'Old',action:'save',version:0}))).status,409);
 assert.equal((await route.POST(request({...details,action:'submit',version:1,confirmed:false}))).status,422);
 const submitted=await route.POST(request({...details,action:'submit',version:1,confirmed:true}));assert.equal(submitted.status,200,await submitted.clone().text());
 assert.equal(emails.length,1);assert.deepEqual(emails[0].to,['info@framyconnect.co.mz']);assert.equal(emails[0].reply_to,'buyer@example.test');assert.match(emails[0].text,/Sales, Editorial/);
 assert.equal((await route.POST(request({...details,action:'submit',version:1,confirmed:true}))).status,200);assert.equal(emails.length,1);
 assert.equal(f.sql.prepare('SELECT COUNT(*) n FROM corporate_organisations').get().n,0);
 assert.equal((await accounts.POST(request({action:'corporate-approve',id:'buyer',version:2,seats:3}))).status,403);
 globalThis.__paysuite.user={userId:'manager',role:'manager'};
 assert.equal((await accounts.POST(request({action:'corporate-approve',id:'buyer',version:2,seats:501}))).status,409);
 const approved=await accounts.POST(request({action:'corporate-approve',id:'buyer',version:2,seats:3}));assert.equal(approved.status,200,await approved.clone().text());
 assert.equal((await accounts.POST(request({action:'corporate-approve',id:'buyer',version:2,seats:3}))).status,409);
 const org=f.sql.prepare("SELECT * FROM corporate_active_organisations WHERE owner_id='buyer'").get();assert.equal(org.seats,3);
 const listed=await accounts.GET(new Request('https://framyconnect.co.mz/api/accounts'));assert.equal(listed.status,200);assert.equal((await listed.clone().json()).accounts.find(a=>a.id==='buyer').corporateDetails,undefined);
 const company=await route.GET(new Request('https://framyconnect.co.mz/api/corporate-request?owner=buyer'));assert.equal(company.status,200);assert.match((await company.json()).request.details_json,/Sales, Editorial/);assert.equal((await listed.json()).accounts.find(a=>a.id==='buyer').corporateStatus,'approved');
 assert.deepEqual(f.sql.prepare("SELECT * FROM sandbox_memberships WHERE owner_id='buyer'").get(),billing);
 assert.equal(f.sql.prepare('SELECT COUNT(*) n FROM paysuite_payments').get().n,0);
 assert.equal((await accounts.POST(request({action:'delete',id:'buyer',version:1}))).status,422);
 assert.equal((await accounts.POST(request({action:'corporate-suspend',id:'buyer',version:3}))).status,200);
 assert.equal(f.sql.prepare("SELECT * FROM corporate_active_organisations WHERE owner_id='buyer'").get(),undefined);
 globalThis.__paysuite.user={userId:'other',role:'customer'};assert.equal((await route.GET(new Request('https://framyconnect.co.mz/api/corporate-request?owner=buyer'))).status,403);assert.equal((await route.GET()).status,200);assert.equal((await (await route.GET()).json()).request,null);
 assert.deepEqual(f.sql.prepare('PRAGMA foreign_key_check').all(),[]);
});

test('Corporate authorization requires worker consent before leader provisions credentials and revokes credential rights on departure',async t=>{
 const f=await corporateFixture(t),credentials=await api('app/api/corporate-employees/route.ts');
 const invited=await f.route.POST(request({action:'invite',organisation:f.id,name:'New Worker',email:'worker@example.invalid',role:'member',team:'Field',mode:'authorization'}));assert.equal(invited.status,200,await invited.clone().text());
 const token=f.token(),worker=f.sql.prepare("SELECT * FROM auth_accounts WHERE email='worker@example.invalid'").get();
 assert.match(f.emails.at(-1).html,/Autorizar cria/);
 const action={action:'provision',organisation:f.id,accountId:worker.id,version:1,name:'New Worker',password:'Test-only-password-123'};
 assert.equal((await credentials.POST(request(action))).status,403);
 globalThis.__paysuite.user=null;
 const inspected=await f.route.POST(request({action:'inspect-invite',token}));assert.equal((await inspected.json()).mode,'authorization');
 assert.equal((await f.route.POST(request({action:'accept',token,confirmed:false}))).status,422);
 const consent=await f.route.POST(request({action:'accept',token,confirmed:true}));assert.equal(consent.status,200,await consent.clone().text());assert.equal((await consent.json()).authorized,true);
 assert.equal(f.sql.prepare('SELECT active FROM auth_accounts WHERE id=?').get(worker.id).active,0);
 assert.equal((await f.route.POST(request({action:'accept',token,confirmed:true}))).status,422);
 globalThis.__paysuite.user={userId:'other',role:'customer'};assert.equal((await credentials.POST(request(action))).status,422);
 globalThis.__paysuite.user={userId:'buyer',role:'customer'};
 const created=await credentials.POST(request(action));assert.equal(created.status,200,await created.clone().text());
 const account=f.sql.prepare('SELECT * FROM auth_accounts WHERE id=?').get(worker.id);assert.equal(account.active,1);assert.match(account.password_hash,/^\$2/);assert.equal(account.version,2);
 assert.equal((await credentials.POST(request(action))).status,403);
 const issued='a'.repeat(64);f.sql.prepare('INSERT INTO auth_sessions(token_hash,account_id,expires_at) VALUES(?,?,?)').run(issued,worker.id,Date.now()+10000);
 const security=await api('app/api/security/route.ts');globalThis.__paysuite.user={userId:worker.id,role:'customer'};
 assert.equal((await security.POST(request({action:'password',currentPassword:action.password,password:'Employee-changed-password-123'}))).status,200);
 globalThis.__paysuite.user={userId:'buyer',role:'customer'};
 assert.equal((await credentials.POST(request({...action,action:'reset',version:3,password:'Another-test-password-123'}))).status,200);
 assert.equal(f.sql.prepare('SELECT COUNT(*) n FROM auth_sessions WHERE account_id=?').get(worker.id).n,0);
 globalThis.__paysuite.user={userId:worker.id,role:'customer'};
 assert.equal((await f.route.POST(request({action:'leave',organisation:f.id}))).status,200);
 globalThis.__paysuite.user={userId:'buyer',role:'customer'};
 assert.equal((await credentials.POST(request({...action,action:'reset',version:4}))).status,403);
 assert.ok(f.sql.prepare('SELECT revoked_at FROM corporate_employee_access WHERE account_id=?').get(worker.id).revoked_at);
 assert.equal(f.sql.prepare('SELECT active FROM auth_accounts WHERE id=?').get(worker.id).active,1);
 assert.deepEqual(f.sql.prepare('PRAGMA foreign_key_check').all(),[]);
});

test('Corporate authorization cannot take over an existing account and invitation preserves its password',async t=>{
 const f=await corporateFixture(t);
 const invite={action:'invite',organisation:f.id,name:'Existing',email:'other@example.test',team:'Editorial',role:'member'};
 assert.equal((await f.route.POST(request({...invite,mode:'authorization'}))).status,422);
 assert.equal((await f.route.POST(request({...invite,mode:'invite'}))).status,200);
 const token=f.token();globalThis.__paysuite.user={userId:'buyer',role:'customer'};assert.equal((await f.route.POST(request({action:'accept',token,confirmed:true}))).status,401);
 globalThis.__paysuite.user={userId:'other',role:'customer'};assert.equal((await f.route.POST(request({action:'accept',token,confirmed:true,password:'Ignored-new-password'}))).status,200);
 assert.equal(f.sql.prepare("SELECT password_hash FROM auth_accounts WHERE id='other'").get().password_hash,'!');
 assert.equal(f.sql.prepare("SELECT * FROM corporate_employee_access WHERE account_id='other'").get(),undefined);
});

test('Corporate request remains visible to management if email acceptance is uncertain',async t=>{
 const f=fixture(t),route=await api('app/api/corporate-request/route.ts');f.env.RESEND_API_KEY='fake';f.env.PROFILE_EMAIL_FROM='Framy <info@example.invalid>';
 globalThis.fetch=async()=>{throw Error('timeout');};
 const response=await route.POST(request({action:'submit',version:0,confirmed:true,company:'Fictional',people:2,phone:'123',location:'Maputo'}));assert.equal(response.status,200);assert.equal((await response.json()).delivery,'uncertain');
 assert.equal(f.sql.prepare("SELECT status FROM corporate_requests WHERE owner_id='buyer'").get().status,'submitted');
});


test('Corporate provisioning rechecks withdrawn authorization atomically and never changes credentials on a race',async t=>{
 const f=await corporateFixture(t),credentials=await api('app/api/corporate-employees/route.ts');
 assert.equal((await f.route.POST(request({action:'invite',organisation:f.id,name:'Race Worker',email:'race@example.invalid',mode:'authorization'}))).status,200);
 const token=f.token();globalThis.__paysuite.user=null;assert.equal((await f.route.POST(request({action:'accept',token,confirmed:true}))).status,200);
 const worker=f.sql.prepare("SELECT * FROM auth_accounts WHERE email='race@example.invalid'").get();
 globalThis.__paysuite.user={userId:'buyer',role:'customer'};const batch=f.db.batch.bind(f.db);
 f.db.batch=async statements=>{f.sql.prepare('UPDATE corporate_employee_access SET revoked_at=? WHERE account_id=?').run(Date.now(),worker.id);return batch(statements);};
 const response=await credentials.POST(request({action:'provision',organisation:f.id,accountId:worker.id,version:worker.version,name:'Race Worker',password:'Test-only-password-123'}));assert.equal(response.status,409);
 assert.equal(f.sql.prepare('SELECT password_hash FROM auth_accounts WHERE id=?').get(worker.id).password_hash,'!corporate-pending');
 assert.equal(f.sql.prepare("SELECT COUNT(*) n FROM corporate_audit WHERE action='provision'").get().n,0);
});


test('email-only Corporate invitations identify company and leader and create access with the employee chosen name',async t=>{
 const f=await corporateFixture(t);
 const response=await f.route.POST(request({action:'invite',organisation:f.id,email:'only-email@example.invalid'}));assert.equal(response.status,200,await response.clone().text());
 const email=f.emails.at(-1);assert.match(email.text,/buyer, da empresa Fictional organisation/);assert.match(email.html,/Aceitar convite/);assert.match(email.html,/Fictional organisation/);
 const token=f.token();globalThis.__paysuite.user=null;
 const info=await f.route.POST(request({action:'inspect-invite',token}));const b=await info.json();assert.equal(b.inviterName,'buyer');assert.equal(b.newAccount,true);
 const accepted=await f.route.POST(request({action:'accept',token,name:'Employee chosen name',password:'Test-only-password-123',confirmed:true}));assert.equal(accepted.status,200,await accepted.clone().text());
 assert.equal(f.sql.prepare("SELECT name FROM auth_accounts WHERE email='only-email@example.invalid'").get().name,'Employee chosen name');
 assert.equal(f.sql.prepare('SELECT COUNT(*) n FROM corporate_members WHERE organisation_id=?').get(f.id).n,2);
});


test('Corporate emails escape company and leader HTML and keep a single explicit acceptance button',()=>{
 const mail=corporateInvitationEmail('<img src=x onerror=alert(1)>','Leader <script>test</script>','https://example.invalid/corporativo/aceitar#'+'a'.repeat(64),false);
 assert.doesNotMatch(mail.html,/<img|<script/);assert.match(mail.html,/&lt;img/);assert.match(mail.html,/Leader &lt;script/);assert.equal((mail.html.match(/<a /g)||[]).length,1);assert.match(mail.html,/Aceitar convite/);
 const authorization=corporateInvitationEmail('Company','Leader','https://example.invalid/corporativo/aceitar#'+'a'.repeat(64),true);assert.match(authorization.text,/possa redefinir/);assert.match(authorization.html,/Autorizar cria/);
});


test('account totals count all permitted accounts beyond the 500 row limit and retain global totals during search',async t=>{
 const f=fixture(t),accounts=await api('app/api/accounts/route.ts');globalThis.__paysuite.user={userId:'manager',role:'manager'};
 const insert=f.sql.prepare("INSERT INTO auth_accounts(id,name,email,password_hash,role,created_at) VALUES(?,?,?,'unused',?,'2026-10-19')");
 insert.run('hidden-director','Hidden Director','director@example.invalid','director');
 for(let i=0;i<501;i++)insert.run('count-'+i,'Count '+i,'count'+i+'@example.invalid','customer');
 const response=await accounts.GET(new Request('https://framyconnect.co.mz/api/accounts'));assert.equal(response.status,200);const b=await response.json();
 assert.equal(b.accounts.length,500);assert.equal(b.totals.total,504);assert.equal(b.totals.published,1);assert.equal(b.totals.unpublished,503);assert.equal(b.totals.matching,504);
 const searched=await (await accounts.GET(new Request('https://framyconnect.co.mz/api/accounts?q=other@example.test'))).json();assert.equal(searched.accounts.length,1);assert.equal(searched.totals.matching,1);assert.equal(searched.totals.total,504);
 const hidden=await (await accounts.GET(new Request('https://framyconnect.co.mz/api/accounts?q=Hidden'))).json();assert.equal(hidden.accounts.length,0);assert.equal(hidden.totals.matching,0);
 globalThis.__paysuite.user={userId:'hidden-director',role:'director'};const director=await (await accounts.GET()).json();assert.equal(director.totals.total,505);
});

test('first publication queues atomically and alerts the fixed manager once despite edits or republishing',async t=>{
 const f=fixture(t),{profilePublicationAlerts}=await api('lib/profile-publication-alerts.ts');
 f.sql.exec("UPDATE profile_publication_alerts SET status='baseline'");
 f.sql.prepare("INSERT INTO profiles(owner_id,username,draft_json,updated_at) VALUES('other','new_worker','{}','2026-10-19')").run();
 f.sql.exec("BEGIN; UPDATE profiles SET published_json='{}' WHERE owner_id='other'");assert.equal(f.sql.prepare("SELECT COUNT(*) n FROM profile_publication_alerts WHERE owner_id='other'").get().n,1);f.sql.exec('ROLLBACK');assert.equal(f.sql.prepare("SELECT COUNT(*) n FROM profile_publication_alerts WHERE owner_id='other'").get().n,0);
 f.sql.exec("UPDATE profiles SET published_json='{}' WHERE owner_id='other'");
 f.env.RESEND_API_KEY='fake';f.env.PROFILE_EMAIL_FROM='Framy <info@example.invalid>';
 const sent=[];globalThis.fetch=async(url,options)=>{assert.equal(url,'https://api.resend.com/emails');sent.push(JSON.parse(options.body));return Response.json({id:'fake-message'});};
 await Promise.all([profilePublicationAlerts(f.env),profilePublicationAlerts(f.env)]);assert.equal(sent.length,1);assert.deepEqual(sent[0].to,['firminochambale@framyconnect.co.mz']);assert.match(sent[0].text,/https:\/\/framyconnect.co.mz\/new_worker/);assert.doesNotMatch(sent[0].text,/other@example/);
 f.sql.exec("UPDATE profiles SET published_json='{}' WHERE owner_id='other'; UPDATE profiles SET published_json=NULL WHERE owner_id='other'; UPDATE profiles SET published_json='{}' WHERE owner_id='other'");
 await profilePublicationAlerts(f.env);assert.equal(sent.length,1);assert.equal(f.sql.prepare("SELECT status FROM profile_publication_alerts WHERE owner_id='other'").get().status,'sent');
});

test('publication alert failures preserve published data and use stable idempotency until retry expiry',async t=>{
 const f=fixture(t),{profilePublicationAlerts}=await api('lib/profile-publication-alerts.ts');f.env.RESEND_API_KEY='fake';f.env.PROFILE_EMAIL_FROM='Framy <info@example.invalid>';
 const keys=[];globalThis.fetch=async(url,options)=>{keys.push(options.headers['Idempotency-Key']);throw Error('ambiguous timeout');};const now=Date.now()+1000;
 await profilePublicationAlerts(f.env,now);assert.equal(keys.length,1);assert.equal(f.sql.prepare("SELECT published_json FROM profiles WHERE owner_id='buyer'").get().published_json,'{}');
 await profilePublicationAlerts(f.env,now+1000);assert.equal(keys.length,1);
 await profilePublicationAlerts(f.env,now+16*60000);assert.equal(keys.length,2);assert.equal(keys[0],keys[1]);
 await profilePublicationAlerts(f.env,now+24*3600000);assert.equal(keys.length,2);assert.equal(f.sql.prepare("SELECT status FROM profile_publication_alerts WHERE owner_id='buyer'").get().status,'review');
});


test('discounted product subtotal stays correct before delivery is selected and final total excludes design and delivery from discount',async()=>{
 const {purchaseAmounts}=await api('lib/purchase-amounts.ts');
 assert.deepEqual(purchaseAmounts(50000,5000,0,null),{subtotal:45000,total:null});
 assert.deepEqual(purchaseAmounts(50000,5000,0,0),{subtotal:45000,total:45000});
 assert.deepEqual(purchaseAmounts(50000,5000,15000,20000),{subtotal:45000,total:80000});
 assert.deepEqual(purchaseAmounts(50000,0,0,0),{subtotal:50000,total:50000});
 assert.deepEqual(purchaseAmounts(null,0,null,null),{subtotal:null,total:null});
 assert.throws(()=>purchaseAmounts(50000,50001,0,0));
});

test('ambassador picker exposes only active public names and codes and excludes the buyer own code',async t=>{
 const f=fixture(t),route=await api('app/api/ambassadors/route.ts');const now=new Date().toISOString();
 f.sql.prepare("INSERT INTO ambassadors(account_id,code,created_at) VALUES('other','OTHER1234',?)").run(now);f.sql.prepare("INSERT INTO ambassadors(account_id,code,created_at) VALUES('buyer','BUYER5678',?)").run(now);
 globalThis.__paysuite.user=null;
 const publicChoices=await route.GET(new Request('https://framyconnect.co.mz/api/ambassadors?choices=1'));assert.equal(publicChoices.status,200);const result=await publicChoices.json();assert.equal(result.items.length,2);assert.deepEqual(Object.keys(result.items[0]).sort(),['code','name']);assert.doesNotMatch(JSON.stringify(result),/email|commission|account_id|password/);
 globalThis.__paysuite.user={userId:'buyer',role:'customer'};
 const signed=await (await route.GET(new Request('https://framyconnect.co.mz/api/ambassadors?choices=1'))).json();assert.deepEqual(signed.items,[{name:'other',code:'OTHER1234'}]);
 assert.equal((await (await route.GET(new Request('https://framyconnect.co.mz/api/ambassadors?code=BUYER5678'))).json()).valid,false);
 f.sql.exec("UPDATE auth_accounts SET active=0 WHERE id='other'");assert.equal((await (await route.GET(new Request('https://framyconnect.co.mz/api/ambassadors?choices=1'))).json()).items.length,0);
});

test('500 MT keychain with selected ambassador sends exactly 450 MT to PaySuite and commissions use original 500 MT',async t=>{
 const f=fixture(t),route=await api('app/api/paysuite/checkout/route.ts');f.sql.prepare("INSERT INTO ambassadors(account_id,code,commission_bps,created_at) VALUES('other','OTHER1234',1500,?)").run(new Date().toISOString());
 const body=product({format:'keychain',delivery:'pickup',pickupPoint:'mahota',address:'',ambassadorCode:'OTHER1234',expectedAmount:45000});
 const result=await route.POST(request(body));assert.equal(result.status,200,await result.clone().text());assert.equal([...f.records.values()][0].amount,'450.00');
 const sale=f.sql.prepare('SELECT base_amount,discount_amount,commission_amount FROM ambassador_sales').get();assert.deepEqual({...sale},{base_amount:50000,discount_amount:5000,commission_amount:7500});
 assert.equal(f.sql.prepare('SELECT amount FROM paysuite_payments').get().amount,45000);
});

test('all physical materials and kits retain the same discounted quote across design and delivery choices', async()=>{
 const {products}=await api('lib/catalog.ts');
 const {configurationQuote}=await api('lib/checkout-pricing.ts');
 const {purchaseAmounts}=await api('lib/purchase-amounts.ts');
 const {fulfilmentDefaults}=await api('lib/fulfilment.ts');
 const catalogue=products.map(p=>({...p,available:true,published:true}));
 const settings={customer_design:15000,team_design:40000,maputo_delivery:20000,fulfilment_json:JSON.stringify(fulfilmentDefaults)};
 const cards=['PVC','Madeira','Metal'],keys=['PVC + epóxi','Couro'];
 for(const format of ['card','keychain','kit']) for(const card of cards) for(const keychain of keys) for(const design of ['standard','customer','team']) for(const delivery of ['pickup','standard']) {
  const quote=configurationQuote(catalogue,settings,{format,card,keychain,design,delivery,city:'maputo',pickupPoint:'mahota'});
  const discount=Math.round(quote.hardware/10);
  const amounts=purchaseAmounts(quote.hardware,discount,quote.customization,quote.delivery);
  assert.equal(amounts.total,quote.total-discount,`${format}/${card}/${keychain}/${design}/${delivery}`);
  assert.equal(purchaseAmounts(quote.hardware,0,quote.customization,quote.delivery).total,quote.total);
  assert.equal(quote.delivery,delivery==='pickup'?0:20000);
 }
 assert.throws(()=>purchaseAmounts(Number.MAX_SAFE_INTEGER,0,1,0));
});

async function corporateReportFixture(t) {
 const f=await corporateFixture(t,3),now=Date.now();
 f.sql.exec("UPDATE sandbox_memberships SET terms_json=json_set(terms_json,'$.features.analytics',json('true')) WHERE owner_id='buyer'");
 f.sql.prepare("UPDATE corporate_members SET team='Alpha' WHERE organisation_id=? AND account_id='buyer'").run(f.id);
 for(const id of ['other','manager'])f.sql.prepare("INSERT INTO corporate_members(organisation_id,account_id,role,team,accepted_at) VALUES(?,?,'member','Beta',?)").run(f.id,id,now);
 f.sql.prepare("INSERT INTO corporate_campaigns(id,organisation_id,name,created_at) VALUES('report-campaign',?,'Report campaign',?)").run(f.id,now);
 const day=Math.floor((now+7200000)/86400000)*86400000-7200000;
 for(const [id,opens,clicks,contacts] of [['buyer',10,4,2],['other',20,3,3],['manager',5,0,1]]){
  f.sql.prepare("INSERT INTO corporate_assignments(id,campaign_id,account_id,created_at) VALUES(?,'report-campaign',?,?)").run('report-'+id,id,now);
  f.sql.prepare("INSERT INTO corporate_metrics(assignment_id,day,target,count) VALUES(?,?,'profile_open',?)").run('report-'+id,day,opens);
  f.sql.prepare("INSERT INTO corporate_metrics(assignment_id,day,target,count) VALUES(?,?,'whatsapp',?)").run('report-'+id,day,clicks);
  for(let i=0;i<contacts;i++)f.sql.prepare("INSERT INTO corporate_leads(id,assignment_id,name,email,consent_version,created_at) VALUES(?,?,'Private contact','private@example.invalid','test',?)").run('report-lead-'+id+i,'report-'+id,now-i);
 }
 const route=await api('app/api/corporate-reports/route.ts');
 const get=(params={})=>route.GET(new Request('https://framyconnect.co.mz/api/corporate-reports?'+new URLSearchParams({organisation:f.id,days:'7',campaign:'report-campaign',...params})));
 return {...f,report:route,get,now,day};
}
test('corporate reports aggregate teams and complete daily series without multiplying opens or revealing contacts',async t=>{
 const f=await corporateReportFixture(t);
 const r=await f.get();assert.equal(r.status,200,await r.clone().text());const b=await r.json();
 assert.equal(b.analytics,true);assert.deepEqual(b.totals,{opens:35,clicks:7,contacts:6});assert.equal(b.daily.length,7);
 assert.equal((await(await f.get({unit:'participant'})).json()).teams[0].team,'Alpha','normalised ranking is recomputed by the server');
 assert.equal((await(await f.get({metric:'clicks'})).json()).teams[0].team,'Alpha');
 assert.deepEqual(b.teams.map(row=>[row.team,row.contacts,row.contributors]),[['Beta',4,2],['Alpha',2,1]]);assert.equal(b.daily.at(-1).opens,35);
 assert.doesNotMatch(JSON.stringify(b),/private@example|Private contact|password|credential|phone/);
 assert.deepEqual((await(await f.get({team:'Alpha'})).json()).totals,{opens:10,clicks:4,contacts:2});
 assert.deepEqual((await(await f.get({team:''})).json()).totals,{opens:0,clicks:0,contacts:0},'explicit blank team filters ungrouped members');
 assert.deepEqual((await(await f.get({campaign:'not-owned'})).json()).totals,{opens:0,clicks:0,contacts:0});
 assert.equal((await f.get({days:'365'})).status,422);assert.equal((await f.get({metric:'bad-field'})).status,422);
});
test('corporate report access scopes members to themselves, rejects outsiders and suspended members and respects analytics entitlement',async t=>{
 const f=await corporateReportFixture(t);
 globalThis.__paysuite.user={userId:'other',role:'customer'};
 const own=await(await f.get()).json();assert.deepEqual(own.totals,{opens:20,clicks:3,contacts:3});assert.deepEqual(own.teamOptions,[{team:'Beta'}]);assert.equal(own.role,'member');
 f.sql.prepare("UPDATE corporate_members SET active=0 WHERE organisation_id=? AND account_id='other'").run(f.id);assert.equal((await f.get()).status,403);
 globalThis.__paysuite.user=null;assert.equal((await f.get()).status,401);
 globalThis.__paysuite.user={userId:'buyer',role:'customer'};assert.equal((await f.get({organisation:'another-company'})).status,403);
 f.sql.exec("UPDATE sandbox_memberships SET terms_json=json_set(terms_json,'$.features.analytics',json('false')) WHERE owner_id='buyer'");
 const limited=await(await f.get()).json();assert.equal(limited.analytics,false);assert.deepEqual(limited.totals,{opens:0,clicks:0,contacts:6});
});
test('corporate report totals include more than the contact-table limit and exclude records outside the requested period',async t=>{
 const f=await corporateReportFixture(t);
 const insert=f.sql.prepare("INSERT INTO corporate_leads(id,assignment_id,name,consent_version,created_at) VALUES(?,'report-buyer','Hidden contact','test',?)");
 for(let i=0;i<550;i++)insert.run('extra-report-'+i,f.now-i);
 insert.run('old-report',f.day-7*86400000);insert.run('future-report',f.now+86400000);
 f.sql.prepare("INSERT INTO corporate_metrics(assignment_id,day,target,count) VALUES('report-buyer',?,'profile_open',10000)").run(f.day-7*86400000);
 const b=await(await f.get()).json();assert.equal(b.totals.contacts,556);assert.equal(b.totals.opens,35);assert.equal(b.daily.reduce((sum,row)=>sum+row.contacts,0),556);
});

async function guestFixture(t){
 const f=fixture(t);globalThis.__paysuite.user=null;
 const sessionApi=await api('app/api/guest-checkout/route.ts');
 const response=await sessionApi.POST(request({}));assert.equal(response.status,200,await response.clone().text());
 const cookie=response.headers.get('set-cookie').split(';')[0];
 const req=(body)=>{const r=request(body);r.headers.set('cookie',cookie);return r;};
 const checkout=await api('app/api/paysuite/checkout/route.ts');
 const tracking=await api('app/api/order-tracking/route.ts');
 const body=product({buyerName:'Fictional Guest',buyerEmail:'buyer@example.test'});
 return {...f,cookie,req,checkout,tracking,body};
}
test('guest physical checkout reserves stock without an account, retries once and isolates private details',async t=>{
 const f=await guestFixture(t);const accounts=f.sql.prepare('SELECT COUNT(*) n FROM auth_accounts').get().n;
 let r=await f.checkout.POST(f.req(f.body));assert.equal(r.status,200,await r.clone().text());const created=await r.json();
 assert.equal(f.sql.prepare('SELECT COUNT(*) n FROM auth_accounts').get().n,accounts);
 assert.equal(f.sql.prepare('SELECT owner_id FROM paysuite_payments WHERE id=?').get(created.paymentId).owner_id,null);
 assert.equal(f.sql.prepare('SELECT COUNT(*) n FROM paysuite_stock_reservations').get().n,2);
 assert.equal((await f.checkout.POST(f.req(f.body))).status,200);assert.equal(f.creates(),1);
 assert.equal((await f.checkout.POST(f.req({...f.body,kind:'subscription',requestId:crypto.randomUUID().replaceAll('-','')}))).status,401);
 const get=new Request('https://framyconnect.co.mz/api/paysuite/checkout?payment='+created.paymentId);assert.equal((await f.checkout.GET(get)).status,401);get.headers.set('cookie',f.cookie);assert.equal((await f.checkout.GET(get)).status,200);
 const publicResult=await (await f.tracking.POST(request({reference:created.paymentId}))).json();assert.equal(publicResult.privateAccess,false);assert.equal(publicResult.paymentStatus,'pending');for(const key of ['address','buyerEmail','contact','url','amount'])assert.ok(!(key in publicResult),key);
 const privateResult=await (await f.tracking.POST(f.req({reference:created.paymentId}))).json();assert.equal(privateResult.privateAccess,true);assert.equal(privateResult.amount,155000);assert.equal(privateResult.buyerEmail,'buyer@example.test');
 assert.equal((await f.tracking.POST(request({reference:'0'.repeat(32)}))).status,404);
 assert.equal(f.sql.prepare('SELECT status FROM paysuite_payments').get().status,'pending','browser status cannot settle');
 assert.deepEqual(f.sql.prepare('PRAGMA foreign_key_check').all(),[]);
});
test('guest discounts retain original hardware commission and reject self referral by purchase email',async t=>{
 const f=await guestFixture(t);f.sql.prepare("INSERT INTO ambassadors(account_id,code,commission_bps,created_at) VALUES('other','ANA0001',1500,?)").run(new Date().toISOString());
 const bad=await f.checkout.POST(f.req({...f.body,buyerEmail:'other@example.test',ambassadorCode:'ANA0001',expectedAmount:141500}));assert.equal(bad.status,422);
 const result=await f.checkout.POST(f.req({...f.body,ambassadorCode:'ANA0001',expectedAmount:141500}));assert.equal(result.status,200,await result.clone().text());
 assert.equal(f.sql.prepare('SELECT amount FROM paysuite_payments').get().amount,141500);assert.equal(f.sql.prepare('SELECT commission_amount FROM ambassador_sales').get().commission_amount,20250);
});
test('guest settlement queues the buyer receipt; manager and assigned agent advance audited progress once',async t=>{
 const f=await guestFixture(t);const c=await (await f.checkout.POST(f.req(f.body))).json();const progress=await api('app/api/order-progress/route.ts');
 globalThis.__paysuite.user={userId:'manager',role:'manager'};assert.equal((await progress.POST(request({id:c.paymentId,action:'advance',version:0}))).status,403);
 const gateway=await api('lib/server-paysuite.ts');const row=f.sql.prepare('SELECT * FROM paysuite_payments').get();await gateway.settlePayment(f.db,row,row.provider_id);
 const receipt=JSON.parse(f.sql.prepare('SELECT payload_json FROM payment_email_receipts').get().payload_json);assert.equal(receipt.email,'buyer@example.test');assert.equal(receipt.name,'Fictional Guest');
 f.sql.prepare("UPDATE auth_accounts SET role='agent' WHERE id='other'").run();
 assert.equal((await progress.POST(request({id:c.paymentId,action:'assign',agentId:'other',version:0}))).status,200);
 globalThis.__paysuite.user={userId:'buyer',role:'agent'};assert.equal((await progress.POST(request({id:c.paymentId,action:'advance',version:1}))).status,403);assert.equal((await (await progress.GET()).json()).orders.length,0);
 globalThis.__paysuite.user={userId:'other',role:'agent'};
 assert.equal((await progress.POST(request({id:c.paymentId,action:'advance',version:1}))).status,200);
 assert.equal((await progress.POST(request({id:c.paymentId,action:'advance',version:1}))).status,409);
 assert.equal((await progress.POST(request({id:c.paymentId,action:'advance',version:2}))).status,200);
 assert.equal((await progress.POST(request({id:c.paymentId,action:'advance',version:3}))).status,200);
 assert.equal(f.sql.prepare('SELECT status FROM paysuite_product_orders').get().status,'fulfilled');
 assert.equal(f.sql.prepare('SELECT COUNT(*) n FROM order_progress_events').get().n,4);
 assert.ok(f.sql.prepare('SELECT fulfilled_at FROM paysuite_product_orders').get().fulfilled_at);
 globalThis.__paysuite.user=null;const view=await(await f.tracking.POST(request({reference:c.paymentId}))).json();assert.equal(view.stage,'delivered');assert.equal(view.privateAccess,false);
});
test('guest access links require the purchase email and expire; linking an account preserves payment and ownership',async t=>{
 const f=await guestFixture(t);const c=await(await f.checkout.POST(f.req(f.body))).json();
 const gateway=await api('lib/server-paysuite.ts');const row=f.sql.prepare('SELECT * FROM paysuite_payments').get();await gateway.settlePayment(f.db,row,row.provider_id);
 f.env.RESEND_API_KEY='fake-key';f.env.PROFILE_EMAIL_FROM='Framy <info@example.invalid>';const original=globalThis.fetch;let mail;
 globalThis.fetch=async(url,opts)=>{if(String(url)==='https://api.resend.com/emails'){mail=JSON.parse(opts.body);return Response.json({id:'fake'});}return original(url,opts);};
 assert.equal((await f.tracking.POST(request({reference:c.paymentId,action:'access',email:'attacker@example.invalid'}))).status,200);assert.deepEqual(mail.to,['buyer@example.test']);const token=mail.text.match(/#([a-f0-9]{64})/)[1];
 assert.equal((await(await f.tracking.POST(request({reference:c.paymentId,token}))).json()).privateAccess,true);
 globalThis.__paysuite.user={userId:'other',role:'customer',email:'other@example.test'};assert.equal((await f.tracking.POST(request({reference:c.paymentId,token,action:'claim'}))).status,403);
 globalThis.__paysuite.user={userId:'buyer',role:'customer',email:'buyer@example.test'};assert.equal((await f.tracking.POST(request({reference:c.paymentId,token,action:'claim'}))).status,200);
 assert.equal(f.sql.prepare('SELECT owner_id FROM paysuite_payments').get().owner_id,'buyer');assert.equal(f.sql.prepare('SELECT owner_id FROM paysuite_product_orders').get().owner_id,'buyer');
 globalThis.__paysuite.user=null;assert.equal((await(await f.tracking.POST(request({reference:c.paymentId,token}))).json()).privateAccess,false);assert.deepEqual(f.sql.prepare('PRAGMA foreign_key_check').all(),[]);
});

test('guest ambiguous provider failure is retried with the same reference without a second create',async t=>{
 const f=await guestFixture(t);let attempts=0;globalThis.fetch=async()=>{attempts++;throw Error('connection timeout');};
 const first=await f.checkout.POST(f.req(f.body));assert.equal(first.status,202);const id=(await first.json()).paymentId;
 const second=await f.checkout.POST(f.req(f.body));assert.equal(second.status,200);assert.equal((await second.json()).paymentId,id);assert.equal(attempts,1);assert.equal(f.sql.prepare('SELECT COUNT(*) n FROM paysuite_payments').get().n,1);
});
test('guest upload quota does not create an auth account and expired email proof reveals no private details',async t=>{
 const f=await guestFixture(t);const quota=await api('lib/server-upload-quota.ts');const session=f.sql.prepare('SELECT id FROM guest_checkout_sessions').get().id;
 assert.equal(await quota.reserveUpload('asset-a','guest:'+session,'designs',8*1024*1024),true);assert.equal(await quota.reserveUpload('asset-b','guest:'+session,'designs',8*1024*1024),true);assert.equal(await quota.reserveUpload('asset-c','guest:'+session,'designs',8*1024*1024),false);await quota.releaseUpload('asset-a','guest:'+session);assert.equal(await quota.reserveUpload('asset-c','guest:'+session,'designs',8*1024*1024),true);
 const c=await(await f.checkout.POST(f.req(f.body))).json();const {guestHash}=await api('lib/guest-checkout.ts');const token='a'.repeat(64);f.sql.prepare('INSERT INTO guest_order_access VALUES(?,?,?)').run(await guestHash(token),c.paymentId,Date.now()-1);
 const result=await(await f.tracking.POST(request({reference:c.paymentId,token}))).json();assert.equal(result.privateAccess,false);assert.ok(!('buyerEmail' in result));
});
test('guest reference email outbox retries safely without treating the order as paid',async t=>{
 const f=await guestFixture(t);const c=await(await f.checkout.POST(f.req(f.body))).json();f.env.RESEND_API_KEY='fake';f.env.PROFILE_EMAIL_FROM='Framy <info@example.invalid>';let sent=0;globalThis.fetch=async(_url,options)=>{sent++;const email=JSON.parse(options.body);assert.match(email.text,new RegExp(c.orderReference));assert.doesNotMatch(email.text,new RegExp(c.paymentId));assert.match(email.text,/não confirma o pagamento/);return Response.json({id:'fake-mail'});};const outbox=await api('lib/guest-order-email.ts');await outbox.guestOrderEmails();await outbox.guestOrderEmails();assert.equal(sent,1);assert.equal(f.sql.prepare('SELECT status FROM guest_order_emails').get().status,'sent');assert.equal(f.sql.prepare('SELECT status FROM paysuite_payments').get().status,'pending');
});

test('guest migration preserves populated ledgers, children and receipt triggers inside a D1-style transaction',()=>{
 const sql=new DatabaseSync(':memory:');try{
 sql.exec('PRAGMA foreign_keys=ON');for(const file of readdirSync('drizzle').filter(f=>f.endsWith('.sql')&&f<'0034').sort())sql.exec(readFileSync('drizzle/'+file,'utf8'));
 const now=new Date().toISOString();for(const id of ['old-buyer','old-ambassador'])sql.prepare("INSERT INTO auth_accounts(id,email,name,password_hash,role,created_at) VALUES(?,?,?,'!','customer',?)").run(id,id+'@example.invalid',id,now);
 sql.prepare("INSERT INTO ambassadors(account_id,code,commission_bps,created_at) VALUES('old-ambassador','OLD0001',1000,?)").run(now);
 sql.prepare("INSERT INTO paysuite_product_orders(id,owner_id,configuration_json,amount,status,created_at) VALUES('old-order','old-buyer','{}',1000,'pending',?)").run(now);
 sql.prepare("INSERT INTO paysuite_payments(id,owner_id,kind,target_id,amount,cycle,status,created_at,updated_at) VALUES('old-order','old-buyer','product','old-order',1000,'once','pending',?,?)").run(now,now);
 sql.prepare("INSERT INTO paysuite_events VALUES('old-event','old-order','pending',?)").run(now);
 sql.prepare("INSERT INTO ambassador_sales(order_id,ambassador_id,code,base_amount,discount_amount,commission_bps,commission_amount,created_at) VALUES('old-order','old-ambassador','OLD0001',1000,100,1000,100,?)").run(now);
 const tables=['paysuite_payments','paysuite_product_orders','paysuite_events','ambassador_sales'];const before=tables.map(table=>sql.prepare('SELECT * FROM '+table).all());
 sql.exec('BEGIN');sql.exec(readFileSync('drizzle/0034_guest_product_checkout.sql','utf8'));assert.deepEqual(sql.prepare('PRAGMA foreign_key_check').all(),[]);sql.exec('COMMIT');
 for(let i=0;i<tables.length;i++)assert.deepEqual(sql.prepare('SELECT * FROM '+tables[i]).all(),before[i],tables[i]);
 assert.equal(sql.prepare('PRAGMA foreign_keys').get().foreign_keys,1);
 assert.throws(()=>sql.prepare("INSERT INTO paysuite_events VALUES('bad','missing','pending',?)").run(now));
 sql.prepare("UPDATE paysuite_payments SET status='paid' WHERE id='old-order'").run();assert.equal(sql.prepare('SELECT status FROM ambassador_sales').get().status,'earned');assert.equal(sql.prepare('SELECT COUNT(*) n FROM payment_email_receipts').get().n,1);
 }finally{sql.close();}
});

test('guest card, keychain and kit orders share validated physical checkout and stock rules',async t=>{
 const f=await guestFixture(t);
 for(const [format,expectedAmount] of [['card',115000],['keychain',70000],['kit',155000]]){
 const r=await f.checkout.POST(f.req({...f.body,format,expectedAmount,requestId:crypto.randomUUID().replaceAll('-','')}));assert.equal(r.status,200,format+': '+await r.clone().text());
 }
 assert.equal(f.creates(),3);assert.equal(f.sql.prepare('SELECT COUNT(*) n FROM paysuite_stock_reservations').get().n,4);
 assert.equal((await f.checkout.POST(f.req({...f.body,requestId:crypto.randomUUID().replaceAll('-','')}))).status,409);
});

test('payment receipts route physical orders to guest tracking and keep subscriptions in authenticated payment status',async()=>{
 const {receiptMessage}=await api('lib/payment-receipts.ts');const common={email:'buyer@example.invalid',name:'Demo Buyer',amount:50000,cycle:'monthly',method:'mpesa',reference:'a'.repeat(32),providerReference:'fake-provider',paidAt:new Date().toISOString()};
 const physical=receiptMessage({...common,kind:'product',configuration:{format:'card',card:'PVC',design:'standard',hardware:50000,customization:0,delivery:0}});assert.match(physical,/\/acompanhar\?referencia=/);
 const subscription=receiptMessage({...common,kind:'subscription'});assert.match(subscription,/\/checkout\/retorno\?payment=/);assert.doesNotMatch(subscription,/\/acompanhar\?/);
});


test('public references resolve guest tracking and manager search without granting private access',async t=>{
 const f=await guestFixture(t); const response=await f.checkout.POST(f.req(f.body));
 assert.equal(response.status,200,await response.clone().text());const c=await response.json();
 assert.match(c.orderReference,/^FC-OR-26-\d{4}-\d{4}$/);assert.match(c.paymentReference,/^FC-PY-26-\d{4}-\d{4}$/);
 const duplicate=await(await f.checkout.POST(f.req(f.body))).json();assert.equal(duplicate.orderReference,c.orderReference);assert.equal(f.creates(),1);
 const tracking=await api('app/api/order-tracking/route.ts');
 globalThis.__paysuite.user=null;globalThis.__paysuite.cookie='';
 for(const reference of [c.orderReference,c.paymentReference,c.paymentId,c.orderReference.toLowerCase().replaceAll('-',' ')]) {
  const r=await tracking.POST(request({reference}));assert.equal(r.status,200,await r.clone().text());
  const d=await r.json();assert.equal(d.reference,c.orderReference);assert.equal(d.id,c.paymentId);assert.equal(d.privateAccess,false);assert.equal(d.buyerEmail,undefined);assert.equal(d.url,undefined);
 }
 const wrong=c.orderReference.slice(0,-1)+(Number(c.orderReference.at(-1))+1)%10;
 assert.equal((await tracking.POST(request({reference:wrong}))).status,404);
 const manager=await api('app/api/paysuite/manager/route.ts');
 assert.equal((await manager.GET(new Request('https://framy.example/api/paysuite/manager?reference='+c.orderReference))).status,403);
 globalThis.__paysuite.user={userId:'buyer',role:'manager'};
 const r=await manager.GET(new Request('https://framy.example/api/paysuite/manager?reference='+c.orderReference));assert.equal(r.status,200,await r.clone().text());assert.equal((await r.json()).payments[0].id,c.paymentId);
});


test('team design references require owned uploads and persist separately from production artwork',async t=>{
 const f=fixture(t),checkout=await api('app/api/paysuite/checkout/route.ts');
 const assetId='a'.repeat(36); const body=product({design:'team',designInstructions:'Warm colours and simple lettering',expectedAmount:155000+f.sql.prepare('SELECT team_design FROM checkout_pricing WHERE id=1').get().team_design,designReferences:{assets:[{assetId,fileName:'inspiration.png'}],url:'https://example.invalid/reference'}});
 f.env.PROFILE_PHOTOS={head:async()=>({customMetadata:{ownerId:'other'},httpMetadata:{contentType:'image/png'}})};
 const rejected=await checkout.POST(request(body));assert.equal(rejected.status,422);assert.match((await rejected.json()).error,/não está disponível/);assert.equal(f.creates(),0);
 f.env.PROFILE_PHOTOS={head:async()=>({customMetadata:{ownerId:'buyer'},httpMetadata:{contentType:'image/png'}})};
 const result=await checkout.POST(request(body));assert.equal(result.status,200,await result.clone().text());
 const config=JSON.parse(f.sql.prepare('SELECT configuration_json FROM paysuite_product_orders WHERE id=?').get(body.requestId).configuration_json);
 assert.deepEqual(config.designReferences,body.designReferences);assert.equal(config.cardArtwork,undefined);assert.equal(config.pvcArtwork,undefined);
});
