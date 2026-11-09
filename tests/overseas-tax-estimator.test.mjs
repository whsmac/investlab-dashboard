import test from 'node:test';
import assert from 'node:assert/strict';
import {estimateOverseasCapitalGainsTax,taxBasisSaleGainKrw} from '../src/simulator/overseas-tax-estimator.mjs';
test('annual deduction and tax rate are editable assumptions',()=>{
 const r=estimateOverseasCapitalGainsTax({hypotheticalGainsKrw:5000000});
 assert.equal(r.taxableKrw,2500000);
 assert.equal(r.estimatedTaxKrw,550000);
 assert.equal(r.incrementalTaxKrw,550000);
 assert.equal(r.taxStatus,'estimate_assumptions_only');
});
test('previously realized gains reduce unused deduction',()=>{
 const r=estimateOverseasCapitalGainsTax({realizedGainsKrw:3000000,hypotheticalGainsKrw:1000000});
 assert.equal(r.beforeTaxKrw,110000);
 assert.equal(r.estimatedTaxKrw,330000);
 assert.equal(r.incrementalTaxKrw,220000);
});
test('loss offset can decrease estimated annual tax',()=>{
 const r=estimateOverseasCapitalGainsTax({realizedGainsKrw:6000000,hypotheticalLossesKrw:2000000});
 assert.equal(r.beforeTaxKrw,770000);
 assert.equal(r.estimatedTaxKrw,330000);
 assert.equal(r.incrementalTaxKrw,-440000);
});
test('tax-basis KRW proceeds are independent of USD ledger average cost',()=>{
 assert.equal(taxBasisSaleGainKrw({proceedsKrw:4000000,acquisitionCostKrw:2900000,sellingFeesKrw:10000}),1090000);
 assert.equal(taxBasisSaleGainKrw({proceedsKrw:1000000,acquisitionCostKrw:1500000}),-500000);
});
test('invalid inputs fail closed',()=>{
 assert.throws(()=>estimateOverseasCapitalGainsTax({taxRate:2}),/tax rate/);
 assert.throws(()=>estimateOverseasCapitalGainsTax({hypotheticalLossesKrw:-1}),/nonnegative/);
 assert.throws(()=>taxBasisSaleGainKrw({proceedsKrw:100,sellingFeesKrw:101,acquisitionCostKrw:0}),/exceed/);
});
