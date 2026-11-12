import test from 'node:test';
import assert from 'node:assert/strict';
import {estimateForeignStockTax} from '../src/simulator/foreign-stock-tax-estimator.mjs';
test('default assumptions: taxable amount above annual deduction',()=>{
 const r=estimateForeignStockTax({scenarioRealizedGainKrw:5000000});
 assert.equal(r.totalEstimatedTaxKrw,550000);assert.equal(r.incrementalEstimatedTaxKrw,550000);
 assert.equal(r.status,'illustrative_only');
});
test('prior gains already use deduction',()=>{
 const r=estimateForeignStockTax({priorRealizedGainKrw:4000000,scenarioRealizedGainKrw:1000000});
 assert.equal(r.baselineEstimatedTaxKrw,330000);
 assert.equal(r.totalEstimatedTaxKrw,550000);
 assert.equal(r.incrementalEstimatedTaxKrw,220000);
});
test('scenario losses can lower indicative annual tax',()=>{
 const r=estimateForeignStockTax({priorRealizedGainKrw:6000000,scenarioRealizedGainKrw:-3000000});
 assert.equal(r.incrementalEstimatedTaxKrw,-660000);
});
test('deduction already used by other eligible assets is configurable',()=>{
 const r=estimateForeignStockTax({scenarioRealizedGainKrw:1000000,otherDeductionUsedKrw:2500000});
 assert.equal(r.totalEstimatedTaxKrw,220000);
});
test('rejects nonfinite and invalid assumptions',()=>{
 assert.throws(()=>estimateForeignStockTax({scenarioRealizedGainKrw:NaN}),/finite/);
 assert.throws(()=>estimateForeignStockTax({combinedTaxRate:1.1}),/exceed/);
 assert.throws(()=>estimateForeignStockTax({annualDeductionKrw:-1}),/nonnegative/);
});
