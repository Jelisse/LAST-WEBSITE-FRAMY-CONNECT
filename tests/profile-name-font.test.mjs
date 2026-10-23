import {test} from 'node:test';
import assert from 'node:assert/strict';
import {nameFont,nameFontStyle,nameFonts} from '../lib/profile-name-font.ts';
import {validateProfile,blankProfile,publicProfile} from '../lib/domain.ts';
import {companyTemplate,companyCard,companyCardProfile} from '../lib/company-cards.ts';
import {fixture} from './helpers/company-fixture.mjs';
const person={...blankProfile,name:'José da Conceição',username:'jose_conceicao'};
const brand={company:'Example Studio',headline:'',website:'',accent:'sage',nameFont:'elegant'};
const employee={name:'Example Employee',title:'Architect',email:'',phone:'',showEmail:false,showPhone:false};
test('curated font values persist through profile validation/publication and default legacy profiles to Classic',()=>{
 assert.equal(validateProfile(person).nameFont,'classic');
 for(const {value} of nameFonts){const p=validateProfile({...person,nameFont:value});assert.equal(publicProfile(p).nameFont,value);assert.equal(p.name,person.name);assert.ok(nameFontStyle(value).fontFamily);}
 for(const value of ['url(evil)','<style>',{},123,false]){assert.throws(()=>nameFont(value));assert.throws(()=>validateProfile({...person,nameFont:value}));}
});
test('company public cards use the template font unless employee font editing is enabled',()=>{
 const template=companyTemplate(brand);const card=companyCard({...employee,nameFont:'bold'});
 assert.equal(companyCardProfile(card,template,'id').nameFont,'elegant');
 assert.equal(companyCardProfile(card,{...template,editable:[...template.editable,'nameFont']},'id').nameFont,'bold');
 assert.equal(companyCardProfile(companyCard(employee),{...template,editable:[...template.editable,'nameFont']},'id').nameFont,'elegant');
 assert.equal(companyTemplate({...brand,nameFont:undefined}).nameFont,'classic');
 assert.throws(()=>companyCard({...employee,nameFont:'arbitrary'}));assert.throws(()=>companyTemplate({...brand,nameFont:'arbitrary'}));
});
test('company font permission is enforced on the server for employee saves',async()=>{
 const f=fixture();assert.equal((await f.post({action:'template',version:0,template:brand})).status,200);f.actor('worker');
 assert.notEqual((await f.post({action:'publish-card',version:0,templateVersion:1,card:{...employee,nameFont:'bold'}})).status,200);
 assert.equal((await f.post({action:'publish-card',version:0,templateVersion:1,card:employee})).status,200);
 f.actor('owner');const editable=[...companyTemplate(brand).editable,'nameFont'];assert.equal((await f.post({action:'template',version:1,template:{...brand,editable}})).status,200);
 f.actor('worker');assert.equal((await f.post({action:'save-card',version:1,templateVersion:2,card:{...employee,nameFont:'modern'}})).status,200);
});
