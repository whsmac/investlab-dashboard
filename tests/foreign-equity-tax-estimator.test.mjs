import test from 'node:test';
import assert from 'node:assert/strict';
import {estimateForeignEquityTax,convertTaxAmountToKRW} from '../src/simulator/foreign-equity-tax-estimator.mjs';
test('no tax below annual deduction',()=>{
 const r=estimateForeignEquityTax({scenarioGainsKRW:[1000000,1000000],taxYear:2026});
 assert.equal(r.incrementalEstimatedTaxKRW,0);
 assert.equal(r.combinedEstimatedTaxKRW,0);
 assert.equal(r.status,'estimate_only');
});
test('combined annual gains use one deduction',()=>{
 const r=estimateForeignEquityTax({existingAnnualGainsKRW:2000000,scenarioGainsKRW:[3000000,-1000000]});
 assert.equal(r.combinedAnnualGainsKRW,4000000);
 assert.equal(r.incrementalEstimatedTaxKRW,330000);
 assert.equal(r.scenarioAfterIncrementalTaxKRW,1670000);
});
test('scenario losses can reduce annual estimate',()=>{
 const r=estimateForeignEquityTax({existingAnnualGainsKRW:5000000,scenarioGainsKRW:[-2000000]});
 assert.equal(r.baselineEstimatedTaxKRW,550000);
 assert.equal(r.combinedEstimatedTaxKRW,110000);
 assert.equal(r.incrementalEstimatedTaxKRW,-440000);
});
test('partial deduction used elsewhere and rate override',()=>{
 const r=estimateForeignEquityTax({scenarioGainsKRW:[3000000],annualDeductionKRW:2500000,otherDeductionUsedKRW:1000000,taxRate:0.2});
 assert.equal(r.incrementalEstimatedTaxKRW,300000);
});
test('FX conversion is explicit and invalid inputs are rejected',()=>{
 assert.equal(convertTaxAmountToKRW(100,1400),140000);
 assert.throws(()=>convertTaxAmountToKRW(100,0),/positive/);
 assert.throws(()=>estimateForeignEquityTax({scenarioGainsKRW:[NaN]}),/finite/);
 assert.throws(()=>estimateForeignEquityTax({taxRate:2}),/invalid/);
});
