import test from 'node:test';
import assert from 'node:assert/strict';
import {estimateScenarioDisposalTax} from '../src/simulator/scenario-disposal-tax.mjs';
test('aggregates distinct FX gains and losses for multiple virtual disposals',()=>{
 const lines=[
  {ticker:'TSLA',quantity:10,acquisitionPrice:100,disposalPrice:200,acquisitionFx:1200,disposalFx:1400},
  {ticker:'SOXL',quantity:5,acquisitionPrice:100,disposalPrice:50,acquisitionFx:1400,disposalFx:1400}
 ];
 const copy=structuredClone(lines);
 const r=estimateScenarioDisposalTax(lines,{priorRealizedKrw:2000000});
 assert.equal(r.lines[0].gainKrw,1600000);
 assert.equal(r.lines[1].gainKrw,-350000);
 assert.equal(r.netDisposalGainKrw,1250000);
 assert.equal(r.estimate.projectedTaxKrw,165000);
 assert.equal(r.estimate.baselineTaxKrw,0);
 assert.deepEqual(lines,copy);
});
test('empty scenario preserves baseline tax',()=>{
 const r=estimateScenarioDisposalTax([],{priorRealizedKrw:4000000});
 assert.equal(r.disposalCount,0);
 assert.equal(r.estimate.incrementalTaxKrw,0);
});
test('missing FX and negative fees are rejected',()=>{
 assert.throws(()=>estimateScenarioDisposalTax([{quantity:1,acquisitionPrice:100,disposalPrice:200,acquisitionFx:1200}]),/positive/);
 assert.throws(()=>estimateScenarioDisposalTax([{quantity:1,acquisitionPrice:100,disposalPrice:200,acquisitionFx:1200,disposalFx:1400,disposalFeeKrw:-1}]),/nonnegative/);
});
