import test from 'node:test';
import assert from 'node:assert/strict';
import {launchOffers, companyQuote} from '../lib/launch-offers.ts';
import {corporateRequest} from '../lib/corporate-request.ts';
test('approved USD reference prices and employee limits',()=>{
 assert.deepEqual(launchOffers.map(p=>[p.name,p.min,p.max,p.monthlyCents,p.annualCents]),[['Personal',1,1,0,0],['Professional',1,1,400,4000],['Business',3,50,250,2500],['Enterprise',51,500,200,2000]]);
 assert.equal(companyQuote('business',5,'monthly').totalCents,1250);
 assert.equal(companyQuote('business',50,'annual').totalCents,125000);
 assert.equal(companyQuote('enterprise',51,'monthly').totalCents,10200);
 assert.equal(companyQuote('enterprise',500,'annual').totalCents,1000000);
});
test('company quotations reject wrong tier, invalid seats and cycles',()=>{
 for(const [id,seats,cycle] of [['business',2,'monthly'],['business',51,'annual'],['enterprise',50,'monthly'],['enterprise',501,'annual'],['business',3.5,'monthly'],['business','5','monthly'],['unknown',5,'monthly'],['business',5,'weekly']]) assert.throws(()=>companyQuote(id,seats,cycle));
});
test('corporate request recomputes USD quotation instead of trusting browser amounts',()=>{
 const d=corporateRequest({company:'Demo',people:5,phone:'+12025550100',location:'Maputo',offer:'business',cycle:'annual',quotation:{totalCents:1}},true);
 assert.equal(d.quotation.totalCents,12500);assert.equal(d.quotation.currency,'USD');assert.equal(d.quotation.quotationOnly,true);
 const legacy=corporateRequest({company:'Demo',people:1,phone:'+12025550100',location:'Maputo'},true);
 assert.equal('quotation' in legacy,false);
});
import { loginDestination } from '../lib/auth-policy.ts';
test('company offer survives sign-in only for recognised safe destinations',()=>{
 for(const offer of ['business','enterprise']) assert.equal(loginDestination('customer',`/corporativo/configurar?offer=${offer}`),`/corporativo/configurar?offer=${offer}`);
 for(const path of ['/corporativo/configurar?offer=admin','/corporativo/configurar?offer=enterprise&next=https://evil.test','https://evil.test/corporativo/configurar?offer=business']) assert.notEqual(loginDestination('customer',path),path);
 assert.notEqual(loginDestination('manager','/corporativo/configurar?offer=business'),'/corporativo/configurar?offer=business');
});
