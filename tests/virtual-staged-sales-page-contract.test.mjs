import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const html=readFileSync(new URL('../virtual-staged-sales.html',import.meta.url),'utf8');
test('staged-sale page uses the real pure simulation module',()=>{
 assert.match(html,/staged-sale-planner\.mjs/);
 assert.match(html,/planStagedSales/);
});
test('staged-sale page presents cash, shares and tax limitations',()=>{
 assert.match(html,/현금/);
 assert.match(html,/주식|수량|잔여/);
 assert.match(html,/양도세|세금/);
});
test('staged-sale page is local-only without database mutation',()=>{
 assert.doesNotMatch(html,/\.from\s*\(|\.insert\s*\(|\.update\s*\(|\.delete\s*\(|supabase\.rpc\s*\(/i);
});
