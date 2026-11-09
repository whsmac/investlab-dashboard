import test from 'node:test';
import assert from 'node:assert/strict';
import {estimateOverseasStockTax} from '../src/simulator/overseas-stock-tax-estimator.mjs';
test('KRW gains below annual deduction produce no estimated tax',()=>{
 const r=estimateOverseasStockTax({proposedSales:[{proceedsKRW:4000000,acquisitionKRW:3000000}]});
 assert.equal(r.proposedGainKRW,1000000);assert.equal(r.estimatedTaxAfterKRW,0);
});
test('tax is incremental to previously realized gains',()=>{
 const r=estimateOverseasStockTax({previousRealizedGainKRW:3000000,proposedSales:[{proceedsKRW:4000000,acquisitionKRW:2000000,allowableFeesKRW:100000}]});
 assert.equal(r.proposedGainKRW,1900000);
 assert.equal(r.estimatedTaxBeforeKRW,110000);
 assert.equal(r.estimatedTaxAfterKRW,528000);
 assert.equal(r.incrementalEstimatedTaxKRW,418000);
});
test('losses offset annual gains without forcing negative total tax',()=>{
 const r=estimateOverseasStockTax({previousRealizedGainKRW:4000000,proposedSales:[{proceedsKRW:1000000,acquisitionKRW:3000000}]});
 assert.equal(r.estimatedTaxBeforeKRW,330000);assert.equal(r.estimatedTaxAfterKRW,0);
 assert.equal(r.incrementalEstimatedTaxKRW,-330000);
});
test('explicit alternate deduction and rate',()=>{
 const r=estimateOverseasStockTax({deductionKRW:0,taxRate:0.1,proposedSales:[{proceedsKRW:3000000,acquisitionKRW:2000000}]});
 assert.equal(r.estimatedTaxAfterKRW,100000);
});
test('rejects invalid amounts, fees and rates',()=>{
 assert.throws(()=>estimateOverseasStockTax({taxRate:1.1}),/tax rate/);
 assert.throws(()=>estimateOverseasStockTax({proposedSales:[{proceedsKRW:NaN,acquisitionKRW:1}]}),/finite/);
 assert.throws(()=>estimateOverseasStockTax({proposedSales:[{proceedsKRW:1,acquisitionKRW:1,allowableFeesKRW:-1}]}),/nonnegative/);
});
