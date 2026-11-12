import test from 'node:test';
import assert from 'node:assert/strict';
import {estimateTaxBasisKrw} from '../src/simulator/tax-basis-fx.mjs';
import {estimateOverseasStockTax} from '../src/simulator/overseas-stock-tax.mjs';
test('distinct acquisition and disposal FX rates change KRW gain',()=>{
 const r=estimateTaxBasisKrw({quantity:10,acquisitionPriceUsd:100,disposalPriceUsd:120,acquisitionFxKrwPerUsd:1300,disposalFxKrwPerUsd:1400});
 assert.equal(r.acquisitionKrw,1300000);
 assert.equal(r.disposalKrw,1680000);
 assert.equal(r.gainKrw,380000);
 assert.notEqual(r.gainKrw,200*1400);
});
test('buy fees increase tax basis; sell fees reduce proceeds',()=>{
 const r=estimateTaxBasisKrw({quantity:2,acquisitionPriceUsd:100,disposalPriceUsd:150,acquisitionFxKrwPerUsd:1300,disposalFxKrwPerUsd:1400,acquisitionFeeUsd:2,disposalFeeUsd:1});
 assert.equal(r.acquisitionKrw,262600);
 assert.equal(r.disposalKrw,418600);
 assert.equal(r.gainKrw,156000);
});
test('FX loss may exist despite USD price increase',()=>{
 const r=estimateTaxBasisKrw({quantity:1,acquisitionPriceUsd:100,disposalPriceUsd:110,acquisitionFxKrwPerUsd:1500,disposalFxKrwPerUsd:1200});
 assert.equal(r.gainKrw,-18000);
});
test('KRW gain is accepted by annual tax estimate, without writing ledger',()=>{
 const r=estimateTaxBasisKrw({quantity:10,acquisitionPriceUsd:100,disposalPriceUsd:120,acquisitionFxKrwPerUsd:1300,disposalFxKrwPerUsd:1400});
 const t=estimateOverseasStockTax({priorRealizedKrw:3000000,hypotheticalGainsKrw:[r.gainKrw]});
 assert.equal(t.incrementalTaxKrw,83600);
});
test('rejects invalid FX and fee greater than proceeds',()=>{
 const base={quantity:1,acquisitionPriceUsd:100,disposalPriceUsd:120,acquisitionFxKrwPerUsd:1300,disposalFxKrwPerUsd:1400};
 assert.throws(()=>estimateTaxBasisKrw({...base,acquisitionFxKrwPerUsd:0}),/acquisitionFx/);
 assert.throws(()=>estimateTaxBasisKrw({...base,disposalFeeUsd:200}),/exceeds/);
 assert.throws(()=>estimateTaxBasisKrw({...base,quantity:NaN}),/quantity/);
});
