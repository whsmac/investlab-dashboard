import test from 'node:test';
import assert from 'node:assert/strict';
import {simulateTrades,compareHoldVsScenario} from '../src/simulator/trade-simulator.mjs';
test('bear-market sell and rebuy increases shares while leaving original input unchanged',()=>{
 const input={cash:0,positions:{TSLA:{quantity:10,averageCost:200}},trades:[
 {date:'2026-11-10',symbol:'TSLA',side:'sell',quantity:5,price:300,fee:5},
 {date:'2026-11-20',symbol:'TSLA',side:'buy',quantity:7,price:200,fee:5}
 ]};
 const r=simulateTrades(input);
 assert.equal(r.final.positions.TSLA.quantity,12);
 assert.equal(r.final.cash,90);
 assert.equal(r.realizedPnL,495);
 assert.equal(input.positions.TSLA.quantity,10);
 assert.equal(r.taxEstimate,null);
 assert.equal(r.steps[0].after.cash,1495);
});
test('bull-market staged sales track cash and remaining shares',()=>{
 const trades=[300,350,400].map((price,i)=>({date:'2026-11-'+(10+i),symbol:'TSLA',side:'sell',quantity:2,price,fee:0}));
 const r=simulateTrades({cash:0,positions:{TSLA:{quantity:10,averageCost:200}},trades});
 assert.equal(r.final.positions.TSLA.quantity,4);
 assert.equal(r.final.cash,2100);
 assert.equal(r.realizedPnL,900);
});
test('rotation between ordinary and leveraged tickers tracks actual share counts',()=>{
 const r=simulateTrades({cash:0,positions:{TSLA:{quantity:10,averageCost:200}},trades:[
 {date:'2026-11-10',symbol:'TSLA',side:'sell',quantity:5,price:300},
 {date:'2026-11-11',symbol:'TSLL',side:'buy',quantity:50,price:20},
 {date:'2026-11-20',symbol:'TSLL',side:'sell',quantity:50,price:25},
 {date:'2026-11-21',symbol:'TSLA',side:'buy',quantity:5,price:300}
 ]});
 assert.equal(r.final.positions.TSLA.quantity,10);
 assert.equal(r.final.positions.TSLL.quantity,0);
 assert.equal(r.final.cash,250);
});
test('hold comparison values both strategies at the same final prices',()=>{
 const r=compareHoldVsScenario({cash:0,positions:{TSLA:{quantity:10,averageCost:200}},trades:[
 {date:'2026-11-10',symbol:'TSLA',side:'sell',quantity:5,price:300}
 ]},{TSLA:200});
 assert.equal(r.holdValue,2000);
 assert.equal(r.scenarioValue,2500);
 assert.equal(r.difference,500);
});
test('rejects overselling, overspending, out-of-order trades, and invalid inputs',()=>{
 const base={cash:100,positions:{TSLA:{quantity:1,averageCost:200}}};
 const trade=(side,quantity,price,date='2026-11-10')=>({date,symbol:'TSLA',side,quantity,price});
 assert.throws(()=>simulateTrades({...base,trades:[trade('sell',2,300)]}),/more shares/);
 assert.throws(()=>simulateTrades({...base,trades:[trade('buy',1,300)]}),/Insufficient/);
 assert.throws(()=>simulateTrades({...base,trades:[trade('sell',1,300,'2026-11-11'),trade('buy',1,100,'2026-11-10')]}),/chronological/);
 assert.throws(()=>simulateTrades({...base,trades:[trade('sell',1,300,'2026-02-30')]}),/Invalid date/);
 assert.throws(()=>simulateTrades({...base,trades:[{...trade('sell',1,300),fee:301}]}),/fee exceeds/);
});
