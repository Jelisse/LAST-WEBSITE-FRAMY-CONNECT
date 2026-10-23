import {test} from 'node:test';
import assert from 'node:assert/strict';
import {blankProfile} from '../lib/domain.ts';
import {profileSetupIssue,resumeProfileStep,profileIssueLocation} from '../lib/profile-setup.ts';
test('setup resumes from persisted useful content without making optional photos mandatory',()=>{
 assert.equal(resumeProfileStep(null),0);
 const profile={...blankProfile,name:'Local Test',username:'local_test'};
 assert.equal(resumeProfileStep(profile),1);
 assert.equal(resumeProfileStep({...profile,email:'hello@example.com'}),2);
 assert.equal(profileSetupIssue(profile),null);
});
test('setup directs validation failures to the editable field and keeps contact privacy intact',()=>{
 const profile={...blankProfile,name:'Local Test',username:'local_test',email:'bad-email',showEmail:false};
 assert.deepEqual(profileSetupIssue(profile),{message:'Indique um email válido.',step:1,field:'email'});
 assert.equal(profile.showEmail,false);
 assert.equal(profileSetupIssue({...profile,email:'',website:'javascript:alert(1)'})?.field,'website');
 assert.deepEqual(profileIssueLocation('O nome de utilizador já está em uso. Escolha outro.'),{step:0,field:'username'});
 assert.equal(profileSetupIssue({...profile,email:'',name:''})?.field,'name');
});
