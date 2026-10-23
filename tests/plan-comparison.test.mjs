import test from 'node:test';
import assert from 'node:assert/strict';
import {planComparison} from '../lib/plan-comparison.ts';
import {analyticsPath} from '../lib/site-analytics.ts';
const plans=[{id:'personal',links:8,bio:200,active:true},{id:'professional-v2',links:20,bio:600,active:true,features:{showcase:false,analytics:false,whatsapp:true,enquiries:true,location:false}}];
test('comparison follows published profile limits and individual feature controls',()=>{
 const rows=planComparison(plans).flatMap(g=>g.rows);const row=label=>rows.find(r=>r.label===label).values;
 assert.deepEqual(row('Links por perfil'),['8','20','Na proposta','Na proposta']);
 assert.deepEqual(row('WhatsApp com mensagem personalizada'),[false,true,'Na proposta','Na proposta']);
 assert.equal(row('Vitrine de produtos ou serviços')[1],false);
 assert.equal(row('Estatísticas de visitas e cliques')[1],false);
 assert.equal(row('Espaço da empresa e convites')[1],false);
 assert.deepEqual(row('Débito automático'),[false,false,false,false]);
 assert.equal(planComparison([]).flatMap(g=>g.rows).find(r=>r.label==='Estatísticas de visitas e cliques').values[1],false);
});
test('Why Framy marketing page is eligible for consented analytics but private profile/query paths stay excluded',()=>{
 assert.equal(analyticsPath('/porque-framy'),'/porque-framy');
 for(const path of ['/porque-framy?email=private@example.test','/porque-framy#eventos','/angela','/corporativo/configurar']) assert.equal(analyticsPath(path),null);
});
