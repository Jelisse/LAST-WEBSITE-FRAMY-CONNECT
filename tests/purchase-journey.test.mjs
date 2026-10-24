import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  purchaseJourney,
  purchaseResumeStep,
  purchaseReceptionIssue,
  purchaseBuyerIssue,
  purchaseConfigurationIssue,
  purchaseStages,
  purchaseDeliveryIssue,
  purchaseMoney,
} from '../lib/purchase-journey.ts';
import { readPurchaseDraft } from '../lib/purchase-draft.ts';
test('purchase steps require confirmed material pricing and complete applicable artwork before delivery', () => {
  const valid = {
    materialReady: true,
    artworkMissing: false,
    instructionsMissing: false,
    uploadBusy: false,
  };
  assert.equal(purchaseStages.length, 7);
  assert.equal(purchaseConfigurationIssue(valid, 1), null);
  assert.ok(purchaseConfigurationIssue({ ...valid, materialReady: false }, 0));
  assert.ok(purchaseConfigurationIssue({ ...valid, uploadBusy: true }, 1));
  assert.ok(purchaseConfigurationIssue({ ...valid, artworkMissing: true }, 1));
  assert.ok(
    purchaseConfigurationIssue({ ...valid, instructionsMissing: true }, 1),
  );
  // Artwork is not required while choosing the material itself.
  assert.equal(
    purchaseConfigurationIssue({ ...valid, artworkMissing: true }, 0),
    null,
  );
});
test('resumable purchase drafts preserve the stage and buyer details but reject malformed or expired values', () => {
  const draft = {
    version: 2,
    expires: 1100,
    card: 'PVC',
    keychain: 'PVC + epóxi',
    design: 'standard',
    delivery: 'pickup',
    city: 'maputo',
    pickupPoint: 'point',
    contact: '841234567',
    address: '',
    designInstructions: '',
    stage: 2,
    buyerName: 'Local test',
    buyerEmail: 'test@example.invalid',
  };
  const result = readPurchaseDraft(JSON.stringify(draft), 1000);
  assert.equal(
    readPurchaseDraft(JSON.stringify({ ...draft, stage: 3 }), 1000).stage,
    3,
  );
  assert.equal(result.stage, 2);
  assert.equal(result.buyerName, draft.buyerName);
  assert.equal(result.buyerEmail, draft.buyerEmail);
  for (const stage of [-1, 4, 1.5, '2'])
    assert.equal(
      readPurchaseDraft(JSON.stringify({ ...draft, stage }), 1000),
      null,
    );
  assert.equal(
    readPurchaseDraft(
      JSON.stringify({ ...draft, buyerEmail: 'a'.repeat(255) }),
      1000,
    ),
    null,
  );
  assert.equal(readPurchaseDraft(JSON.stringify(draft), 1200), null);
});

test('quotation configuration remains possible without confirmed pricing while artwork and upload gates remain enforced', () => {
  const values = {
    materialReady: false,
    allowQuotation: true,
    artworkMissing: false,
    instructionsMissing: false,
    uploadBusy: false,
  };
  assert.equal(purchaseConfigurationIssue(values, 0), null);
  assert.equal(purchaseConfigurationIssue(values, 1), null);
  assert.ok(purchaseConfigurationIssue({ ...values, artworkMissing: true }, 1));
  assert.ok(purchaseConfigurationIssue({ ...values, uploadBusy: true }, 1));
});
test('delivery validation identifies the missing decision and allows an explicitly quoted route', () => {
  const complete = {
    city: 'maputo',
    buyerReady: true,
    contact: '+258840000000',
    address: '',
    delivery: 'pickup',
    fulfilmentReady: true,
    quotation: false,
  };
  assert.equal(purchaseDeliveryIssue(complete), '');
  assert.match(purchaseDeliveryIssue({ ...complete, city: '' }), /cidade/);
  assert.match(
    purchaseDeliveryIssue({ ...complete, city: 'other', quotation: true }),
    /localidade/,
  );
  assert.equal(
    purchaseDeliveryIssue({
      ...complete,
      city: 'other',
      locality: 'Example town',
      quotation: true,
      fulfilmentReady: false,
    }),
    '',
  );
  assert.match(
    purchaseDeliveryIssue({ ...complete, buyerReady: false }),
    /email/,
  );
  assert.match(
    purchaseDeliveryIssue({ ...complete, contact: 'invalid text' }),
    /contacto/,
  );
  assert.match(
    purchaseDeliveryIssue({ ...complete, delivery: 'express' }),
    /morada/,
  );
  assert.match(
    purchaseDeliveryIssue({ ...complete, fulfilmentReady: false }),
    /recepção/,
  );
  assert.equal(
    purchaseDeliveryIssue({
      ...complete,
      fulfilmentReady: false,
      quotation: true,
    }),
    '',
  );
  assert.equal(
    purchaseDeliveryIssue({
      ...complete,
      delivery: 'express',
      address: 'Example address',
      fulfilmentReady: false,
      quotation: true,
    }),
    '',
  );
});
test('purchase display keeps meticais consistent and resumed format is allowlisted', () => {
  assert.equal(purchaseMoney(50000, 'en'), '500.00 MT');
  assert.equal(purchaseMoney(0, 'en'), '0.00 MT');
  const draft = {
    version: 2,
    expires: 1100,
    card: 'PVC',
    keychain: 'PVC + epóxi',
    design: 'standard',
    delivery: 'pickup',
    city: 'maputo',
    pickupPoint: 'point',
    contact: '841234567',
    address: '',
    designInstructions: '',
    format: 'card',
  };
  assert.equal(readPurchaseDraft(JSON.stringify(draft), 1000).format, 'card');
  assert.equal(
    readPurchaseDraft(JSON.stringify({ ...draft, format: 'unknown' }), 1000),
    null,
  );
});

test('standard purchases skip personalisation, while custom and team routes include it', () => {
  assert.deepEqual(
    purchaseJourney('standard').map((s) => s.key),
    ['materials', 'design', 'delivery', 'buyer', 'coupon', 'review'],
  );
  for (const design of ['customer', 'team'])
    assert.deepEqual(
      purchaseJourney(design).map((s) => s.key),
      [
        'materials',
        'design',
        'personalise',
        'delivery',
        'buyer',
        'coupon',
        'review',
      ],
    );
});
test('delivery and buyer validation are independent focused stages', () => {
  const reception = {
    city: 'maputo',
    address: '',
    delivery: 'pickup',
    fulfilmentReady: true,
    quotation: false,
  };
  assert.equal(purchaseReceptionIssue(reception), '');
  assert.match(purchaseReceptionIssue({ ...reception, city: '' }), /cidade/);
  assert.match(
    purchaseReceptionIssue({ ...reception, delivery: 'standard' }),
    /morada/,
  );
  assert.match(
    purchaseReceptionIssue({ ...reception, city: 'other', quotation: true }),
    /localidade/,
  );
  assert.equal(
    purchaseReceptionIssue({
      ...reception,
      city: 'other',
      locality: 'Test town',
      fulfilmentReady: false,
      quotation: true,
    }),
    '',
  );
  assert.match(
    purchaseBuyerIssue({ buyerReady: false, contact: '+258840000000' }),
    /email/,
  );
  assert.match(
    purchaseBuyerIssue({ buyerReady: true, contact: '123' }),
    /contacto/,
  );
  assert.equal(
    purchaseBuyerIssue({ buyerReady: true, contact: '+258840000000' }),
    '',
  );
});
test('version three drafts store semantic steps and cannot restore payment consent', () => {
  const draft = {
    version: 3,
    expires: 1100,
    card: 'PVC',
    keychain: 'PVC + epóxi',
    design: 'customer',
    delivery: 'pickup',
    city: 'maputo',
    pickupPoint: 'point',
    contact: '841234567',
    address: '',
    designInstructions: '',
  };
  for (const step of [
    'materials',
    'design',
    'personalise',
    'delivery',
    'buyer',
    'coupon',
  ])
    assert.equal(
      readPurchaseDraft(JSON.stringify({ ...draft, step }), 1000)?.step,
      step,
    );
  for (const step of ['review', 'unknown', '__proto__', 2, null])
    assert.equal(
      readPurchaseDraft(JSON.stringify({ ...draft, step }), 1000),
      null,
    );
});

test('ready-made kits skip material design work and retain a five-stage journey', () => {
  for (const design of ['standard', 'customer', 'team'])
    assert.deepEqual(
      purchaseJourney(design, true).map((s) => s.key),
      ['materials', 'delivery', 'buyer', 'coupon', 'review'],
    );
});

test('kit drafts retain the selected combination and bounded optional landmark', () => {
  const draft = {
    version: 3,
    expires: 1100,
    format: 'kit',
    kitVariant: 'orange',
    card: 'PVC',
    keychain: 'PVC + epóxi',
    design: 'standard',
    delivery: 'standard',
    city: 'maputo',
    pickupPoint: '',
    contact: '841234567',
    address: 'Test address',
    landmark: 'Near test square',
    designInstructions: '',
    step: 'delivery',
  };
  const read = readPurchaseDraft(JSON.stringify(draft), 1000);
  assert.equal(read.kitVariant, 'orange');
  assert.equal(read.landmark, draft.landmark);
  for (const kitVariant of ['invented', null, 1])
    assert.equal(
      readPurchaseDraft(JSON.stringify({ ...draft, kitVariant }), 1000),
      null,
    );
  assert.equal(
    readPurchaseDraft(
      JSON.stringify({ ...draft, landmark: 'x'.repeat(71) }),
      1000,
    ),
    null,
  );
});

test('card material and design share a stage; custom artwork alone adds personalisation', () => {
  assert.deepEqual(
    purchaseJourney('standard', false, true).map((s) => s.key),
    ['materials', 'delivery', 'buyer', 'coupon', 'review'],
  );
  for (const design of ['customer', 'team'])
    assert.deepEqual(
      purchaseJourney(design, false, true).map((s) => s.key),
      ['materials', 'personalise', 'delivery', 'buyer', 'coupon', 'review'],
    );
  assert.equal(purchaseResumeStep('card', 'standard', 'design'), 'materials');
  assert.equal(
    purchaseResumeStep('card', 'standard', 'personalise'),
    'materials',
  );
  assert.equal(
    purchaseResumeStep('card', 'customer', 'personalise'),
    'personalise',
  );
  assert.equal(
    purchaseResumeStep('keychain', 'standard', 'personalise'),
    'design',
  );
  assert.equal(purchaseResumeStep('kit', 'team', 'design'), 'materials');
  assert.equal(purchaseResumeStep('card', 'standard', 'buyer'), 'buyer');
});
