import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
const file=fileURLToPath(new URL('../virtual-trade.html',import.meta.url));
const html=readFileSync(file,'utf8');
test('virtual trade page loads each simulator module only once',()=>{
 for(const name of ['virtual-trade-engine','scenario-comparison','staged-sale-planner','krw-tax-gain','overseas-stock-tax']){
  assert.equal(html.split("from './src/simulator/"+name+".mjs'").length-1,1,name);
 }
});
test('tax results have a unique DOM target and no nonexistent automatic-tax toggle',()=>{
 assert.equal((html.match(/id="taxResult"/g)||[]).length,1);
 assert.doesNotMatch(html,/taxEnabled|taxBuyPrice|taxDeductionUsed/);
});
test('trade and tax controls are wired without DB write operations',()=>{
 for(const id of ['run','fxCalculate','taxRun','taxPrior','taxHypothetical','taxDeduction','taxUsed','taxRate']){
  assert.match(html,new RegExp('id="'+id+'"'));
 }
 assert.doesNotMatch(html,/supabase\.from\(|\.insert\(|\.update\(|\.delete\(/);
});
