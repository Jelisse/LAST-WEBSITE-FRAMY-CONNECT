import test from 'node:test';
import assert from 'node:assert/strict';
import {prepareCorporateInvites,processCorporateBatch} from '../lib/corporate.ts';
test('unified corporate invitation entry validates all emails and preserves team assignments in both input modes',()=>{
 const base={entry:'emails',rows:[{name:' Ana ',email:' ANA@example.invalid '},{name:'',email:'b@example.invalid'}],batch:'',team:' Sales '};
 assert.deepEqual(prepareCorporateInvites(base),[{name:'Ana',email:'ana@example.invalid',team:'Sales'},{name:'',email:'b@example.invalid',team:'Sales'}]);
 assert.throws(()=>prepareCorporateInvites({...base,rows:[...base.rows,{name:'',email:'ana@example.invalid'}]}));
 assert.throws(()=>prepareCorporateInvites({...base,rows:[...base.rows,{name:'',email:'invalid'}]}));
 assert.throws(()=>prepareCorporateInvites({...base,team:' ',requireTeam:true}));
 assert.throws(()=>prepareCorporateInvites({...base,team:'a'.repeat(81)}));
 assert.throws(()=>prepareCorporateInvites({...base,rows:Array.from({length:26},(_,i)=>({name:'',email:i+'@example.invalid'}))}));
 assert.deepEqual(prepareCorporateInvites({...base,entry:'bulk',batch:'Ana;ana@example.invalid;Events\nBruno;bruno@example.invalid',team:'Sales'}),[{name:'Ana',email:'ana@example.invalid',team:'Events'},{name:'Bruno',email:'bruno@example.invalid',team:'Sales'}]);
});
test('unified corporate batch retry retains names and teams only for remaining employees',async()=>{
 const rows=prepareCorporateInvites({entry:'emails',rows:[{name:'Ana',email:'a@example.invalid'},{name:'Bruno',email:'b@example.invalid'}],batch:'',team:'Events'});
 const calls=[];const first=await processCorporateBatch(rows,async row=>{calls.push(row.email);if(row.name==='Bruno')throw Error('Stop');return 'accepted';});
 assert.equal(first.completed,1);assert.deepEqual(first.remaining,[{name:'Bruno',email:'b@example.invalid',team:'Events'}]);
 const retry=await processCorporateBatch(first.remaining,async row=>{calls.push(row.email);return 'uncertain';});assert.equal(retry.completed,1);assert.equal(retry.uncertain,1);assert.deepEqual(calls,['a@example.invalid','b@example.invalid','b@example.invalid']);
});
