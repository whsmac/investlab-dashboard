import test from 'node:test';
import assert from 'node:assert/strict';
import {estimateForeignStockTax} from '../src/simulator/foreign-stock-tax-estimate.mjs';
test('deduction absorbs small gain',()=>{
 const r=estimateForeignStockTax({sales:[{proceedsKRW:4000000,costBasisKRW:3000000}]});
 assert.equal(r.incrementalTaxKRW,0);assert.equal(r.simulatedGainKRW,1000000);
});
test('additional taxable gain uses annual prior gains and tax-rate assumption',()=>{
 const r=estimateForeignStockTax({priorRealizedGainKRW:3000000,sales:[{proceedsKRW:6000000,costBasisKRW:4000000,sellingFeesKRW:100000}]});
 assert.equal(r.estimatedAnnualTaxBeforeKRW,110000);
 assert.equal(r.estimatedAnnualTaxAfterKRW,528000);
 assert.equal(r.incrementalTaxKRW,418000);
});
test('loss can lower estimated annual tax without negative tax',()=>{
 const r=estimateForeignStockTax({priorRealizedGainKRW:4000000,sales:[{proceedsKRW:1000000,costBasisKRW:3000000}]});
 assert.equal(r.estimatedAnnualTaxAfterKRW,0);assert.equal(r.incrementalTaxKRW,-330000);
});
test('rejects missing sales, invalid FX-derived values and impossible fees',()=>{
 assert.throws(()=>estimateForeignStockTax({}),/sales/);
 assert.throws(()=>estimateForeignStockTax({sales:[{proceedsKRW:1,costBasisKRW:0,sellingFeesKRW:2}]}),/fees/);
 assert.throws(()=>estimateForeignStockTax({sales:[],taxRate:2}),/taxRate/);
 assert.throws(()=>estimateForeignStockTax({sales:[],priorRealizedGainKRW:NaN}),/finite/);
});
