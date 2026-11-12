import test from 'node:test';
import assert from 'node:assert/strict';
import {simulateTrades} from '../src/simulator/virtual-trade-engine.mjs';
import {compareScenarios} from '../src/simulator/scenario-comparison.mjs';

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

test('four-step rotation tracks funded cash, fees, cost basis and realized gains at every step', () => {
  const original={cash:50,positions:{TSLA:{quantity:10,averageCost:100}}};
  const trades=[
    {side:'sell',ticker:'TSLA',quantity:3,price:200,fee:3},
    {side:'buy',ticker:'SOXL',quantity:10,price:40,fee:2},
    {side:'sell',ticker:'SOXL',quantity:4,price:55,fee:1},
    {side:'buy',ticker:'TSLA',quantity:2,price:110,fee:2}
  ];
  const result=simulateTrades(original,trades);
  assert.deepEqual(result.steps.map(step=>step.cash),[647,245,464,242]);
  assert.deepEqual(result.steps.map(step=>step.cumulativeRealizedPnL),[297,297,355.2,355.2]);
  assert.deepEqual(result.steps.map(step=>step.positions.TSLA.quantity),[7,7,7,9]);
  assert.deepEqual(result.steps.map(step=>step.positions.SOXL?.quantity??0),[0,10,6,6]);
  assert.equal(result.final.positions.SOXL.averageCost,40.2);
  assert.ok(Math.abs(result.final.positions.TSLA.averageCost-102.44444444)<1e-7);
  assert.equal(result.final.cash,242);
  assert.equal(result.final.realizedPnL,355.2);
  assert.deepEqual(original,{cash:50,positions:{TSLA:{quantity:10,averageCost:100}}},'Virtual simulation must not mutate the real portfolio');
  assert.equal(result.taxStatus,'not_calculated','The trade engine must not present USD gains as calculated KRW tax');
});

test('scenario comparison identifies the exact failing trade and strategy without changing holdings', () => {
 const portfolio={cash:10,positions:{TSLA:{quantity:2,averageCost:100}}};
 const cases=[
  {trades:[{side:'buy',ticker:'SOXL',quantity:1,price:20}],reason:'insufficient cash',ticker:'SOXL'},
  {trades:[{side:'sell',ticker:'TSLA',quantity:3,price:150}],reason:'insufficient shares',ticker:'TSLA'}
 ];
 for(const item of cases){
  assert.throws(()=>compareScenarios(portfolio,[{name:'불가능한 전략',trades:item.trades}],{TSLA:150,SOXL:20}),error=>{
   assert.equal(error.message,'scenario trade unavailable');
   assert.equal(error.scenarioName,'불가능한 전략');
   assert.equal(error.tradeIndex,0);
   assert.equal(error.ticker,item.ticker);
   assert.equal(error.reason,item.reason);
   return true;
  });
 }
 assert.equal(portfolio.cash,10);
 assert.equal(portfolio.positions.TSLA.quantity,2);
});

test('buy fees reduce affordable shares and never allow negative cash at the boundary', () => {
 const portfolio={cash:100,positions:{}};
 const funded=simulateTrades(portfolio,[{side:'buy',ticker:'SOXL',quantity:9,price:10,fee:5}]);
 assert.equal(funded.final.cash,5);
 assert.equal(funded.final.positions.SOXL.quantity,9);
 assert.equal(funded.final.positions.SOXL.averageCost,95/9);
 assert.equal(funded.steps[0].fee,5);
 assert.throws(()=>simulateTrades(portfolio,[{side:'buy',ticker:'SOXL',quantity:10,price:10,fee:5}]),/insufficient cash at 0/);
 assert.deepEqual(portfolio,{cash:100,positions:{}},'A rejected buy must not mutate the starting portfolio');
});

test('sell fees reduce the next buy budget and reserved cash survives a fee-charged rotation', () => {
 const portfolio={cash:100,positions:{TSLA:{quantity:2,averageCost:100}}};
 const steps=[
  {side:'sell',ticker:'TSLA',quantity:2,price:200,fee:5},
  {side:'buy',ticker:'SOXL',quantity:9,price:30,fee:5}
 ];
 const result=simulateTrades(portfolio,steps);
 assert.equal(result.steps[0].cash,495,'Sale proceeds must be net of fee');
 assert.equal(result.steps[1].cash,220,'Buy fee must be deducted from cash');
 assert.equal(result.final.positions.SOXL.averageCost,275/9,'Buy fee must enter average acquisition cost');
 assert.equal(result.final.realizedPnL,195,'Sale fee must reduce realized gains');
 assert.throws(()=>simulateTrades(portfolio,[steps[0],{side:'buy',ticker:'SOXL',quantity:10,price:30,fee:200}]),/insufficient cash at 1/);
 assert.equal(portfolio.positions.TSLA.quantity,2);
});
