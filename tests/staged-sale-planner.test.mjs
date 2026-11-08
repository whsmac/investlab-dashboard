import test from 'node:test';
import assert from 'node:assert/strict';
import {planStagedSales} from '../src/simulator/staged-sale-planner.mjs';
const portfolio={cash:100,positions:{TSLA:{quantity:10,averageCost:100}}};
test('three-stage bull sale computes cash and shares per step',()=>{
 const before=structuredClone(portfolio);
 const r=planStagedSales(portfolio,{ticker:'TSLA',targets:[
 {price:150,quantity:2,fee:1},{price:200,quantity:3,fee:2},{price:250,quantity:1,fee:1}
 ],terminalPrices:{TSLA:300}});
 assert.deepEqual(r.steps.map(s=>s.remainingShares),[8,5,4]);
 assert.deepEqual(r.steps.map(s=>s.cash),[399,997,1246]);
 assert.equal(r.totalRaisedCash,1146);
 assert.equal(r.final.realizedPnL,546);
 assert.equal(r.baselineValue,3100);
 assert.equal(r.terminalValue,2446);
 assert.equal(r.deltaVsHold,-654);
 assert.equal(r.taxStatus,'not_calculated');
 assert.deepEqual(portfolio,before);
});
test('rejects overselling and descending targets',()=>{
 assert.throws(()=>planStagedSales(portfolio,{ticker:'TSLA',targets:[{price:150,quantity:11}],terminalPrices:{TSLA:200}}),/insufficient shares/);
 assert.throws(()=>planStagedSales(portfolio,{ticker:'TSLA',targets:[{price:200,quantity:1},{price:150,quantity:1}],terminalPrices:{TSLA:200}}),/strictly increase/);
});
test('rejects missing terminal price and invalid quantity',()=>{
 assert.throws(()=>planStagedSales(portfolio,{ticker:'TSLA',targets:[{price:150,quantity:1}],terminalPrices:{}}),/terminal price/);
 assert.throws(()=>planStagedSales(portfolio,{ticker:'TSLA',targets:[{price:150,quantity:0}],terminalPrices:{TSLA:200}}),/sale quantity/);
});
