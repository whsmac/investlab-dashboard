import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const html=readFileSync(new URL('../virtual-trade-simulator.html',import.meta.url),'utf8');
test('virtual trading screen is explicitly read-only and uses local scenario engine',()=>{
 assert.match(html,/src\/simulator\/scenario-comparison\.mjs/);
 assert.match(html,/compareScenarios\(/);
 assert.match(html,/실제 원장을 읽거나 변경하지 않습니다/);
 assert.doesNotMatch(html,/supabase\.co|\.from\(|\.insert\(|\.update\(|\.delete\(/);
});
test('scenario UI includes cash, holdings, trades, valuation and tax disclaimer',()=>{
 for(const id of ['cash','positions','terminal','trades','calculate','summary','steps','holdings','status'])assert.match(html,new RegExp('id="'+id+'"'));
 assert.match(html,/예상 양도세/);
 assert.match(html,/미계산/);
 assert.match(html,/거래 단계별 변화/);
});
