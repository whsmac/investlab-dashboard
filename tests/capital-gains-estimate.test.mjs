import test from 'node:test';
import assert from 'node:assert/strict';
import {estimateCapitalGainsTax} from '../src/simulator/capital-gains-estimate.mjs';
const defaults={annualDeductionKRW:2500000,taxRate:0.22};
test('below deduction threshold no tax',()=>{
 const r=estimateCapitalGainsTax({...defaults,scenarioTaxableGainsKRW:2000000});
 assert.equal(r.incrementalTaxKRW,0);
});
test('incremental tax reflects already realized gains',()=>{
 const r=estimateCapitalGainsTax({...defaults,priorTaxableGainsKRW:3000000,scenarioTaxableGainsKRW:1000000});
 assert.equal(r.estimatedTaxBeforeKRW,110000);
 assert.equal(r.estimatedTaxAfterKRW,330000);
 assert.equal(r.incrementalTaxKRW,220000);
});
test('scenario loss can reduce estimated annual tax',()=>{
 const r=estimateCapitalGainsTax({...defaults,priorTaxableGainsKRW:4000000,scenarioTaxableGainsKRW:-1000000});
 assert.equal(r.incrementalTaxKRW,-220000);
});
test('deduction already used elsewhere reduces remaining deduction',()=>{
 const r=estimateCapitalGainsTax({...defaults,otherDeductionUsedKRW:2000000,scenarioTaxableGainsKRW:1000000});
 assert.equal(r.deductionAvailableKRW,500000);
 assert.equal(r.incrementalTaxKRW,110000);
});
test('requires explicit tax assumptions and rejects invalid inputs',()=>{
 assert.throws(()=>estimateCapitalGainsTax({scenarioTaxableGainsKRW:1000000}),/finite/);
 assert.throws(()=>estimateCapitalGainsTax({...defaults,taxRate:1.2}),/invalid/);
 assert.throws(()=>estimateCapitalGainsTax({...defaults,annualDeductionKRW:-1}),/invalid/);
});
