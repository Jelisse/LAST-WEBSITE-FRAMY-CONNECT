import test from 'node:test';
import assert from 'node:assert/strict';
import {splitPhoneNumber,joinPhoneNumber,phoneRegions,countryFlag} from '../lib/phone-number.ts';
test('international phone input preserves existing values, shared codes and unlisted prefixes',()=>{
 assert.deepEqual(splitPhoneNumber('+258840000000'),{region:'MZ',code:'+258',number:'840000000'});
 assert.deepEqual(splitPhoneNumber('+886912345678'),{region:'TW',code:'+886',number:'912345678'});
 assert.equal(splitPhoneNumber('+14165551234','CA').region,'CA');
 assert.equal(splitPhoneNumber('+14165551234','US').region,'US');
 assert.deepEqual(splitPhoneNumber('+998901234567'),{region:'other',code:'',number:'+998901234567'});
 assert.equal(splitPhoneNumber('840000000').number,'840000000','legacy national number is preserved until edited');
 assert.equal(joinPhoneNumber('840000000','+258'),'+258840000000');
 assert.equal(joinPhoneNumber('+380501234567','+258'),'+380501234567','pasting a complete number does not duplicate the prefix');
 assert.equal(joinPhoneNumber('','+258'),'','blank optional contact remains blank');
 assert.equal(joinPhoneNumber('998901234567',''),'+998901234567');
 assert.equal(new Set(phoneRegions.map(x=>x.region)).size,phoneRegions.length);
 assert.equal(countryFlag('MZ'),String.fromCodePoint(0x1f1f2,0x1f1ff));
});
