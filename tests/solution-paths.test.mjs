import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync,readFileSync} from 'node:fs';
import {solutionPaths,solutionBySlug} from '../lib/solution-paths.ts';
import {testimonialFor} from '../lib/solution-testimonials.ts';
const messages=JSON.parse(readFileSync(new URL('../lib/translations.json',import.meta.url),'utf8'));
test('six solution stories have unique destinations, retained legacy anchors and real optimized photographs',()=>{
 assert.equal(solutionPaths.length,6);
 assert.equal(new Set(solutionPaths.map(p=>p.slug)).size,6);
 assert.deepEqual(solutionPaths.map(p=>p.id),['trabalho','criadores','consultorio','eventos','equipas','actualizar']);
 for(const path of solutionPaths){
   assert.equal(solutionBySlug(path.slug),path);
   assert.equal(path.href,'/solucoes/'+path.slug);
   assert.ok(existsSync(new URL('../public'+path.image,import.meta.url)));
   assert.ok(existsSync(new URL('../public'+path.image.replace('.webp','-small.webp'),import.meta.url)));
   for(const key of [path.title,path.summary,path.audience,path.discoveryTitle,path.discoverySummary,path.heroTitle,path.heroSummary,path.tag,path.imageAlt,path.pain,path.solution,path.moment,path.plan,...path.benefits]) assert.ok(messages[key],key);
 }
 assert.equal(solutionBySlug('unknown'),undefined);
});
test('testimonials remain unpublished until explicitly approved for the matching solution',()=>{
 assert.equal(testimonialFor('eventos'),undefined);
 const draft={solution:'eventos',quote:'Internal test',name:'Test',role:'Test',approved:false};
 assert.equal(testimonialFor('eventos',[draft]),undefined);
 assert.equal(testimonialFor('equipas',[{...draft,approved:true}]),undefined);
 assert.equal(testimonialFor('eventos',[{...draft,approved:true}]).quote,'Internal test');
});
