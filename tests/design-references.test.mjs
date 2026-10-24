import test from 'node:test';
import assert from 'node:assert/strict';
import {validateDesignReferences} from '../lib/design-references.ts';
import {readPurchaseDraft} from '../lib/purchase-draft.ts';
const asset={assetId:'a'.repeat(36),fileName:'reference.png'};
test('design references allow bounded files and safe links without treating inspiration as artwork',()=>{
 assert.deepEqual(validateDesignReferences(undefined),{assets:[],url:''});
 assert.deepEqual(validateDesignReferences({assets:[asset],url:'https://example.invalid/inspiration'}),{assets:[asset],url:'https://example.invalid/inspiration'});
 for(const value of [{assets:Array(4).fill(asset),url:''},{assets:[asset,asset],url:''},{assets:[{...asset,assetId:'foreign'}],url:''},{assets:[],url:'javascript:alert(1)'},{assets:[],url:'https://user:password@example.invalid/'},{assets:[],url:'http://example.invalid'},{assets:[],url:'x'.repeat(1001)}]) assert.throws(()=>validateDesignReferences(value));
});
test('purchase drafts restore references and reject malformed reference metadata',()=>{
 const draft={version:3,expires:1100,card:'PVC',keychain:'PVC + epóxi',design:'team',delivery:'pickup',city:'maputo',pickupPoint:'point',contact:'841234567',address:'',designInstructions:'Warm design',designReferences:{assets:[asset],url:''}};
 assert.deepEqual(readPurchaseDraft(JSON.stringify(draft),1000).designReferences,draft.designReferences);
 assert.equal(readPurchaseDraft(JSON.stringify({...draft,designReferences:{assets:[{...asset,assetId:'invalid'}],url:''}}),1000),null);
});

test('an unfinished reference link survives drafting but cannot pass checkout validation',()=>{
 const draft={version:3,expires:1100,card:'PVC',keychain:'PVC + epóxi',design:'team',delivery:'pickup',city:'maputo',pickupPoint:'point',contact:'841234567',address:'',designInstructions:'Warm design',designReferences:{assets:[asset],url:'https://'}};
 const restored=readPurchaseDraft(JSON.stringify(draft),1000);
 assert.equal(restored.designReferences.url,'https://');
 assert.throws(()=>validateDesignReferences(restored.designReferences));
 assert.equal(restored.designInstructions,'Warm design');
});
