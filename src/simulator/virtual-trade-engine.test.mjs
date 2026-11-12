import test from 'node:test';
import assert from 'node:assert/strict';
import {simulateTrades} from './virtual-trade-engine.mjs';

test('multi-step rotation preserves original portfolio and tracks cash and shares',()=>{
 const portfolio={cash:100,positions:{TSLA:{quantity:10,averageCost:100}}};
 const result=simulateTrades(portfolio,[
  {side:'sell',ticker:'TSLA',quantity:4,price:150,fee:2},
  {side:'buy',ticker:'SOXL',quantity:5,price:100,fee:1}
 ]);
 assert.equal(result.steps[0].cash,698);
 assert.equal(result.final.cash,197);
 assert.equal(result.final.positions.TSLA.quantity,6);
 assert.equal(result.final.positions.SOXL.quantity,5);
 assert.equal(result.final.positions.SOXL.averageCost,100.2);
 assert.equal(result.final.realizedPnL,198);
 assert.equal(portfolio.positions.TSLA.quantity,10);
 assert.equal(result.taxStatus,'not_calculated');
});

test('partial buy updates average cost; partial sell realizes net gain',()=>{
 const result=simulateTrades({cash:1000,positions:{TSLA:{quantity:2,averageCost:50}}},[
  {side:'buy',ticker:'TSLA',quantity:2,price:40,fee:2},
  {side:'sell',ticker:'TSLA',quantity:1,price:80,fee:1}
 ]);
 assert.equal(result.final.positions.TSLA.quantity,3);
 assert.equal(result.final.positions.TSLA.averageCost,45.5);
 assert.equal(result.final.realizedPnL,33.5);
});

test('invalid trade conditions are rejected',()=>{
 const p={cash:100,positions:{TSLA:{quantity:2,averageCost:50}}};
 assert.throws(()=>simulateTrades(p,[{side:'buy',ticker:'TSLA',quantity:2,price:100}]),/insufficient cash/);
 assert.throws(()=>simulateTrades(p,[{side:'sell',ticker:'TSLA',quantity:3,price:100}]),/insufficient shares/);
 assert.throws(()=>simulateTrades(p,[{side:'sell',ticker:'TSLA',quantity:1,price:1,fee:2}]),/fee exceeds proceeds/);
});
