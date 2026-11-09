import test from 'node:test';
import assert from 'node:assert/strict';
import {simulateWithTax} from '../src/simulator/simulate-with-tax.mjs';
const portfolio={cash:0,positions:{TSLA:{quantity:10,averageCost:100}}};
test('staged sells combine KRW taxable gains separately from USD cash',()=>{
 const original=structuredClone(portfolio);
 const r=simulateWithTax(portfolio,[{side:'sell',ticker:'TSLA',quantity:2,price:200},{side:'sell',ticker:'TSLA',quantity:3,price:300}],{
 taxableGainKrwByTrade:[2000000,3000000],priorRealizedKrw:1000000});
 assert.equal(r.simulation.final.cash,1300);
 assert.equal(r.simulation.final.positions.TSLA.quantity,5);
 assert.equal(r.tax.projectedTaxKrw,770000);
 assert.equal(r.tax.incrementalTaxKrw,770000);
 assert.deepEqual(portfolio,original);
});
test('buy and sell require explicit KRW gain on sell, null on buy',()=>{
 const r=simulateWithTax({cash:1000,positions:{}},[{side:'buy',ticker:'TSLA',quantity:1,price:100},{side:'sell',ticker:'TSLA',quantity:1,price:150}],{taxableGainKrwByTrade:[null,400000]});
 assert.equal(r.simulation.final.cash,1050);assert.equal(r.tax.projectedTaxKrw,0);
});
test('reject missing tax basis and mismatched trade count',()=>{
 const trades=[{side:'sell',ticker:'TSLA',quantity:1,price:150}];
 assert.throws(()=>simulateWithTax(portfolio,trades,{taxableGainKrwByTrade:[]}),/match/);
 assert.throws(()=>simulateWithTax(portfolio,trades,{taxableGainKrwByTrade:[null]}),/missing tax-basis/);
 assert.throws(()=>simulateWithTax(portfolio,[{side:'buy',ticker:'TSLA',quantity:1,price:100}],{taxableGainKrwByTrade:[0]}),/require null/);
});
test('negative taxable gain reduces tax estimate but does not change USD proceeds',()=>{
 const r=simulateWithTax(portfolio,[{side:'sell',ticker:'TSLA',quantity:1,price:80}],{taxableGainKrwByTrade:[-1000000],priorRealizedKrw:5000000});
 assert.equal(r.tax.incrementalTaxKrw,-220000);assert.equal(r.simulation.final.cash,80);
});
