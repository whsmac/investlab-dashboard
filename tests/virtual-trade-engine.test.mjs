import test from 'node:test';
import assert from 'node:assert/strict';
import {simulateTrades} from '../src/simulator/virtual-trade-engine.mjs';

test('staged sale creates cash and preserves remaining shares', () => {
  const original={cash:100,positions:{TSLA:{quantity:10,averageCost:200}}};
  const result=simulateTrades(original,[{side:'sell',ticker:'TSLA',quantity:2,price:300,fee:2},{side:'sell',ticker:'TSLA',quantity:3,price:350,fee:3}]);
  assert.equal(result.final.cash,1745);
  assert.equal(result.final.positions.TSLA.quantity,5);
  assert.equal(result.final.realizedPnL,645);
  assert.equal(original.positions.TSLA.quantity,10);
  assert.equal(result.steps.length,2);
});
test('bear-market reentry increases shares after sale', () => {
  const result=simulateTrades({cash:0,positions:{TSLA:{quantity:10,averageCost:100}}},[
    {side:'sell',ticker:'TSLA',quantity:5,price:200},
    {side:'buy',ticker:'TSLA',quantity:10,price:100}
  ]);
  assert.equal(result.final.positions.TSLA.quantity,15);
  assert.equal(result.final.cash,0);
  assert.equal(result.final.realizedPnL,500);
});
test('rotation between tickers is sequential and funded', () => {
  const result=simulateTrades({cash:0,positions:{TSLA:{quantity:10,averageCost:100}}},[
    {side:'sell',ticker:'TSLA',quantity:5,price:200},
    {side:'buy',ticker:'SOXL',quantity:20,price:50},
    {side:'sell',ticker:'SOXL',quantity:20,price:60},
    {side:'buy',ticker:'TSLA',quantity:12,price:100}
  ]);
  assert.equal(result.final.positions.TSLA.quantity,17);
  assert.equal(result.final.positions.SOXL.quantity,0);
  assert.equal(result.final.cash,0);
  assert.equal(result.final.realizedPnL,700);
  assert.equal(result.taxStatus,'not_calculated');
});
test('fees affect buy basis and sell proceeds', () => {
  const result=simulateTrades({cash:1000,positions:{}},[
    {side:'buy',ticker:'TSLA',quantity:2,price:100,fee:2},
    {side:'sell',ticker:'TSLA',quantity:1,price:150,fee:1}
  ]);
  assert.equal(result.final.positions.TSLA.averageCost,101);
  assert.equal(result.final.realizedPnL,48);
  assert.equal(result.final.cash,947);
});
test('rejects unfunded buys and oversells', () => {
  assert.throws(()=>simulateTrades({cash:10,positions:{}},[{side:'buy',ticker:'TSLA',quantity:1,price:20}]),/insufficient cash/);
  assert.throws(()=>simulateTrades({cash:10,positions:{}},[{side:'sell',ticker:'TSLA',quantity:1,price:20}]),/insufficient shares/);
});
test('rejects malformed inputs and never mutates portfolio', () => {
  assert.throws(()=>simulateTrades({cash:10,positions:{}},[{side:'buy',ticker:'TSLA',quantity:-1,price:20}]),/nonnegative/);
  assert.throws(()=>simulateTrades({cash:10,positions:{}},[{side:'buy',ticker:'TSLA',quantity:1,price:20,fee:-1}]),/nonnegative/);
  assert.throws(()=>simulateTrades({cash:10,positions:{}},[{side:'buy',ticker:'TSLA',quantity:1,price:NaN}]),/finite/);
});
