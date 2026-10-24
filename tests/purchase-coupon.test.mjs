import { test } from 'node:test';
import assert from 'node:assert/strict';
import { purchaseCouponFromSearch, validatePurchaseCoupon } from '../lib/purchase-coupon.ts';
test('coupon links accept recognised keys, normalise codes and reject excessive input',()=>{
 assert.equal(purchaseCouponFromSearch('?cupao=%20framy50%20'),'FRAMY50');
 assert.equal(purchaseCouponFromSearch('?coupon=hello'),'HELLO');
 assert.equal(purchaseCouponFromSearch('?ref=framy'),'FRAMY');
 assert.equal(purchaseCouponFromSearch('?token=private'),'');
 assert.equal(purchaseCouponFromSearch('?cupao='+'a'.repeat(101)),'');
});
test('coupon validation queries only the typed code and accepts the server canonical result',async()=>{
 const signal=new AbortController().signal;
 const result=await validatePurchaseCoupon('  framy50  ',async(url,options)=>{
  assert.equal(url,'/api/ambassadors?code=FRAMY50');
  assert.equal(options.cache,'no-store'); assert.equal(options.signal,signal);
  return Response.json({valid:true,code:'FRAMY50',discountPercent:10});
 },signal);
 assert.equal(result,'FRAMY50');
});
test('coupon validation never treats invalid, inactive, rate-limited or failed requests as discounts',async()=>{
 await assert.rejects(validatePurchaseCoupon(' ',()=>{throw Error('must not request');}),/empty/);
 await assert.rejects(validatePurchaseCoupon('x'.repeat(101),()=>{throw Error('must not request');}),/invalid/);
 for(const value of [{valid:false},{valid:true,code:null},{valid:true,code:''}])
  await assert.rejects(validatePurchaseCoupon('TEST',async()=>Response.json(value)),/invalid/);
 await assert.rejects(validatePurchaseCoupon('TEST',async()=>new Response(null,{status:429})),/limit/);
 await assert.rejects(validatePurchaseCoupon('TEST',async()=>new Response(null,{status:503})),/network/);
});
