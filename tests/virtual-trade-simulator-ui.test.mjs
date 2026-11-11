import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const html=readFileSync(new URL('../virtual-trade-simulator.html',import.meta.url),'utf8');

test('simulator uses read-only portfolio adapters and local scenario engine',()=>{
 assert.match(html,/src\/simulator\/scenario-comparison\.mjs/);
 assert.match(html,/src\/simulator\/portfolio-positions\.mjs/);
 assert.match(html,/compareScenarios\(/);
 assert.match(html,/readPortfolioPositions\(window\.localStorage\)/);
 assert.match(html,/readPortfolioUsdCash\(window\.localStorage\)/);
 assert.match(html,/실제 포트폴리오와 매매원장은 변경하지 않습니다/);
 assert.doesNotMatch(html,/supabase\.co|supabaseClient\.from\(|\.insert\(|\.update\(|\.delete\(|localStorage\.setItem\(/);
});

test('phase-1 UI exposes holdings, editable trades, terminal prices and comparison',()=>{
 for(const id of ['cash','positionEditor','priceEditor','strategyEditor','positions','terminal','trades','calculate','summary','finalValuation','strategyHoldings','steps','holdings','status']){
  assert.match(html,new RegExp('id="'+id+'"'));
 }
 assert.match(html,/기준 포트폴리오 합계/);
 assert.match(html,/최종 가정 주가/);
 assert.match(html,/최종 가상 포트폴리오 상세/);
 assert.match(html,/전략별 종목 수량·평가금액 변화/);
 assert.match(html,/양도세 추정/);
 assert.match(html,/원화 기준 손익/);
});

test('initial scenario has no fictional holdings, cash or executed trades',()=>{
 assert.match(html,/const portfolioState=\{positions:\[\],prices:\[\]\}/);
 assert.match(html,/strategyState=\[\{name:'가상 거래 1',trades:\[\]\}\]/);
 assert.match(html,/id="cash"[^>]*value=""/);
 assert.match(html,/price:valid\?Number\(raw\):''/);
 assert.match(html,/portfolioState\.prices\.push\(\{ticker,price:''\}\)/);
});
