import test from 'node:test';
import assert from 'node:assert/strict';
import {calculateKrwDisposalGain} from '../src/simulator/krw-tax-gain.mjs';
test('different acquisition and disposal FX produce KRW gain independent of USD gain',()=>{
 const r=calculateKrwDisposalGain({quantity:10,acquisitionPrice:100,disposalPrice:100,acquisitionFx:1200,disposalFx:1400});
 assert.equal(r.acquisitionCostKrw,1200000);assert.equal(r.disposalProceedsKrw,1400000);assert.equal(r.gainKrw,200000);
});
test('fees adjust KRW basis and proceeds',()=>{
 const r=calculateKrwDisposalGain({quantity:2,acquisitionPrice:100,disposalPrice:150,acquisitionFx:1300,disposalFx:1400,acquisitionFeeKrw:1000,disposalFeeKrw:2000});
 assert.equal(r.acquisitionCostKrw,261000);assert.equal(r.disposalProceedsKrw,418000);assert.equal(r.gainKrw,157000);
});
test('loss and invalid inputs are handled without changing records',()=>{
 const input={quantity:1,acquisitionPrice:200,disposalPrice:100,acquisitionFx:1300,disposalFx:1300};
 assert.equal(calculateKrwDisposalGain(input).gainKrw,-130000);
 assert.equal(input.acquisitionPrice,200);
 assert.throws(()=>calculateKrwDisposalGain({...input,disposalFx:0}),/positive/);
 assert.throws(()=>calculateKrwDisposalGain({...input,quantity:NaN}),/positive/);
 assert.throws(()=>calculateKrwDisposalGain({...input,disposalFeeKrw:200000}),/exceed/);
});
