import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const html=readFileSync(new URL('../virtual-trade.html',import.meta.url),'utf8');
test('virtual simulator exposes and wires all three market presets',()=>{
 for(const id of ['rotate','dip','staged']) {
  assert.match(html,new RegExp('id="'+id+'"'));
  assert.match(html,new RegExp("for\\(const name of \\['dip','staged','rotate'\\]\\)"));
 }
 assert.match(html,/ticker:'SOXL',quantity:20,price:50/);
 assert.match(html,/ticker:'SOXL',quantity:20,price:60/);
});
test('virtual simulator validates blank inputs, uses separate comparison and has tax disclaimer',()=>{
 assert.match(html,/value\.trim\(\)/);
 assert.match(html,/compareScenarios\(portfolio/);
 assert.match(html,/planStagedSales\(portfolio/);
 assert.match(html,/양도소득세·세금용 환율/);
 assert.doesNotMatch(html,/\.insert\(|\.update\(|\.delete\(|supabase\.from\(/);
});
test('virtual simulator module script is not duplicated or truncated',()=>{
 assert.equal((html.match(/<script type="module">/g)||[]).length,1);
 assert.equal((html.match(/<\/script><\/body><\/html>/g)||[]).length,1);
 assert.equal((html.match(/example\('dip'\)/g)||[]).length,1);
});
