import test from 'node:test';
import assert from 'node:assert/strict';
import {publicSiteURL} from '../lib/site-url.ts';
test('production metadata requires an explicit clean HTTPS domain', () => {
  assert.equal(publicSiteURL('https://shop.example.com').origin, 'https://shop.example.com');
  for (const value of [undefined,'','http://shop.example.com','https://name:secret@shop.example.com','https://shop.example.com/path','https://shop.example.com?secret=x','https://project.workers.dev','https://project.chatgpt.site'])
    assert.equal(publicSiteURL(value),null);
});
