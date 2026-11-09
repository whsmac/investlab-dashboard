import test from 'node:test';
import assert from 'node:assert/strict';
import {estimateOverseasStockTax} from './overseas-stock-tax.mjs';
test('below deduction',()=>{const r=estimateOverseasStockTax({sales:[{ticker:'TSLA',quantity:5,priceUsd:200,fxKrwPerUsd:1400,acquisitionBasisKrw:700000}]});assert.equal(r.saleNetGainKrw,700000);assert.equal(r.estimatedTaxKrw,0)});
test('multiple sales with previous annual gains and losses',()=>{const r=estimateOverseasStockTax({otherAnnualNetGainKrw:3000000,sales:[{quantity:5,priceUsd:200,fxKrwPerUsd:1400,acquisitionBasisKrw:700000},{quantity:2,priceUsd:100,fxKrwPerUsd:1400,acquisitionBasisKrw:500000}]});assert.equal(r.saleNetGainKrw,480000);assert.equal(r.estimatedTaxKrw,215600)});
test('reject missing KRW acquisition basis',()=>assert.throws(()=>estimateOverseasStockTax({sales:[{quantity:1,priceUsd:10,fxKrwPerUsd:1400}]})));
test('zero sales and losses',()=>{const r=estimateOverseasStockTax({otherAnnualNetGainKrw:-1000000});assert.equal(r.estimatedTaxKrw,0)});
