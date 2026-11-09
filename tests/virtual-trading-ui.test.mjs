import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const html=readFileSync(new URL('../virtual-trading.html',import.meta.url),'utf8');
test('standalone UI uses pure comparison module and never loads Supabase',()=>{
 assert.match(html,/import \{compareScenarios\}/);
 assert.doesNotMatch(html,/supabase-js|createClient\(|\.from\(|\.rpc\(/);
});
test('staged sale, dip reentry, and per-trade cash are visible',()=>{
 for(const id of ['bull','bear','trades','cash','summary','results','terminal','altTerminal'])assert.match(html,new RegExp('id="'+id+'"'));
 assert.match(html,/cumulativeRealizedPnL/);
 assert.match(html,/deltaVsHold/);
});
test('tax exclusion is disclosed and failure hides previous results',()=>{
 assert.match(html,/양도세는 계산하지 않습니다/);
 assert.match(html,/세후 자산이 아닙니다/);
 assert.match(html,/\$\('output'\)\.hidden=true/);
});
