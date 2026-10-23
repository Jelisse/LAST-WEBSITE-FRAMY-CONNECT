import test from 'node:test';
import assert from 'node:assert/strict';
import { profileLinkGroups, profileActionHref, socialActionName } from '../lib/profile-link-groups.ts';
const t = value => value;
test('grouping preserves private fields and original analytics identities', () => {
 const profile = {email:'private@example.com',showEmail:false,phone:'+12025550100',showPhone:false,links:[{label:'Instagram',url:'https://example.com/'},{label:'My work',url:'https://instagram.com/demo'},{label:'Chat',url:'https://wa.me/12025550100'}]};
 const groups = profileLinkGroups(profile,t);
 assert.deepEqual(groups.explore.map(l=>l.target),['link:0']);
 assert.deepEqual(groups.socials.map(l=>l.target),['link:1']);
 assert.deepEqual(groups.contacts.map(l=>l.target),['link:2']);
 assert.equal(socialActionName(groups.socials[0]),'Instagram · My work');
});
test('contact sorting retains tracking identities and hidden fields stay hidden',()=>{
 const groups=profileLinkGroups({email:'a@example.com',showEmail:true,phone:'+12025550100',showPhone:true,links:[{label:'WhatsApp',url:'https://www.whatsapp.com/'}]},t);
 assert.deepEqual(groups.contacts.map(l=>l.target),['email','phone','link:0']);
});
test('unsafe profile destinations cannot navigate',()=>{
 for(const url of ['javascript:alert(1)','data:text/html,test','http://example.com','https://a:b@example.com','https://example.com/\n']) assert.equal(profileActionHref(url),undefined);
 for(const url of ['https://example.com/','mailto:a@example.com','tel:+12025550100']) assert.equal(profileActionHref(url),url);
});
