import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const html=readFileSync(new URL('../virtual-staged-sales.html',import.meta.url),'utf8');
test('standalone staged sale screen uses the pure planner without DB writes',()=>{
 assert.match(html,/staged-sale-planner\.mjs/);
 assert.match(html,/planStagedSales\(/);
 assert.doesNotMatch(html,/supabase\.from\(|\.insert\(|\.update\(|\.delete\(|\.rpc\(/);
});
test('staged sale UI exposes target price, shares, cash and tax disclaimer',()=>{
 for(const key of ['ticker','quantity','basis','cash','terminal','reserve','price','shares','fee'])assert.ok(html.includes(key),key);
 assert.match(html,/양도세/);
 assert.match(html,/현금 비중/);
 assert.match(html,/잔여 주식/);
 assert.match(html,/보유 유지/);
});
