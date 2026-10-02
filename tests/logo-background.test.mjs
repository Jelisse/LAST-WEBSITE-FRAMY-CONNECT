import {test} from 'node:test';
import assert from 'node:assert/strict';
import {clearLogoBackground} from '../lib/logo-background.ts';
test('removes connected background while retaining logo and enclosed light detail', () => {
  const data = new Uint8ClampedArray(5*5*4).fill(255);
  for (const i of [6,7,8,11,13,16,17,18]) for (let c=0;c<3;c++) data[i*4+c]=0;
  assert.equal(clearLogoBackground(data,5,5,20),16);
  assert.equal(data[3],0);
  assert.equal(data[6*4+3],255);
  assert.equal(data[12*4+3],255);
});
test('transparent input is reported rather than destroyed', () => {
  assert.throws(()=>clearLogoBackground(new Uint8ClampedArray(16),2,2,20),/transparente/);
});

import {clearLogoBackgroundColor} from '../lib/logo-background.ts';
test('background removal preserves enclosed white logo details and existing alpha', () => {
  const data = new Uint8ClampedArray(5 * 5 * 4).fill(255);
  for (const pixel of [6, 7, 8, 11, 13, 16, 17, 18]) {
    data.set([0, 0, 0, 255], pixel * 4);
  }
  data[3] = 0;
  assert.equal(clearLogoBackgroundColor(data, 5, 5, [255, 255, 255], 30), 15);
  assert.equal(data[12 * 4 + 3], 255);
  assert.equal(data[6 * 4 + 3], 255);
  assert.equal(data[4 * 4 + 3], 0);
});
test('background removal respects chosen colour and tolerance', () => {
  const data = new Uint8ClampedArray([240, 240, 240, 255, 0, 0, 0, 255]);
  assert.equal(clearLogoBackgroundColor(data, 2, 1, [255, 255, 255], 10), 0);
  assert.equal(clearLogoBackgroundColor(data, 2, 1, [255, 255, 255], 20), 1);
  assert.equal(data[7], 255);
  assert.throws(() => clearLogoBackgroundColor(data, 2, 1, [255, 255, 255], NaN));
});
