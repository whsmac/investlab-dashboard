import test from 'node:test';
import assert from 'node:assert/strict';
import {estimateOverseasStockTax} from './overseas-stock-tax.mjs';
test('below deduction',()=>{const r=estimateOverseasStockTax({hypotheticalGainsKrw:[700000]});assert.equal(r.projectedTaxKrw,0)});
test('prior gains and offsetting sale losses',()=>{const r=estimateOverseasStockTax({priorRealizedKrw:3000000,hypotheticalGainsKrw:[700000,-220000]});assert.equal(r.hypotheticalNetKrw,480000);assert.equal(r.projectedTaxKrw,215600);assert.equal(r.incrementalTaxKrw,105600)});
test('stage-wise tax change',()=>{const r=estimateOverseasStockTax({priorRealizedKrw:3000000,hypotheticalGainsKrw:[700000,-220000]});assert.equal(r.stages.length,2);assert.equal(r.stages[0].stageIncrementalTaxKrw,154000);assert.equal(r.stages[1].stageIncrementalTaxKrw,-48400)});
test('reject invalid values',()=>assert.throws(()=>estimateOverseasStockTax({hypotheticalGainsKrw:[NaN]})));
test('loss cannot create negative tax',()=>assert.equal(estimateOverseasStockTax({priorRealizedKrw:-1000000}).projectedTaxKrw,0));
