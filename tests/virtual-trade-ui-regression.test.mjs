import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const html=readFileSync(new URL('../virtual-trade.html',import.meta.url),'utf8');
test('virtual trade page has one tax module import and one tax result id',()=>{
 assert.equal((html.match(/import \{estimateOverseasStockTax\}/g)||[]).length,1);
 assert.equal((html.match(/id="taxResult"/g)||[]).length,1);
 assert.equal((html.match(/id="taxRun"/g)||[]).length,1);
});
test('tax calculator only reads explicit KRW tax-basis fields',()=>{
 for(const id of ['taxPrior','taxHypothetical','taxDeduction','taxUsed','taxRate'])
  assert.match(html,new RegExp('id="'+id+'"'));
 assert.doesNotMatch(html,/priorTaxKrw|scenarioTaxKrw|usedDeduction/);
 assert.match(html,/hypotheticalGainsKrw:\[number\('taxHypothetical'\)\]/);
});
test('virtual trade page provides three strategic examples and read-only calculation',()=>{
 for(const name of ['dip','staged','rotate'])assert.match(html,new RegExp('id="'+name+'"'));
 assert.match(html,/compareScenarios\(/);
 assert.match(html,/planStagedSales\(/);
 assert.doesNotMatch(html,/\.insert\(|\.update\(|\.delete\(|\.upsert\(|\.rpc\(/);
});
test('module script has no duplicate top-level imports',()=>{
 const imports=[...html.matchAll(/^import\s+.*from\s+['"][^'"]+['"];?$/gm)].map(m=>m[0]);
 assert.equal(new Set(imports).size,imports.length);
});
