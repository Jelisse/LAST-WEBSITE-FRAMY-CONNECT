import test from 'node:test';
import assert from 'node:assert/strict';
import {corporateReportWindow,fillCorporateReportDays,teamReportValue} from '../lib/corporate-reports.ts';
import {corporateSections,corporateSectionURL} from '../lib/corporate-navigation.ts';
import {loginDestination} from '../lib/auth-policy.ts';
test('corporate report dates use Maputo midnight, fill missing days and do not invent activity',()=>{
 const before=Date.parse('2026-10-20T21:59:00Z'),after=Date.parse('2026-10-20T22:01:00Z');
 assert.equal(corporateReportWindow(7,after).today-corporateReportWindow(7,before).today,86400000);
 const day=corporateReportWindow(7,after).today;
 const rows=fillCorporateReportDays([{day,opens:3,clicks:1,contacts:1}],7,after);assert.equal(rows.length,7);assert.equal(rows[0].opens,0);assert.equal(rows.at(-1).opens,3);
 assert.equal(rows.reduce((sum,row)=>sum+row.contacts,0),1);assert.throws(()=>corporateReportWindow(8,after));
 const row={team:'A',opens:40,clicks:8,contacts:4,contributors:2};assert.equal(teamReportValue(row,'contacts','participant'),2);assert.equal(teamReportValue({...row,contributors:0},'contacts','participant'),0);
});
test('corporate sections have distinct safe authenticated destinations and preserve company selection',()=>{
 assert.equal(new Set(corporateSections.map(s=>s.path)).size,11);
 for(const s of corporateSections){assert.equal(loginDestination('customer',s.path),s.path);assert.equal(loginDestination('agent',s.path),s.path);}
 assert.equal(corporateSectionURL('/corporativo/equipa','a&other=b'),'/corporativo/equipa?organisation=a%26other%3Db');
 assert.notEqual(loginDestination('customer','/corporativo/equipa/../../manager'),'/corporativo/equipa/../../manager');
});
