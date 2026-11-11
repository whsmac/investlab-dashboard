import test from 'node:test';
import assert from 'node:assert/strict';
import {compareScenarios} from '../src/simulator/scenario-comparison.mjs';
const portfolio={cash:0,positions:{TSLA:{quantity:10,averageCost:100}}};
test('compare dip buyback with buy-and-hold at common terminal price',()=>{
 const result=compareScenarios(portfolio,[{name:'sell and rebuy',trades:[
  {side:'sell',ticker:'TSLA',quantity:5,price:200},
  {side:'buy',ticker:'TSLA',quantity:10,price:100}
 ]}],{TSLA:150});
 assert.equal(result.baseline.terminalValue,1500);
 assert.equal(result.scenarios[0].terminalValue,2250);
 assert.equal(result.scenarios[0].deltaVsHold,750);
 assert.equal(result.scenarios[0].final.positions.TSLA.quantity,15);
 assert.equal(result.taxStatus,'not_calculated');
 assert.equal(portfolio.positions.TSLA.quantity,10);
});
test('compare leveraged rotation with hold using separate terminal prices',()=>{
 const result=compareScenarios(portfolio,[{name:'rotation',trades:[
  {side:'sell',ticker:'TSLA',quantity:5,price:200},
  {side:'buy',ticker:'SOXL',quantity:20,price:50}
 ]}],{TSLA:150,SOXL:40});
 assert.equal(result.scenarios[0].terminalValue,1550);
 assert.equal(result.scenarios[0].deltaVsHold,50);
});
test('reject missing terminal prices, duplicate names and unfunded trades',()=>{
 assert.throws(()=>compareScenarios(portfolio,[{name:'x',trades:[]}],{}),/terminal price/);
 assert.throws(()=>compareScenarios(portfolio,[{name:'x',trades:[]},{name:'x',trades:[]}],{TSLA:100}),/unique/);
 assert.throws(()=>compareScenarios(portfolio,[{name:'x',trades:[{side:'buy',ticker:'SOXL',quantity:1,price:100}]}],{TSLA:100,SOXL:100}),/insufficient cash/);
});

test('empty trade scenario matches unchanged portfolio and keeps original untouched',()=>{
 const original={cash:500,positions:{TSLA:{quantity:2,averageCost:100},TQQQ:{quantity:3,averageCost:20}}};
 const before=structuredClone(original);
 const result=compareScenarios(original,[{name:'no changes',trades:[]}],{TSLA:150,TQQQ:40});
 assert.equal(result.baseline.terminalValue,920);
 assert.equal(result.scenarios[0].terminalValue,920);
 assert.equal(result.scenarios[0].deltaVsHold,0);
 assert.deepEqual(original,before);
});
test('sale then buy different ticker compares share changes and cash',()=>{
 const original={cash:100,positions:{TSLA:{quantity:10,averageCost:100}}};
 const result=compareScenarios(original,[{name:'rotation',trades:[
  {side:'sell',ticker:'TSLA',quantity:2,price:200},
  {side:'buy',ticker:'SOXL',quantity:10,price:30}
 ]}],{TSLA:150,SOXL:40});
 assert.equal(result.baseline.terminalValue,1600);
 assert.equal(result.scenarios[0].terminalValue,1800);
 assert.equal(result.scenarios[0].deltaVsHold,200);
 assert.equal(result.scenarios[0].final.cash,200);
 assert.equal(result.scenarios[0].final.positions.TSLA.quantity,8);
 assert.equal(result.scenarios[0].final.positions.SOXL.quantity,10);
});
