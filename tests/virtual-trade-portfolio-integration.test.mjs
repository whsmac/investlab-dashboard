import test from 'node:test';
import assert from 'node:assert/strict';
import {compareScenarios} from '../src/simulator/scenario-comparison.mjs';

test('TSLA sale funds new SOXL purchase; cash, quantities and totals reconcile',()=>{
 const initial={cash:1000,positions:{TSLA:{quantity:10,averageCost:100},TQQQ:{quantity:2,averageCost:50}}};
 const prices={TSLA:120,TQQQ:60,SOXL:45};
 const {baseline,scenarios}=compareScenarios(initial,[{name:'TSLA→SOXL',trades:[
  {side:'sell',ticker:'TSLA',quantity:4,price:110,fee:0},
  {side:'buy',ticker:'SOXL',quantity:20,price:40,fee:0},
  {side:'sell',ticker:'SOXL',quantity:10,price:50,fee:0}
 ]}],prices);
 const s=scenarios[0];
 assert.equal(baseline.terminalValue,2320);
 assert.equal(s.final.cash,1140);
 assert.equal(s.final.positions.TSLA.quantity,6);
 assert.equal(s.final.positions.SOXL.quantity,10);
 assert.equal(s.final.positions.TQQQ.quantity,2);
 assert.equal(s.final.realizedPnL,140);
 assert.equal(s.terminalValue,2430);
 assert.equal(s.deltaVsHold,110);
 assert.equal(initial.positions.TSLA.quantity,10);
});
test('cannot sell shares not held or buy without cash',()=>{
 const p={cash:100,positions:{TSLA:{quantity:1,averageCost:50}}};
 assert.throws(()=>compareScenarios(p,[{name:'invalid sell',trades:[{side:'sell',ticker:'SOXL',quantity:1,price:20}]}],{TSLA:60,SOXL:20}),/insufficient shares/);
 assert.throws(()=>compareScenarios(p,[{name:'invalid buy',trades:[{side:'buy',ticker:'SOXL',quantity:10,price:20}]}],{TSLA:60,SOXL:20}),/insufficient cash/);
});
