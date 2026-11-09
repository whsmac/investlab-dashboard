import test from 'node:test';
import assert from 'node:assert/strict';
import {simulateStagedSales} from '../src/simulator/staged-sales.mjs';
test('three-stage rising market sales track cumulative cash and remaining shares',()=>{
 const portfolio={cash:100,positions:{TSLA:{quantity:10,averageCost:100}}};
 const r=simulateStagedSales(portfolio,{ticker:'TSLA',targetCash:1300,stages:[
  {price:150,quantity:2,fee:1},{price:200,quantity:3,fee:2},{price:250,quantity:1,fee:1}
 ]});
 assert.deepEqual(r.rows.map(x=>x.remainingShares),[8,5,4]);
 assert.deepEqual(r.rows.map(x=>x.cash),[399,997,1246]);
 assert.equal(r.firstTargetReached,null);
 assert.equal(r.final.realizedPnL,546);
 assert.equal(portfolio.positions.TSLA.quantity,10);
 assert.equal(r.taxStatus,'not_calculated');
});
test('reports first target cash milestone',()=>{
 const r=simulateStagedSales({cash:0,positions:{TSLA:{quantity:5,averageCost:10}}},{ticker:'TSLA',targetCash:200,stages:[{price:50,quantity:1},{price:80,quantity:2}]});
 assert.equal(r.firstTargetReached,2);
 assert.deepEqual(r.rows.map(x=>x.targetCashReached),[false,true]);
});
test('rejects non-increasing targets and selling more shares than owned',()=>{
 const p={cash:0,positions:{TSLA:{quantity:2,averageCost:10}}};
 assert.throws(()=>simulateStagedSales(p,{ticker:'TSLA',stages:[{price:50,quantity:1},{price:40,quantity:1}]}),/increase/);
 assert.throws(()=>simulateStagedSales(p,{ticker:'TSLA',stages:[{price:50,quantity:3}]}),/insufficient shares/);
 assert.throws(()=>simulateStagedSales(p,{ticker:'TSLA',stages:[{price:50,quantity:1,fee:-1}]}),/fee/);
});

test('tracks cash allocation after each staged sale against target weight',()=>{
 const p={cash:0,positions:{TSLA:{quantity:10,averageCost:100}}};
 const r=simulateStagedSales(p,{ticker:'TSLA',stages:[{price:150,quantity:2},{price:200,quantity:3},{price:250,quantity:1}],valuationPrices:{TSLA:200},targetCashWeight:0.5});
 assert.deepEqual(r.rows.map(x=>x.cash),[300,900,1150]);
 assert.deepEqual(r.rows.map(x=>x.remainingShares),[8,5,4]);
 assert.equal(r.rows[0].cashWeight,300/1900);
 assert.equal(r.rows[1].cashWeight,900/1900);
 assert.equal(r.rows[2].cashWeight,1150/1950);
 assert.equal(r.firstCashWeightReached,3);
 assert.deepEqual(r.rows.map(x=>x.targetCashWeightReached),[false,false,true]);
 assert.equal(p.positions.TSLA.quantity,10);
});
test('cash weight requires complete valuation prices and bounded target',()=>{
 const p={cash:0,positions:{TSLA:{quantity:2,averageCost:100}}};
 const stages=[{price:150,quantity:1}];
 assert.throws(()=>simulateStagedSales(p,{ticker:'TSLA',stages,targetCashWeight:0.5}),/valuation prices required/);
 assert.throws(()=>simulateStagedSales(p,{ticker:'TSLA',stages,valuationPrices:{},targetCashWeight:0.5}),/valuation price/);
 assert.throws(()=>simulateStagedSales(p,{ticker:'TSLA',stages,valuationPrices:{TSLA:150},targetCashWeight:1.1}),/invalid target cash weight/);
});
