import test from 'node:test';
import assert from 'node:assert/strict';
import {compareScenarios} from '../src/simulator/scenario-comparison.mjs';

test('sell TSLA and buy previously unheld SOXL; compare holdings, cash and total value',()=>{
 const initial={cash:1000,positions:{TSLA:{quantity:20,averageCost:100}}};
 const prices={TSLA:150,SOXL:60};
 const result=compareScenarios(initial,[{name:'종목 전환',trades:[
  {side:'sell',ticker:'TSLA',quantity:10,price:120},
  {side:'buy',ticker:'SOXL',quantity:20,price:40}
 ]}],prices);
 const s=result.scenarios[0];
 assert.equal(s.final.positions.TSLA.quantity,10);
 assert.equal(s.final.positions.SOXL.quantity,20);
 assert.equal(s.final.cash,1400);
 assert.equal(s.terminalValue,4100);
 assert.equal(result.baseline.terminalValue,4000);
 assert.equal(s.deltaVsHold,100);
 assert.equal(initial.positions.TSLA.quantity,20);
 assert.equal(initial.positions.SOXL,undefined);
});
test('rejects buying without sufficient cash and selling without holdings',()=>{
 const p={cash:100,positions:{TSLA:{quantity:2,averageCost:50}}};
 assert.throws(()=>compareScenarios(p,[{name:'현금 부족',trades:[{side:'buy',ticker:'SOXL',quantity:5,price:30}]}],{TSLA:50,SOXL:30}),/insufficient cash/);
 assert.throws(()=>compareScenarios(p,[{name:'주식 부족',trades:[{side:'sell',ticker:'TSLA',quantity:3,price:50}]}],{TSLA:50}),/insufficient shares/);
});
