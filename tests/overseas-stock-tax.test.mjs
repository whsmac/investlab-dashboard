import test from 'node:test';
import assert from 'node:assert/strict';
import {estimateOverseasStockTax} from '../src/simulator/overseas-stock-tax.mjs';
test('no annual net gain beyond deduction means zero estimated tax',()=>{
 const r=estimateOverseasStockTax({hypotheticalGainsKrw:[1000000,500000]});
 assert.equal(r.projectedTaxKrw,0);assert.equal(r.incrementalTaxKrw,0);
});
test('estimate incremental tax against already realized annual gains',()=>{
 const r=estimateOverseasStockTax({priorRealizedKrw:4000000,hypotheticalGainsKrw:[2000000,-500000]});
 assert.equal(r.baselineTaxKrw,330000);assert.equal(r.projectedTaxKrw,660000);assert.equal(r.incrementalTaxKrw,330000);
});
test('loss scenario can lower annual tax but not below zero',()=>{
 const r=estimateOverseasStockTax({priorRealizedKrw:5000000,hypotheticalGainsKrw:[-4000000]});
 assert.equal(r.baselineTaxKrw,550000);assert.equal(r.projectedTaxKrw,0);assert.equal(r.incrementalTaxKrw,-550000);
});
test('used deduction and configurable rate',()=>{
 const r=estimateOverseasStockTax({hypotheticalGainsKrw:[2000000],annualDeductionKrw:2500000,deductionUsedElsewhereKrw:1000000,taxRate:.2});
 assert.equal(r.availableDeductionKrw,1500000);assert.equal(r.projectedTaxKrw,100000);
});
test('reject nonfinite gains and invalid deductions',()=>{
 assert.throws(()=>estimateOverseasStockTax({hypotheticalGainsKrw:[NaN]}),/finite/);
 assert.throws(()=>estimateOverseasStockTax({taxRate:1.2}),/exceed/);
 assert.throws(()=>estimateOverseasStockTax({deductionUsedElsewhereKrw:3000000}),/exceeds/);
});
