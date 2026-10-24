import {test} from 'node:test';
import assert from 'node:assert/strict';
import {purchaseConfigurationIssue,purchaseStages} from '../lib/purchase-journey.ts';
import {readPurchaseDraft} from '../lib/purchase-draft.ts';
test('purchase steps require confirmed material pricing and complete applicable artwork before delivery',()=>{
 const valid={materialReady:true,artworkMissing:false,instructionsMissing:false,uploadBusy:false};
 assert.equal(purchaseStages.length,4);
 assert.equal(purchaseConfigurationIssue(valid,1),null);
 assert.ok(purchaseConfigurationIssue({...valid,materialReady:false},0));
 assert.ok(purchaseConfigurationIssue({...valid,uploadBusy:true},1));
 assert.ok(purchaseConfigurationIssue({...valid,artworkMissing:true},1));
 assert.ok(purchaseConfigurationIssue({...valid,instructionsMissing:true},1));
 // Artwork is not required while choosing the material itself.
 assert.equal(purchaseConfigurationIssue({...valid,artworkMissing:true},0),null);
});
test('resumable purchase drafts preserve the stage and buyer details but reject malformed or expired values',()=>{
 const draft={version:2,expires:1100,card:'PVC',keychain:'PVC + epóxi',design:'standard',delivery:'pickup',city:'maputo',pickupPoint:'point',contact:'841234567',address:'',designInstructions:'',stage:2,buyerName:'Local test',buyerEmail:'test@example.invalid'};
 const result=readPurchaseDraft(JSON.stringify(draft),1000);
 assert.equal(result.stage,2); assert.equal(result.buyerName,draft.buyerName); assert.equal(result.buyerEmail,draft.buyerEmail);
 for(const stage of [-1,3,1.5,'2']) assert.equal(readPurchaseDraft(JSON.stringify({...draft,stage}),1000),null);
 assert.equal(readPurchaseDraft(JSON.stringify({...draft,buyerEmail:'a'.repeat(255)}),1000),null);
 assert.equal(readPurchaseDraft(JSON.stringify(draft),1200),null);
});
