import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {planStagedSales} from '../src/simulator/staged-sale-planner.mjs';
const html=readFileSync(new URL('../virtual-staged-sale.html',import.meta.url),'utf8');
test('staged-sale page imports the tested pure planner and never writes to Supabase',()=>{
 assert.match(html,/import \{planStagedSales\} from '\.\/src\/simulator\/staged-sale-planner\.mjs'/);
 assert.match(html,/id="targets"/);
 assert.match(html,/id="reserve"/);
 assert.match(html,/id="output"/);
 assert.doesNotMatch(html,/supabase\.from\(|\.insert\(|\.upsert\(|\.delete\(|fetch\(/i);
});
test('staged-sale sample scenario reaches reserve while preserving original portfolio',()=>{
 const original={cash:0,positions:{TSLA:{quantity:10,averageCost:100}}};
 const result=planStagedSales(original,{ticker:'TSLA',targets:[
 {price:150,quantity:2,fee:0},{price:200,quantity:2,fee:0},{price:250,quantity:1,fee:0}
 ],terminalPrices:{TSLA:300},reserveCash:1000});
 assert.equal(result.final.positions.TSLA.quantity,5);
 assert.equal(result.final.cash,950);
 assert.equal(result.meetsReserveTarget,false);
 assert.equal(result.steps[2].reserveCashShortfall,50);
 assert.equal(original.positions.TSLA.quantity,10);
});
