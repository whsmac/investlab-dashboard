import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,stat} from 'node:fs/promises';
import {resolve,sep,extname} from 'node:path';
import {chromium} from 'playwright';

const root=resolve(process.cwd());
const server=createServer(async(req,res)=>{
 try{
  const pathname=decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname);
  const path=resolve(root,'.'+pathname);
  if(path!==root&&!path.startsWith(root+sep))throw Error('Forbidden');
  if(!(await stat(path)).isFile())throw Error('Not found');
  res.writeHead(200,{'content-type':extname(path)==='.html'?'text/html; charset=utf-8':'text/javascript; charset=utf-8'});
  res.end(await readFile(path));
 }catch{res.writeHead(404);res.end('Not found');}
});
await new Promise(done=>server.listen(0,'127.0.0.1',done));
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
const page=await browser.newPage();
const errors=[];
await page.route('https://open.er-api.com/v6/latest/USD',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({result:'success',base_code:'USD',rates:{KRW:1341.693922},time_last_update_unix:Math.floor(Date.now()/1000)})}));
async function calculateAndWait(){await page.locator('#calculate').click();await page.waitForFunction(()=>!document.querySelector('#calculate').disabled);}

const remoteRequests=[];
page.on('request',request=>{if(/supabase\.co/i.test(request.url()))remoteRequests.push(request.url());});
page.on('pageerror',e=>errors.push(e.message));
try{
 await page.goto('http://127.0.0.1:'+server.address().port+'/virtual-trade-simulator.html');
 await page.evaluate(()=>{
  localStorage.setItem('investlab_holdings',JSON.stringify([
   {symbol:'TSLA',shares:10,avg_cost:100,price:150},
   {symbol:'USD-CASH',shares:100,avg_cost:1,price:1}
  ]));
  localStorage.setItem('investlab_watchlist',JSON.stringify(['SOXL']));
 });
 await page.reload();
 assert.equal(await page.locator('#cash').inputValue(),'100');
 assert.match(await page.locator('#managedSymbolStatus').innerText(),/종목/);
 assert.equal(await page.locator('#managedSymbolOptions option[value="SOXL"]').count(),1,'Watchlist ticker should appear in symbol suggestions');
 // Missing market price must not break import; user supplies the terminal assumption.
 await page.evaluate(()=>{
  localStorage.setItem('investlab_holdings',JSON.stringify([
   {symbol:'TSLA',shares:10,avg_cost:100},
   {symbol:'USD-CASH',shares:100,avg_cost:1}
  ]));
 });
 await page.reload();
 assert.match(await page.locator('#positionLoadStatus').innerText(),/1개 종목/);
 assert.equal(await page.locator('#priceEditor input[aria-label="최종가격"]').first().inputValue(),'');
 assert.match(await page.locator('#initialValuation').innerText(),/합계 계산 대기/);
 await page.locator('#priceEditor input[aria-label="최종가격"]').first().fill('150');
 assert.equal(JSON.parse(await page.locator('#terminal').inputValue()).TSLA,150,'Advanced JSON should reflect a valid price edit');

 assert.match(await page.locator('#positionLoadStatus').innerText(),/1개 종목/);
 assert.equal(await page.locator('#positionEditor input[aria-label="수량"]').first().inputValue(),'10');
 await page.locator('#strategyEditor .strategy-card button').last().click();
 const trade=page.locator('#strategyEditor .trade-grid').first();
 await trade.locator('[data-field="side"]').selectOption('sell');
 await trade.locator('[data-field="ticker"]').fill('TSLA');
 await trade.locator('[data-field="quantity"]').fill('2');
 await trade.locator('[data-field="price"]').fill('200');
 await calculateAndWait();
 assert.match(await page.locator('#status').innerText(),/계산 완료/);
 assert.equal(await page.locator('#positionCompareTitle').isVisible(),true);
 const quantityRows=await page.locator('#positionCompare table tr').allTextContents();
 assert.match(quantityRows.find(line=>line.includes('TSLA'))||'',/10.*8.*-2/);
 assert.equal(quantityRows.some(line=>line.includes('SOXL')),false,'SOXL is not held before its buy trade');
 await page.locator('.result-details summary').click();
 assert.match(await page.locator('#finalValuation').innerText(),/TSLA/);
 assert.match(await page.locator('#finalValuation').textContent(),/8/);
 // Complete the requested rotation: sell TSLA, then buy watchlisted SOXL.
 await page.locator('#strategyEditor .strategy-card button').last().click();
 const second=page.locator('#strategyEditor .trade-grid').nth(1);
 await second.locator('[data-field="side"]').selectOption('buy');
 await second.locator('[data-field="ticker"]').fill('SOXL');
 await second.locator('[data-field="quantity"]').fill('10');
 await second.locator('[data-field="price"]').fill('30');
 await calculateAndWait();
 // The first calculation intentionally requests a terminal assumption for the new ticker.
 assert.match(await page.locator('#status').innerText(),/SOXL/);
 assert.doesNotMatch(await page.locator('#status').innerText(),/계산 완료/,'Missing price must not report success');
 assert.equal(await page.locator('#summary').innerText(),'','Missing price must clear previous results');
 await page.locator('#priceEditor .simple-row').last().locator('input[aria-label="최종가격"]').fill('40');
 await calculateAndWait();
 assert.match(await page.locator('#status').innerText(),/계산 완료/);
 assert.equal(JSON.parse(await page.locator('#terminal').inputValue()).SOXL,40,'Advanced terminal JSON must reflect the new ticker price');
 assert.match(await page.locator('#finalValuation').textContent(),/SOXL/);
 assert.match(await page.locator('#finalValuation').textContent(),/1,800|1800/);
 const summaryRows=await page.locator('#summary table tr').allTextContents();
 const row=label=>summaryRows.find(line=>line.includes(label))||'';
 assert.match(row('최종 현금'),/100.*200/);
 assert.match(row('최종 평가총액'),/1,600.*1,800/);
 assert.match(row('보유 대비 평가 차이'),/200/);
 const valuationRows=await page.locator('#finalValuation table').first().locator('tr').allTextContents();
 assert.match(valuationRows.find(line=>line.includes('TSLA'))||'',/10.*8/);
 assert.match(valuationRows.find(line=>line.includes('SOXL'))||'',/0.*10/);
 assert.deepEqual(await page.evaluate(()=>JSON.parse(localStorage.getItem('investlab_watchlist'))),['SOXL']);
 assert.equal(await page.evaluate(()=>localStorage.getItem('investlab_past_symbols')),null,'Simulation must not create or modify symbol history');
 const summary=await page.locator('#summary').innerText();
 assert.match(summary,/최종 현금/);
 assert.match(summary,/200/);
 assert.match(summary,/1,800|1800/);
 const afterCash=await page.locator('#cash').inputValue();
 assert.equal(afterCash,'100','Starting cash input remains unchanged by simulation');
 const stored=await page.evaluate(()=>JSON.parse(localStorage.getItem('investlab_holdings')));
 assert.equal(stored[0].shares,10,'Virtual trades must not mutate actual holdings');
 // Verify comma formatting, zero deduction, and one FX snapshot per calculation.
 await page.locator('#priorTax').fill('1234567');
 assert.equal(await page.locator('#priorTax').inputValue(),'1,234,567');
 await page.locator('#deduction').fill('0');
 assert.equal(await page.locator('#deduction').inputValue(),'0');
 await calculateAndWait();
 assert.match(await page.locator('#status').innerText(),/계산 완료/);
 assert.equal(await page.locator('#taxFx').inputValue(),'1,342');
 assert.match(await page.locator('#taxGainEditor').innerText(),/268,339/);
 // A failed exchange-rate request must remove all previous financial results.
 await page.route('https://open.er-api.com/v6/latest/USD',route=>route.fulfill({status:503,body:'Service unavailable'}));
 await calculateAndWait();
 assert.match(await page.locator('#status').innerText(),/계산 중단/);
 assert.match(await page.locator('#fxStatus').innerText(),/환율 자동 조회 실패/);
 assert.equal(await page.locator('#taxFx').inputValue(),'');
 for(const id of ['summary','finalValuation','taxBasis','taxGainEditor','resultHero']){
  assert.equal(await page.locator('#'+id).innerText(),'','FX failure must clear stale '+id);
 }
 assert.equal(await page.locator('#positionCompareTitle').isVisible(),false);
 await page.unroute('https://open.er-api.com/v6/latest/USD');
 await page.route('https://open.er-api.com/v6/latest/USD',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({result:'success',base_code:'USD',rates:{KRW:1341.693922},time_last_update_unix:Math.floor(Date.now()/1000)})}));
 await calculateAndWait();
 assert.match(await page.locator('#status').innerText(),/계산 완료/);
 // Reject stale exchange-rate data rather than silently reusing a prior rate.
 await page.unroute('https://open.er-api.com/v6/latest/USD');
 await page.route('https://open.er-api.com/v6/latest/USD',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({result:'success',base_code:'USD',rates:{KRW:1341.693922},time_last_update_unix:Math.floor(Date.now()/1000)-172801})}));
 await calculateAndWait();
 assert.match(await page.locator('#fxStatus').innerText(),/48시간보다 오래/);
 assert.match(await page.locator('#status').innerText(),/계산 중단/);
 assert.equal(await page.locator('#summary').innerText(),'');
 assert.equal(await page.locator('#taxFx').inputValue(),'');
 // Network policy or DNS failure is reported separately from an HTTP server error.
 await page.unroute('https://open.er-api.com/v6/latest/USD');
 await page.route('https://open.er-api.com/v6/latest/USD',route=>route.abort('failed'));
 await calculateAndWait();
 assert.match(await page.locator('#fxStatus').innerText(),/네트워크 정책 문제/);
 assert.equal(await page.locator('#summary').innerText(),'');
 await page.unroute('https://open.er-api.com/v6/latest/USD');
 await page.route('https://open.er-api.com/v6/latest/USD',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({result:'success',base_code:'USD',rates:{KRW:1341.693922},time_last_update_unix:Math.floor(Date.now()/1000)})}));
 await calculateAndWait();
 assert.match(await page.locator('#status').innerText(),/계산 완료/);
 // A hung FX request must time out, clear results, and allow a later retry.
 await page.unroute('https://open.er-api.com/v6/latest/USD');
 await page.route('https://open.er-api.com/v6/latest/USD',async route=>{
  await new Promise(resolve=>setTimeout(resolve,12000));
  try{await route.fulfill({status:200,contentType:'application/json',body:'{}'});}catch{}
 });
 await page.locator('#calculate').click();
 await page.waitForFunction(()=>document.querySelector('#status').textContent.includes('계산 중단'),{timeout:11000});
 assert.match(await page.locator('#fxStatus').innerText(),/8초 내 환율 서버 응답/);
 assert.equal(await page.locator('#summary').innerText(),'');
 assert.equal(await page.locator('#calculate').isDisabled(),false);
 await page.unroute('https://open.er-api.com/v6/latest/USD');
 await page.route('https://open.er-api.com/v6/latest/USD',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({result:'success',base_code:'USD',rates:{KRW:1341.693922},time_last_update_unix:Math.floor(Date.now()/1000)})}));
 await calculateAndWait();
 assert.match(await page.locator('#status').innerText(),/계산 완료/);
 // Reject an oversell without changing original holdings or leaving a success message.
 await trade.locator('[data-field="quantity"]').fill('999');
 await calculateAndWait();
 assert.doesNotMatch(await page.locator('#status').innerText(),/계산 완료/);
 assert.equal(await page.locator('#summary').innerText(),'','Invalid oversell must clear the previous successful summary');
 assert.equal(await page.locator('#finalValuation').textContent(),'','Invalid oversell must clear stale terminal valuation');
 assert.equal((await page.evaluate(()=>JSON.parse(localStorage.getItem('investlab_holdings'))))[0].shares,10);
 // Reject a buy larger than available cash, without altering real portfolio data.
 await trade.locator('[data-field="quantity"]').fill('2');
 await second.locator('[data-field="quantity"]').fill('999');
 await calculateAndWait();
 assert.doesNotMatch(await page.locator('#status').innerText(),/계산 완료/,'Insufficient cash must not report success');
 assert.equal(await page.locator('#summary').innerText(),'','Insufficient cash must clear stale results');
 assert.equal((await page.evaluate(()=>JSON.parse(localStorage.getItem('investlab_holdings'))))[0].shares,10);
 assert.deepEqual(remoteRequests,[],'Simulation must not contact Supabase');
 assert.deepEqual(errors,[]);
 console.log('Simulator browser smoke passed: real holdings, cash, sell, valuation, no writes.');
}finally{
 await browser.close();
 await new Promise(done=>server.close(done));
}
