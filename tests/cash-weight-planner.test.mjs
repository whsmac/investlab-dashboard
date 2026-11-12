import test from 'node:test';
import assert from 'node:assert/strict';
import {planCashWeightSales} from '../src/simulator/cash-weight-planner.mjs';
const portfolio={cash:0,positions:{TSLA:{quantity:10,averageCost:100}}};
test('staged targets sell minimum whole shares and track cash',()=>{
 const r=planCashWeightSales(portfolio,{ticker:'TSLA',targets:[{price:100,cashWeightPct:20},{price:200,cashWeightPct:50},{price:300,cashWeightPct:70}]});
 assert.deepEqual(r.trades.map(t=>t.quantity),[2,4,2]);
 assert.equal(r.final.positions.TSLA.quantity,2);
 assert.equal(r.final.cash,1600);
 assert.ok(r.steps.every(s=>s.metTarget));
 assert.equal(portfolio.positions.TSLA.quantity,10);
});
test('existing cash and fees affect needed shares',()=>{
 const r=planCashWeightSales({cash:100,positions:{TSLA:{quantity:10,averageCost:100}}},{ticker:'TSLA',targets:[{price:100,cashWeightPct:50}],feePerTrade:10});
 assert.equal(r.trades[0].quantity,5);
 assert.equal(r.final.cash,590);
 assert.ok(r.steps[0].metTarget);
});
test('unreachable cash target is disclosed, not silently claimed met',()=>{
 const r=planCashWeightSales({cash:0,positions:{TSLA:{quantity:1,averageCost:100},MSFT:{quantity:9,averageCost:100}}},{ticker:'TSLA',targets:[{price:100,cashWeightPct:80}],referencePrices:{MSFT:100}});
 assert.equal(r.steps[0].soldShares,1);
 assert.equal(r.steps[0].metTarget,false);
});
test('rejects nonascending prices and declining targets',()=>{
 assert.throws(()=>planCashWeightSales(portfolio,{ticker:'TSLA',targets:[{price:100,cashWeightPct:30},{price:90,cashWeightPct:40}]}),/increase/);
 assert.throws(()=>planCashWeightSales(portfolio,{ticker:'TSLA',targets:[{price:100,cashWeightPct:40},{price:110,cashWeightPct:30}]}),/nondecreasing/);
});
