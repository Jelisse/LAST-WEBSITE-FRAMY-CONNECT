import {test} from 'node:test';
import assert from 'node:assert/strict';
import {workspacePlan} from '../lib/workspace-plan.ts';
import {INDIVIDUAL_PLAN} from '../lib/plan-policy.ts';
import {profileIssueLocation} from '../lib/profile-setup.ts';
const membership={planId:'personal',terms:INDIVIDUAL_PLAN,active:true,accessState:'free'};
test('workspace identifies Personal and Professional independently of historical display names',()=>{
 const free=workspacePlan(membership);
 assert.equal(free.name,'Personal');assert.equal(free.personal,true);assert.equal(free.hasTools,false);
 const paid=workspacePlan({...membership,planId:'professional-v2',accessState:'paid',terms:{...INDIVIDUAL_PLAN,id:'professional-v2',name:'Old name',features:{...INDIVIDUAL_PLAN.features,whatsapp:true}}});
 assert.equal(paid.name,'Professional');assert.equal(paid.hasTools,true);assert.equal(paid.features.whatsapp,true);assert.equal(paid.features.teams,false);
});
test('inactive and basic access never advertise advanced tools but retain plan identity',()=>{
 for(const accessState of ['basic','inactive']) {
 const view=workspacePlan({...membership,planId:'professional-v2',accessState,terms:{...INDIVIDUAL_PLAN,features:{...INDIVIDUAL_PLAN.features,whatsapp:true}}});
 assert.equal(view.name,'Professional');assert.equal(view.hasTools,false);assert.equal(view.features.whatsapp,false);
 }
 assert.equal(workspacePlan({...membership,planId:'free-30'}).name,'Personal');
 assert.equal(workspacePlan({...membership,planId:''}).personal,true);
 assert.deepEqual(profileIssueLocation('Biografia inválida.'),{step:0,field:'bio'});
});

import {profilePresentation} from '../lib/entitlement.ts';
import {blankProfile} from '../lib/domain.ts';
import {defaultBusiness} from '../lib/profile-business.ts';
import {defaultExtras} from '../lib/profile-growth.ts';
test('Personal publication preserves appearance while filtering paid fields without deleting their draft values',()=>{
 const profile={...blankProfile,name:'Local Test',username:'local_test',business:{...defaultBusiness,accent:'sage',whatsapp:'+258840000000',address:'Test street'},extras:{...defaultExtras,enquiries:true,services:[{title:'Service',description:'',price:'',url:''}]}};
 const published=profilePresentation(profile,'free',{plan_id:'personal',terms_json:JSON.stringify(INDIVIDUAL_PLAN)});
 assert.equal(published.business.accent,'sage');assert.equal(published.business.whatsapp,'');assert.equal(published.business.address,'');assert.equal(published.extras.enquiries,false);assert.equal(published.extras.services.length,0);
 assert.equal(profile.business.whatsapp,'+258840000000');assert.equal(profile.extras.services.length,1);
});
