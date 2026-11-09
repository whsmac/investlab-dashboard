import test from 'node:test';
import assert from 'node:assert/strict';
import {planDipAccumulation} from '../src/simulator/dip-accumulation-planner.mjs';
const portfolio={cash:1000,positions:{TSLA:{quantity:10,averageCost:100}}};
test('staged dip purchases increase shares while reducing cash',()=>{
 const original=structuredClone(portfolio);
 const r=planDipAccumulation(portfolio,{ticker:'TSLA',targets:[{price:100,quantity:3},{price:80,quantity:5}],terminalPrices:{TSLA:120}});
 assert.deepEqual(r.steps.map(s=>s.totalShares),[13,18]);
 assert.deepEqual(r.steps.map(s=>s.cash),[700,300]);
 assert.equal(r.final.positions.TSLA.quantity,18);
 assert.equal(r.baselineValue,2200);
 assert.equal(r.terminalValue,2460);
 assert.equal(r.deltaVsHold,260);
 assert.equal(r.taxStatus,'not_calculated');
 assert.deepEqual(portfolio,original);
});
test('reserve cash and buying power are enforced',()=>{
 assert.throws(()=>planDipAccumulation(portfolio,{ticker:'TSLA',targets:[{price:100,quantity:9}],terminalPrices:{TSLA:120},reserveCash:200}),/reserve breached/);
 assert.throws(()=>planDipAccumulation(portfolio,{ticker:'TSLA',targets:[{price:100,quantity:11}],terminalPrices:{TSLA:120}}),/insufficient cash/);
});
test('prices must descend, quantities positive and valuation prices supplied',()=>{
 assert.throws(()=>planDipAccumulation(portfolio,{ticker:'TSLA',targets:[{price:100,quantity:1},{price:120,quantity:1}],terminalPrices:{TSLA:120}}),/strictly decrease/);
 assert.throws(()=>planDipAccumulation(portfolio,{ticker:'TSLA',targets:[{price:100,quantity:0}],terminalPrices:{TSLA:120}}),/quantity/);
 assert.throws(()=>planDipAccumulation(portfolio,{ticker:'TSLA',targets:[{price:100,quantity:1}],terminalPrices:{}}),/terminal price/);
});
