import test from 'node:test';
import assert from 'node:assert/strict';
import {simulatePercentageSales} from '../src/simulator/percentage-sales.mjs';
const p={cash:100,positions:{TSLA:{quantity:20,averageCost:100}}};
test('20%, 30%, 10% staged sales use original share count',()=>{
 const r=simulatePercentageSales(p,{ticker:'TSLA',targetCash:1500,stages:[{price:150,percent:20},{price:200,percent:30},{price:250,percent:10}]});
 assert.deepEqual(r.rows.map(x=>x.soldShares),[4,6,2]);
 assert.deepEqual(r.rows.map(x=>x.remainingShares),[16,10,8]);
 assert.deepEqual(r.rows.map(x=>x.cash),[700,1900,2400]);
 assert.equal(r.firstTargetReached,2);
 assert.equal(r.percentSold,60);
 assert.equal(r.final.realizedPnL,1100);
 assert.equal(p.positions.TSLA.quantity,20);
});
test('rejects over 100 percent, zero percent and missing holding',()=>{
 assert.throws(()=>simulatePercentageSales(p,{ticker:'TSLA',stages:[{price:150,percent:60},{price:200,percent:50}]}),/exceed/);
 assert.throws(()=>simulatePercentageSales(p,{ticker:'TSLA',stages:[{price:150,percent:0}]}),/percentage/);
 assert.throws(()=>simulatePercentageSales(p,{ticker:'SOXL',stages:[{price:150,percent:10}]}),/not held/);
});
