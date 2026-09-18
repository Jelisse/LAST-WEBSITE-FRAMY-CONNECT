import test from 'node:test';
import assert from 'node:assert/strict';
import {serviceFailure} from '../lib/service-failure.ts';
test('service failures are traceable without exposing SQL or private record data', async () => {
  const original=console.error, logs=[];
  console.error=(message)=>logs.push(message);
  try {
    const response=serviceFailure(new Error('D1_ERROR: no such table: private_table secret@example.com'), 'workspace','Temporariamente indisponível.');
    assert.equal(response.status,503);
    assert.equal(response.headers.get('cache-control'),'no-store');
    const body=await response.json();
    assert.ok(body.reference);
    assert.equal(JSON.parse(logs[0]).reference,body.reference);
    assert.equal(JSON.parse(logs[0]).category,'schema-missing');
    assert.doesNotMatch(JSON.stringify(body)+logs.join(''), /private_table|secret@example.com|D1_ERROR/);
  } finally { console.error=original; }
});
