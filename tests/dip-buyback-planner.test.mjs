import test from 'node:test';
import assert from 'node:assert/strict';
import {planDipBuyback} from '../src/simulator/dip-buyback-planner.mjs';
const p={cash:0,positions:{TSLA:{quantity:10,averageCost:100}}};
test('two-stage dip buyback increases shares and compares with holding',()=>{
 const original=structuredClone(p);
 const r=planDipBuyback(p,{ticker:'TSLA',sellStages:[{price:200,quantity:3},{price:180,quantity:2}],buyStages:[{price:120,quantity:4},{price:100,quantity:4}],terminalPrices:{TSLA:150}});
 assert.equal(r.initialShares,10);assert.equal(r.finalShares,13);assert.equal(r.shareChange,3);
 assert.equal(r.final.cash,60);assert.equal(r.baselineValue,1500);assert.equal(r.terminalValue,2010);assert.equal(r.deltaVsHold,510);
 assert.deepEqual(r.steps.map(s=>s.shares),[7,5,9,13]);assert.deepEqual(p,original);
 assert.equal(r.taxStatus,'not_calculated');
});
test('insufficient cash and overselling are rejected',()=>{
 assert.throws(()=>planDipBuyback(p,{ticker:'TSLA',sellStages:[{price:200,quantity:5}],buyStages:[{price:100,quantity:11}],terminalPrices:{TSLA:100}}),/insufficient cash/);
 assert.throws(()=>planDipBuyback(p,{ticker:'TSLA',sellStages:[{price:200,quantity:11}],buyStages:[{price:100,quantity:1}],terminalPrices:{TSLA:100}}),/insufficient shares/);
});
test('requires declining buy targets and terminal prices',()=>{
 const args={ticker:'TSLA',sellStages:[{price:200,quantity:1}],buyStages:[{price:100,quantity:1}],terminalPrices:{TSLA:100}};
 assert.throws(()=>planDipBuyback(p,{...args,buyStages:[{price:100,quantity:1},{price:110,quantity:1}]}),/strictly decrease/);
 assert.throws(()=>planDipBuyback(p,{...args,terminalPrices:{}}),/terminal price/);
});
