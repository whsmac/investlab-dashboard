import test from 'node:test';
import assert from 'node:assert/strict';
import {estimateOverseasShareTax,estimateTaxableDisposalKrw} from '../src/simulator/overseas-share-tax.mjs';
test('tax below deduction is zero',()=>{
 const r=estimateOverseasShareTax({year:2026,priorRealizedKrw:1000000,scenarioRealizedKrw:1000000});
 assert.equal(r.incrementalEstimatedTaxKrw,0);
});
test('incremental tax reflects earlier realized gains and deduction',()=>{
 const r=estimateOverseasShareTax({year:2026,priorRealizedKrw:2000000,scenarioRealizedKrw:2000000});
 assert.equal(r.priorEstimatedTaxKrw,0);
 assert.equal(r.combinedEstimatedTaxKrw,330000);
 assert.equal(r.incrementalEstimatedTaxKrw,330000);
});
test('scenario losses can reduce estimated annual tax',()=>{
 const r=estimateOverseasShareTax({year:2026,priorRealizedKrw:5000000,scenarioRealizedKrw:-1000000});
 assert.equal(r.incrementalEstimatedTaxKrw,-220000);
});
test('purchase and disposal FX are separate',()=>{
 const r=estimateTaxableDisposalKrw({quantity:10,acquisitionPrice:100,disposalPrice:120,acquisitionFx:1300,disposalFx:1400,acquisitionFeeKrw:1000,disposalFeeKrw:2000});
 assert.equal(r.acquisitionKrw,1301000);assert.equal(r.disposalKrw,1678000);assert.equal(r.realizedKrw,377000);
});
test('reject invalid rates, deduction and FX',()=>{
 assert.throws(()=>estimateOverseasShareTax({year:2026,priorRealizedKrw:0,scenarioRealizedKrw:0,rate:2}),/rate/);
 assert.throws(()=>estimateOverseasShareTax({year:2026,priorRealizedKrw:0,scenarioRealizedKrw:0,otherDeductionUsedKrw:3000000}),/exceeds/);
 assert.throws(()=>estimateTaxableDisposalKrw({quantity:1,acquisitionPrice:100,disposalPrice:100,acquisitionFx:0,disposalFx:1400}),/acquisitionFx/);
});
