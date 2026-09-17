import assert from 'node:assert/strict';
const origin='http://localhost:3017';
async function call(path,{body,cookie,bytes}={}){
  const r=await fetch(origin+path,{method:body||bytes?'POST':'GET',headers:{origin,...(cookie?{cookie}:{}),...(body?{'Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):bytes});
  const text=await r.text();let data;try{data=JSON.parse(text);}catch{data={};}
  return {status:r.status,data,cookie:r.headers.get('set-cookie')?.split(';')[0]};
}
const catalog=await call('/api/products');assert.equal(catalog.status,200);assert.deepEqual(catalog.data.products.filter(p=>p.available).map(p=>p.id),['keychain']);assert.equal(catalog.data.products.find(p=>p.id==='pvc').amount,0);
const suffix=crypto.randomUUID(),email=`candidate-${suffix}@qa.example`,password='Framy-Test-Application-2026!';
const registered=await call('/api/auth',{body:{action:'register',name:'Candidato de Teste',email,password,returnTo:'/aplicar'}});assert.equal(registered.status,200,JSON.stringify(registered.data));assert.equal(registered.data.next,'/aplicar');const cookie=registered.cookie;
let r=await call('/api/agent-applications',{cookie,body:{action:'save',version:0,data:{name:'Candidato de Teste',birthDate:'1998-07-12',city:'Maputo',phone:'+258840000009',whatsapp:'+258840000009',occupation:'Vendas',description:'Candidatura fictícia para teste local de autorização.',consent:true}}});assert.equal(r.status,200,JSON.stringify(r.data));
const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=','base64');
for(const kind of ['portrait','id-front','id-back']){r=await call('/api/application-files?kind='+kind,{cookie,bytes:png});assert.equal(r.status,200,JSON.stringify(r.data));}
let app=(await call('/api/agent-applications',{cookie})).data.application;assert.equal(app.files.length,3);
assert.equal((await call('/api/application-files/'+app.files[0].id)).status,401);
r=await call('/api/agent-applications',{cookie,body:{action:'submit',version:app.version}});assert.equal(r.status,200,JSON.stringify(r.data));app=r.data.application;
const manager=await call('/api/auth',{body:{action:'login',email:'gestor@qa.example',password:'Framy-QA-2026-only!'}});assert.equal(manager.status,200,JSON.stringify(manager.data));
r=await call('/api/agent-applications',{cookie:manager.cookie,body:{action:'review',id:app.id,version:app.version,status:'APPROVED',identityVerified:true,note:'Aprovação fictícia apenas no teste local.'}});assert.equal(r.status,200,JSON.stringify(r.data));
assert.equal((await call('/api/agent-applications',{cookie})).status,401);
r=await call('/api/auth',{body:{action:'login',email,password}});assert.equal(r.status,200);assert.equal(r.data.next,'/agent');
const session=crypto.randomUUID();r=await call('/api/product-visits',{body:{productId:'wood',session}});assert.equal(r.status,200);
const stats=await call('/api/product-visits',{cookie:manager.cookie});assert.equal(stats.status,200);assert.ok(stats.data.visits.find(p=>p.product_id==='wood').visits>=1);
console.log('PASS: live local catalogue, signup return path, private files, application submission, manager approval, session revocation, agent login and non-buyer analytics.');
