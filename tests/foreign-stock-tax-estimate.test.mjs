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

test('converts disposal FX but keeps externally supplied tax basis',async()=>{
 const {convertDisposalToKRW}=await import('../src/simulator/foreign-stock-tax-estimate.mjs');
 const sale=convertDisposalToKRW({quantity:2,priceUSD:100,disposalFxKRW:1400,acquisitionCostKRW:200000,sellingFeeUSD:1});
 assert.deepEqual(sale,{proceedsKRW:280000,costBasisKRW:200000,sellingFeesKRW:1400});
 const tax=estimateForeignStockTax({sales:[sale],annualDeductionKRW:0,taxRate:0.22});
 assert.equal(tax.simulatedGainKRW,78600);
 assert.equal(tax.incrementalTaxKRW,17292);
});
test('rejects invalid disposal FX and excessive fee',async()=>{
 const {convertDisposalToKRW}=await import('../src/simulator/foreign-stock-tax-estimate.mjs');
 assert.throws(()=>convertDisposalToKRW({quantity:1,priceUSD:100,disposalFxKRW:0,acquisitionCostKRW:0}),/disposalFxKRW/);
 assert.throws(()=>convertDisposalToKRW({quantity:1,priceUSD:100,disposalFxKRW:1400,acquisitionCostKRW:0,sellingFeeUSD:101}),/selling fee/);
});
