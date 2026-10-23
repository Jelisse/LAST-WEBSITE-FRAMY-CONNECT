import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readGuidance,guidanceScope} from '../lib/first-use-tips.ts';
test('guidance progress ignores corrupt storage and bounds stored values',()=>{
 assert.deepEqual(readGuidance('invalid'),[]);assert.deepEqual(readGuidance('{}'),[]);
 assert.deepEqual(readGuidance('["customer:profile:preview",42,"private@example.com"]'),['customer:profile:preview']);
 assert.equal(readGuidance(JSON.stringify(Array(250).fill('manager:tabs'))).length,200);
});
test('guidance scopes separate roles and panels without storing customer identity or query parameters',()=>{
 assert.equal(guidanceScope('/perfil','profile'),'customer:profile');assert.equal(guidanceScope('/dashboard','profile'),'customer:profile');
 assert.equal(guidanceScope('/manager','finance'),'manager:finance');assert.equal(guidanceScope('/agent','stock'),'agent:stock');
 assert.equal(guidanceScope('/corporativo/cartoes','cards'),'company:cards');assert.equal(guidanceScope('/cofounder','accounts'),'director:accounts');
});

import {tipPosition} from '../lib/first-use-tips.ts';
test('tips fit the visible viewport and point back to their control',()=>{
 const tip=tipPosition({left:240,top:85,bottom:129,width:48},375,844);
 assert.ok(tip.left+tip.width<=363);assert.ok(tip.left>=12);assert.equal(tip.left+tip.arrow,264);
 const bottom=tipPosition({left:20,top:740,bottom:784,width:44},375,844);assert.equal(bottom.above,true);assert.ok(bottom.top<740);
});
