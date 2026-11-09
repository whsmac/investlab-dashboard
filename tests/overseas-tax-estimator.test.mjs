import test from 'node:test';
import assert from 'node:assert/strict';
import {estimateOverseasStockTax} from '../src/simulator/overseas-tax-estimator.mjs';
test('below deduction produces no estimated tax',()=>{
 const r=estimateOverseasStockTax({disposals:[{proceedsKrw:4000000,acquisitionCostKrw:2000000}]});
 assert.equal(r.hypotheticalGainKrw,2000000);assert.equal(r.incrementalTaxKrw,0);
});
test('hypothetical gains cross deduction threshold',()=>{
 const r=estimateOverseasStockTax({annualRealizedGainKrw:2000000,disposals:[{proceedsKrw:2000000,acquisitionCostKrw:1000000,deductibleExpensesKrw:100000}]});
 assert.equal(r.hypotheticalGainKrw,900000);assert.equal(r.incrementalTaxKrw,88000);
});
test('prior gain and existing deduction usage change incremental tax',()=>{
 const r=estimateOverseasStockTax({annualRealizedGainKrw:3000000,deductionAlreadyUsedKrw:2500000,disposals:[{proceedsKrw:2000000,acquisitionCostKrw:1000000}]});
 assert.equal(r.incrementalTaxKrw,220000);
});
test('loss scenario can reduce estimated tax, but not below zero',()=>{
 const r=estimateOverseasStockTax({annualRealizedGainKrw:4000000,disposals:[{proceedsKrw:1000000,acquisitionCostKrw:3000000}]});
 assert.equal(r.incrementalTaxKrw,-330000);
 assert.equal(r.estimatedTaxAfterKrw,0);
});
test('does not mutate inputs and rejects malformed data',()=>{
 const d=[{proceedsKrw:3000000,acquisitionCostKrw:2000000}];const before=structuredClone(d);
 estimateOverseasStockTax({disposals:d});assert.deepEqual(d,before);
 assert.throws(()=>estimateOverseasStockTax({disposals:[{proceedsKrw:-1,acquisitionCostKrw:0}]}),/nonnegative/);
 assert.throws(()=>estimateOverseasStockTax({deductionAlreadyUsedKrw:3000000}),/exceeds/);
 assert.throws(()=>estimateOverseasStockTax({taxRate:2}),/rate/);
});
