import test from 'node:test';
import assert from 'node:assert/strict';
import {estimateOverseasShareTax} from '../src/simulator/overseas-share-tax-estimator.mjs';
test('deduction absorbs smaller annual gain',()=>{const r=estimateOverseasShareTax({scenarioRealizedKrw:2000000});assert.equal(r.estimatedTaxAfterKrw,0);assert.equal(r.incrementalEstimatedTaxKrw,0)});
test('annual prior gains reduce remaining deduction',()=>{const r=estimateOverseasShareTax({priorRealizedKrw:2000000,scenarioRealizedKrw:1000000});assert.equal(r.incrementalEstimatedTaxKrw,110000);assert.equal(r.estimatedTaxAfterKrw,110000)});
test('prior annual gains and losses are netted',()=>{const r=estimateOverseasShareTax({priorRealizedKrw:4000000,otherRealizedKrw:-3000000,scenarioRealizedKrw:3000000});assert.equal(r.estimatedTaxAfterKrw,330000)});
test('scenario loss may reduce estimated liability, not cash refund promise',()=>{const r=estimateOverseasShareTax({priorRealizedKrw:5000000,scenarioRealizedKrw:-1000000});assert.equal(r.incrementalEstimatedTaxKrw,-220000)});
test('tax deduction can be disabled explicitly',()=>{const r=estimateOverseasShareTax({scenarioRealizedKrw:1000000,eligibleForDeduction:false});assert.equal(r.estimatedTaxAfterKrw,220000)});
test('invalid input and tax year rejected',()=>{assert.throws(()=>estimateOverseasShareTax({scenarioRealizedKrw:NaN}),/finite/);assert.throws(()=>estimateOverseasShareTax({rate:1.2}),/rate/);assert.throws(()=>estimateOverseasShareTax({taxYear:1990}),/year/)});
