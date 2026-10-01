import test from 'node:test';
import assert from 'node:assert/strict';
import {planFeatures,validatePlanControls} from '../lib/plan-features.ts';
import {profileAccess,hasPlanFeature,profileForAccess} from '../lib/entitlement.ts';
import {reminderDefaults,validateReminderSettings,renderReminder} from '../lib/subscription-settings.ts';
import {recognized,financeJournal,financeSummary,csv,validDay} from '../lib/finance-report.ts';
test('plan entitlements enforce individual removals and preserve historical paid terms',()=>{
 const features=planFeatures({id:'personal'});assert.equal(features.whatsapp,false);assert.equal(features.location,false);
 const base={plan_id:'personal',paid_started_at:'2026-01-01T00:00:00Z',paid_expires_at:'2027-01-01T00:00:00Z'};const now=Date.parse('2026-10-01');
 assert.equal(hasPlanFeature(base,'whatsapp',now),true);
 const terms={id:'personal',entitlementVersion:1,links:8,bio:200,features};const current={...base,terms_json:JSON.stringify(terms)};
 assert.equal(hasPlanFeature(current,'whatsapp',now),false);
 const profile={name:'Test',links:[],bio:'',business:{whatsapp:'25884',message:'Hello',address:'Maputo',hours:'9-5'},extras:{services:[{title:'Offer'}],enquiries:true}};
 const visible=profileForAccess(profile,current,now);assert.equal(visible.business.whatsapp,'');assert.equal(visible.business.address,'');assert.equal(visible.extras.services.length,0);assert.equal(profile.business.address,'Maputo');
 const custom={...base,plan_id:'custom',terms_json:JSON.stringify({...terms,id:'custom',features:{...features,analytics:true}})};
 assert.equal(profileAccess(custom,now),'paid');assert.equal(hasPlanFeature(custom,'analytics',now),true);assert.equal(hasPlanFeature(custom,'teams',now),false);
 assert.equal(profileAccess({...custom,terms_json:'{}'},now),'inactive');
 assert.throws(()=>validatePlanControls({id:'custom',active:true,features,monthlyEnabled:false,annualEnabled:false,benefits:[],sortOrder:0}));
});
test('renewal messages validate placeholders and substitute customer values without evaluating markup',()=>{
 assert.equal(validateReminderSettings(reminderDefaults).daysBefore,7);
 assert.throws(()=>validateReminderSettings({...reminderDefaults,message:'{password}'}));
 assert.throws(()=>validateReminderSettings({...reminderDefaults,daysBefore:0}));
 assert.throws(()=>validateReminderSettings({...reminderDefaults,subject:'Subject\nBcc: victim'}));
 assert.equal(renderReminder('Olá {nome}: {link_renovacao}',{nome:'Ana',link_renovacao:'https://example.test'}),'Olá Ana: https://example.test');
});
const annual={id:'annual',kind:'subscription',amount:100000,paidAt:'2026-01-01T00:00:00Z',periodStart:'2026-01-01T00:00:00+02:00',periodEnd:'2027-01-01T00:00:00+02:00',cycle:'annual'};
test('recognition spreads prepaid service and cumulative rounding conserves every cent',()=>{
 let total=0;for(let m=1;m<=12;m++){const month=String(m).padStart(2,'0'),last=new Date(Date.UTC(2026,m,0)).getUTCDate();total+=recognized(annual,`2026-${month}-01`,`2026-${month}-${last}`);}assert.equal(total,100000);
 assert.equal(recognized(annual,'2025-01-01','2025-12-31'),0);
 assert.equal(recognized({...annual,paidAt:null},'2026-01-01','2026-12-31'),0);
 assert.equal(recognized({...annual,kind:'product',fulfilledAt:null},'2026-01-01','2026-12-31'),0);
 const journal=financeJournal([annual],[],'2026-01-01','2026-12-31');assert.equal(journal.reduce((s,j)=>s+j.debit-j.credit,0),0);
});
test('finance reversals affect their own date, CSV is formula-safe and dates reject malformed input',()=>{
 const fee={id:'fee',kind:'fee',amount:500,occurred_on:'2026-01-02',reference:'fee',notes:'Fee'};const reversal={id:'rev',kind:'reversal',amount:500,occurred_on:'2026-02-02',reference:'rev',notes:'Correction',reversal_of:'fee'};
 assert.equal(financeSummary([], [fee,reversal],'2026-01-01','2026-01-31').fees,500);assert.equal(financeSummary([], [fee,reversal],'2026-02-01','2026-02-28').fees,-500);
 assert.match(csv([['=HYPERLINK("bad")']]),/"'=HYPERLINK/);
 for(const bad of ['2026-99-01','2026-02-30','wrong',null])assert.equal(validDay(bad),false);
});
