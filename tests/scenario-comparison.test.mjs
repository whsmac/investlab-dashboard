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
 assert.throws(()=>compareScenarios(portfolio,[{name:'x',trades:[{side:'buy',ticker:'SOXL',quantity:1,price:100}]}],{TSLA:100,SOXL:100}),error=>error.message==='scenario trade unavailable'&&error.reason==='insufficient cash'&&error.scenarioName==='x'&&error.tradeIndex===0&&error.ticker==='SOXL');
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

test('phase-1 integrated real-style holdings, cash and rotation comparison',()=>{
 const original={cash:2500,positions:{
  TSLA:{quantity:222,averageCost:385.2},
  BITU:{quantity:160,averageCost:14},
  TQQQ:{quantity:283,averageCost:72.3}
 }};
 const saved=structuredClone(original);
 const result=compareScenarios(original,[{name:'TSLA 일부 매도 후 SOXL 매수',trades:[
  {side:'sell',ticker:'TSLA',quantity:10,price:400},
  {side:'buy',ticker:'SOXL',quantity:20,price:50}
 ]}],{TSLA:390,BITU:16,TQQQ:80,SOXL:60});
 const scenario=result.scenarios[0];
 assert.equal(result.baseline.terminalValue,114280);
 assert.equal(scenario.final.cash,5500);
 assert.equal(scenario.final.positions.TSLA.quantity,212);
 assert.equal(scenario.final.positions.SOXL.quantity,20);
 assert.equal(scenario.terminalValue,114580);
 assert.equal(scenario.deltaVsHold,300);
 assert.equal(scenario.steps[0].cash,6500);
 assert.equal(scenario.steps[1].cash,5500);
 assert.deepEqual(original,saved);
});

test('transaction fees can reverse pretax strategy ranking without changing actual holdings',()=>{
 const original={cash:100,positions:{TSLA:{quantity:2,averageCost:100}}};
 const before=structuredClone(original);
 const result=compareScenarios(original,[
  {name:'저수수료',trades:[{side:'sell',ticker:'TSLA',quantity:1,price:200,fee:1},{side:'buy',ticker:'SOXL',quantity:5,price:30,fee:1}]},
  {name:'고수수료',trades:[{side:'sell',ticker:'TSLA',quantity:1,price:200,fee:15},{side:'buy',ticker:'SOXL',quantity:5,price:30,fee:15}]}
 ],{TSLA:150,SOXL:40});
 assert.equal(result.baseline.terminalValue,400);
 assert.deepEqual(result.scenarios.map(s=>s.terminalValue),[498,470]);
 assert.deepEqual(result.scenarios.map(s=>s.deltaVsHold),[98,70]);
 assert.deepEqual(result.scenarios.map(s=>s.final.cash),[148,120]);
 assert.deepEqual(result.scenarios.map(s=>s.final.positions.SOXL.quantity),[5,5]);
 assert.deepEqual(result.scenarios.map(s=>s.final.realizedPnL),[99,85]);
 assert.deepEqual(original,before,'Scenario comparison must never write to actual holdings');
});

test('fee-bearing saved-style trade objects retain valuation and cash when re-compared',()=>{
 const original={cash:100,positions:{TSLA:{quantity:2,averageCost:100}}};
 const scenarios=[{name:'수수료 저장',trades:[{side:'sell',ticker:'TSLA',quantity:1,price:200,fee:5},{side:'buy',ticker:'SOXL',quantity:3,price:30,fee:2}]}];
 const before=compareScenarios(original,scenarios,{TSLA:150,SOXL:40});
 const restored=JSON.parse(JSON.stringify(scenarios));
 const after=compareScenarios(original,restored,{TSLA:150,SOXL:40});
 assert.deepEqual(after,before);
 assert.equal(after.scenarios[0].final.cash,203);
 assert.equal(after.scenarios[0].terminalValue,473);
});
