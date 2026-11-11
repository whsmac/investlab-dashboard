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
 assert.match(html,/시나리오 매도별 자동 원화 실현손익/);
});

test('initial scenario has no fictional holdings, cash or executed trades',()=>{
 assert.match(html,/const portfolioState=\{positions:\[\],prices:\[\]\}/);
 assert.match(html,/strategyState=\[\{name:'가상 거래 1',trades:\[\]\}\]/);
 assert.match(html,/id="cash"[^>]*value=""/);
 assert.match(html,/price:valid\?Number\(raw\):''/);
 assert.match(html,/portfolioState\.prices\.push\(\{ticker,price:''\}\)/);
});


test('phase-1 trade editor excludes fees and retains distinct execution and terminal prices',()=>{
 assert.match(html,/\['구분','종목코드','수량 \(주\)','체결가 \(\$\)',''\]/);
 assert.match(html,/\['quantity','price'\]/);
 assert.match(html,/price:Number\(value\('price'\)\)/);
 assert.doesNotMatch(html,/data-field=['"]fee|\['fee','수수료|\['price','가격 USD'\],\['fee'/);
 assert.match(html,/최종 가정 주가/);
 assert.match(html,/trades:s\.trades\.map\(\(\{fee,\.\.\.trade\}\)=>trade\)/);
});


test('buy helper uses preceding trades and target reserve without changing sell trades',()=>{
 assert.match(html,/마지막 매수 후 남길 목표 현금 \(USD\)/);
 assert.match(html,/매수 가능 최대 수량 계산/);
 assert.match(html,/strategy\.trades\.slice\(0,ti\)/);
 assert.match(html,/simulateTrades\(\{cash:Number\(cashValue\),positions\},previous\)\.final\.cash/);
 assert.match(html,/Math\.floor\(\(budget\+1e-9\)\/price\)/);
 assert.match(html,/helper\.hidden=trade\.side!=='buy'/);
});


test('target cash reserve is entered once per strategy and reused for buy calculations',()=>{
 assert.match(html,/reserve\.value=String\(strategy\.targetCash\?\?0\)/);
 assert.match(html,/strategy\.targetCash=reserve\.value/);
 assert.match(html,/const price=Number\(trade\.price\),target=isFinalBuy\?Number\(reserve\.value\):0/);
 assert.match(html,/helper\.append\(auto,info\)/);
 assert.doesNotMatch(html,/helper\.append\(reserveLabel,reserve,auto,info\)/);
});


test('reserve applies to final buy only, allowing earlier leveraged ETF buy to use all cash',()=>{
 assert.match(html,/const finalBuyIndex=strategy\.trades\.findLastIndex\(t=>t\.side==='buy'\)/);
 assert.match(html,/const isFinalBuy=ti===finalBuyIndex/);
 assert.match(html,/target=isFinalBuy\?Number\(reserve\.value\):0/);
 assert.match(html,/중간 매수 \(목표 현금 미적용\)/);
 assert.match(html,/최종 매수 \(목표 현금 적용\)/);
});


test('buy calculator is visually hidden for sell trades despite flex styling',()=>{
 assert.match(html,/\.buy-helper\[hidden\]\{display:none!important\}/);
 assert.match(html,/helper\.hidden=trade\.side!=='buy'/);
 assert.match(html,/helper\.hidden=side\.value!=='buy'/);
});


test('tax is estimated automatically from each sell trade in USD using user FX',()=>{
 assert.match(html,/id="taxFx"/);
 assert.match(html,/step\.tradePnL\*fx/);
 assert.match(html,/estimateOverseasStockTax\(/);
 assert.match(html,/id="deduction"[^>]*min="0"/);
 assert.doesNotMatch(html,/id="taxExample"|renderTaxForm\(/);
});
