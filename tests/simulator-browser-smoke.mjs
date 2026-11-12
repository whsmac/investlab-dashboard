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
let fxRequestCount=0;
page.on('request',request=>{if(request.url()==='https://open.er-api.com/v6/latest/USD')fxRequestCount++;});
async function calculateAndWait(){const before=fxRequestCount;await page.locator('#calculate').click();await page.waitForFunction(()=>!document.querySelector('#calculate').disabled);assert.equal(fxRequestCount,before+1,'Each calculation must fetch exactly one USD/KRW snapshot');}

const remoteRequests=[];
page.on('request',request=>{if(/supabase\.co/i.test(request.url()))remoteRequests.push(request.url());});
page.on('pageerror',e=>errors.push(e.message));
try{
 await page.goto('http://127.0.0.1:'+server.address().port+'/virtual-trade-simulator.html');
 assert.match(await page.locator('body').innerText(),/저장된 전략 불러오기는 현재 편집 중인 전략을 교체하므로, 유지할 내용은 먼저 저장하세요/);
 // Malformed local saved-strategy JSON must be reported, never silently erased.
 await page.evaluate(()=>localStorage.setItem('investlab_simulator_saved_scenarios_v1','{broken-json'));
 await page.reload();
 assert.match(await page.locator('#scenarioStorageStatus').innerText(),/저장된 전략 데이터가 손상되었습니다/);
 assert.equal(await page.evaluate(()=>localStorage.getItem('investlab_simulator_saved_scenarios_v1')),'{broken-json');
 await page.locator('#scenarioName').fill('손상 저장소 테스트');
 await page.locator('#saveScenario').click();
 assert.match(await page.locator('#scenarioStorageStatus').innerText(),/저장 작업 실패/);
 assert.equal(await page.evaluate(()=>localStorage.getItem('investlab_simulator_saved_scenarios_v1')),'{broken-json');
 // Structurally valid JSON with an invalid trade must not replace the editor or be erased.
 const invalidSaved=JSON.stringify({'잘못된 거래':[{name:'손상된 전략',trades:[{side:'sell',ticker:'TSLA',quantity:-2,price:100}]}]});
 await page.evaluate(value=>localStorage.setItem('investlab_simulator_saved_scenarios_v1',value),invalidSaved);
 await page.reload();
 const editorBeforeInvalid=await page.locator('#strategyEditor .strategy-card').first().locator('.strategy-name').inputValue();
 await page.locator('#savedScenarioList').selectOption('잘못된 거래');
 await page.locator('#loadScenario').click();
 assert.match(await page.locator('#scenarioStorageStatus').innerText(),/거래 데이터가 유효하지 않습니다/);
 assert.equal(await page.locator('#strategyEditor .strategy-card').first().locator('.strategy-name').inputValue(),editorBeforeInvalid);
 assert.equal(await page.evaluate(()=>localStorage.getItem('investlab_simulator_saved_scenarios_v1')),invalidSaved);
 await page.locator('#appendScenario').click();
 assert.match(await page.locator('#scenarioStorageStatus').innerText(),/거래 데이터가 유효하지 않습니다/);
 assert.equal(await page.locator('#strategyEditor .strategy-card').count(),1);
 assert.equal(await page.evaluate(()=>localStorage.getItem('investlab_simulator_saved_scenarios_v1')),invalidSaved);
 await page.evaluate(()=>localStorage.removeItem('investlab_simulator_saved_scenarios_v1'));
 await page.reload();
 for(const id of ['savedScenarioList','loadScenario','appendScenario','deleteScenario'])assert.equal(await page.locator('#'+id).isDisabled(),true,'Empty saved list must disable '+id);
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
 // Editing an assumption must immediately invalidate the previous success and FX snapshot.
 await page.locator('#priorTax').fill('1234567');
 assert.equal(await page.locator('#summary').innerText(),'','Editing assumptions must immediately clear stale results');
 assert.equal(await page.locator('#taxFx').inputValue(),'','Editing assumptions must clear the old FX snapshot');
 assert.match(await page.locator('#status').innerText(),/세금 가정값이 변경되었습니다/);
 // Verify comma formatting, zero deduction, and one FX snapshot per calculation.
 await page.locator('#priorTax').fill('1234567');
 assert.equal(await page.locator('#priorTax').inputValue(),'1,234,567');
 await page.locator('#deduction').fill('0');
 assert.equal(await page.locator('#deduction').inputValue(),'0');
 await calculateAndWait();
 assert.match(await page.locator('#status').innerText(),/계산 완료/);
 assert.equal(await page.locator('#taxFx').inputValue(),'1,342');
 assert.match(await page.locator('#taxGainEditor').innerText(),/268,339/);
 // Editing tax assumptions must not leave an outdated tax estimate labeled as current.
 await page.locator('#deduction').fill('1000000');
 assert.equal(await page.locator('#deduction').inputValue(),'1,000,000');
 assert.match(await page.locator('#status').innerText(),/다시 실행/);
 for(const id of ['taxBasis','taxStages','taxGainEditor'])assert.equal(await page.locator('#'+id).innerText(),'','Changed deduction must invalidate '+id);
 await page.locator('#deduction').fill('0');
 await calculateAndWait();
 assert.match(await page.locator('#taxGainEditor').innerText(),/268,339/);
 // Pending FX lookup must immediately invalidate prior results, not just after failure.
 await page.route('https://open.er-api.com/v6/latest/USD',async route=>{
  await new Promise(resolve=>setTimeout(resolve,900));
  try{await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({result:'success',base_code:'USD',rates:{KRW:1341.693922},time_last_update_unix:Math.floor(Date.now()/1000)})});}catch{}
 });
 await page.locator('#calculate').click();
 assert.equal(await page.locator('#calculate').isDisabled(),true);
 assert.match(await page.locator('#status').innerText(),/계산 대기/);
 assert.equal(await page.locator('#summary').innerText(),'','Pending FX must clear previous summary immediately');
 assert.equal(await page.locator('#taxGainEditor').innerText(),'','Pending FX must clear previous tax results immediately');
 assert.equal(await page.locator('#taxFx').inputValue(),'');
 await page.waitForFunction(()=>document.querySelector('#status').textContent.includes('계산 완료'),null,{timeout:5000});
 assert.match(await page.locator('#summary').innerText(),/최종 현금/);
 await page.unroute('https://open.er-api.com/v6/latest/USD');
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
 // Reject malformed, zero and future-dated FX data without reusing an old rate.
 for(const [payload,expected] of [
  [{result:'success',base_code:'USD',rates:{},time_last_update_unix:Math.floor(Date.now()/1000)},/유효하지 않습니다/],
  [{result:'success',base_code:'USD',rates:{KRW:0},time_last_update_unix:Math.floor(Date.now()/1000)},/유효하지 않습니다/],
  [{result:'success',base_code:'USD',rates:{KRW:1341.69},time_last_update_unix:Math.floor(Date.now()/1000)+7200},/갱신 시각이 유효하지 않거나/]
 ]){
  await page.unroute('https://open.er-api.com/v6/latest/USD');
  await page.route('https://open.er-api.com/v6/latest/USD',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(payload)}));
  await calculateAndWait();
  assert.match(await page.locator('#fxStatus').innerText(),expected);
  assert.match(await page.locator('#status').innerText(),/계산 중단/);
  assert.equal(await page.locator('#taxFx').inputValue(),'');
  assert.equal(await page.locator('#summary').innerText(),'');
 }
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
 await page.waitForFunction(()=>document.querySelector('#status').textContent.includes('계산 중단'),null,{timeout:11000});
 assert.match(await page.locator('#fxStatus').innerText(),/8초 내 환율 서버 응답/);
 assert.equal(await page.locator('#summary').innerText(),'');
 assert.equal(await page.locator('#calculate').isDisabled(),false);
 await page.unroute('https://open.er-api.com/v6/latest/USD');
 await page.route('https://open.er-api.com/v6/latest/USD',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({result:'success',base_code:'USD',rates:{KRW:1341.693922},time_last_update_unix:Math.floor(Date.now()/1000)})}));
 await calculateAndWait();
 assert.match(await page.locator('#status').innerText(),/계산 완료/);
 // Editing a tax assumption while the FX request is in flight must invalidate that calculation.
 await page.unroute('https://open.er-api.com/v6/latest/USD');
 await page.route('https://open.er-api.com/v6/latest/USD',async route=>{
  await new Promise(resolve=>setTimeout(resolve,350));
  await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({result:'success',base_code:'USD',rates:{KRW:1341.693922},time_last_update_unix:Math.floor(Date.now()/1000)})});
 });
 await page.locator('#calculate').click();
 await page.locator('#deduction').fill('1000000');
 await page.waitForFunction(()=>!document.querySelector('#calculate').disabled);
 assert.match(await page.locator('#fxStatus').innerText(),/입력값이 변경되었습니다/);
 assert.match(await page.locator('#fxStatus').innerText(),/계산 취소/);
 assert.doesNotMatch(await page.locator('#fxStatus').innerText(),/환율 자동 조회 실패/,'Editing inputs must not be classified as an FX outage');
 assert.match(await page.locator('#status').innerText(),/계산 중단: 환율 조회 중 시나리오 입력값이 변경되었습니다/);
 assert.doesNotMatch(await page.locator('#status').innerText(),/연결 상태를 확인/,'Input edits must not be misreported as network errors');
 assert.equal(await page.locator('#summary').innerText(),'','In-flight edits must not leave a calculated result');
 await page.unroute('https://open.er-api.com/v6/latest/USD');
 await page.route('https://open.er-api.com/v6/latest/USD',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({result:'success',base_code:'USD',rates:{KRW:1341.693922},time_last_update_unix:Math.floor(Date.now()/1000)})}));
 await calculateAndWait();
 assert.match(await page.locator('#status').innerText(),/계산 완료/);
 // Reject an oversell without changing original holdings or leaving a success message.
 await trade.locator('[data-field="quantity"]').fill('999');
 await calculateAndWait();
 assert.doesNotMatch(await page.locator('#status').innerText(),/계산 완료/);
 assert.equal(await page.locator('#summary').innerText(),'','Invalid oversell must clear the previous successful summary');
 assert.equal(await page.locator('#taxGainEditor').innerText(),'','Invalid oversell must clear stale realized-gain tax rows');
 assert.equal(await page.locator('#finalValuation').textContent(),'','Invalid oversell must clear stale terminal valuation');
 assert.equal((await page.evaluate(()=>JSON.parse(localStorage.getItem('investlab_holdings'))))[0].shares,10);
 // Reject a buy larger than available cash, without altering real portfolio data.
 await trade.locator('[data-field="quantity"]').fill('2');
 await second.locator('[data-field="quantity"]').fill('999');
 await calculateAndWait();
 assert.doesNotMatch(await page.locator('#status').innerText(),/계산 완료/,'Insufficient cash must not report success');
 assert.equal(await page.locator('#summary').innerText(),'','Insufficient cash must clear stale results');
 assert.equal(await page.locator('#taxGainEditor').innerText(),'','Insufficient cash must clear stale tax rows');
 assert.equal((await page.evaluate(()=>JSON.parse(localStorage.getItem('investlab_holdings'))))[0].shares,10);
 // Programmatic strategy edits (button clicks) must invalidate a previously successful result.
 await trade.locator('[data-field="quantity"]').fill('2');
 await second.locator('[data-field="quantity"]').fill('1');
 await calculateAndWait();
 assert.match(await page.locator('#status').innerText(),/계산 완료/);
 await page.locator('#addStrategy').click();
 assert.match(await page.locator('#status').innerText(),/입력값이 변경되었습니다/);
 assert.equal(await page.locator('#summary').innerText(),'');
 assert.equal(await page.locator('#taxFx').inputValue(),'');
 await calculateAndWait();
 assert.match(await page.locator('#status').innerText(),/계산 완료/);
 await page.locator('#strategyEditor .strategy-card').last().getByRole('button',{name:'전략 삭제'}).click();
 assert.match(await page.locator('#status').innerText(),/입력값이 변경되었습니다/);
 assert.equal(await page.locator('#summary').innerText(),'');
 // Persist only virtual strategies across reload; do not touch actual holdings.
 const holdingsBeforeSave=await page.evaluate(()=>localStorage.getItem('investlab_holdings'));
 await page.locator('#scenarioName').fill('TSLA 재매수 검증');
 await page.locator('#saveScenario').click();
 assert.match(await page.locator('#scenarioStorageStatus').innerText(),/저장했습니다/);
 for(const id of ['savedScenarioList','loadScenario','appendScenario','deleteScenario'])assert.equal(await page.locator('#'+id).isEnabled(),true,'Saving must enable '+id);
 const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('investlab_simulator_saved_scenarios_v1')));
 assert.ok(saved['TSLA 재매수 검증']);
 // Simulate a browser storage quota failure: keep the saved version and
 // unsaved editor changes intact rather than reporting a false success.
 const savedBeforeQuota=await page.evaluate(()=>localStorage.getItem('investlab_simulator_saved_scenarios_v1'));
 const quotaEditor=page.locator('#strategyEditor .strategy-card').first().locator('.strategy-name');
 await quotaEditor.fill('저장 공간 부족 테스트');
 await page.evaluate(()=>{
  const original=Storage.prototype.setItem;
  window.__restoreStorageSetItem=()=>{Storage.prototype.setItem=original;};
  Storage.prototype.setItem=function(key,value){
   if(key==='investlab_simulator_saved_scenarios_v1')throw new DOMException('Storage quota exceeded','QuotaExceededError');
   return original.call(this,key,value);
  };
 });
 try{
  page.once('dialog',dialog=>dialog.accept());
  await page.locator('#saveScenario').click();
  assert.match(await page.locator('#scenarioStorageStatus').innerText(),/저장 공간이 부족해 전략을 저장하지 못했습니다.*현재 편집 내용과 기존 저장 전략은 유지됩니다/);
  assert.equal(await page.evaluate(()=>localStorage.getItem('investlab_simulator_saved_scenarios_v1')),savedBeforeQuota,'Quota failure must preserve saved data');
  assert.equal(await quotaEditor.inputValue(),'저장 공간 부족 테스트','Quota failure must preserve unsaved editor edits');
 }finally{
  await page.evaluate(()=>window.__restoreStorageSetItem());
 }
 // An existing name must never overwrite a saved strategy without consent.
 const originalSaved=await page.evaluate(()=>localStorage.getItem('investlab_simulator_saved_scenarios_v1'));
 const nameField=page.locator('#strategyEditor .strategy-card').first().locator('.strategy-name');
 const beforeOverwriteName=await nameField.inputValue();
 await nameField.fill('덮어쓰기 확인용 수정');
 page.once('dialog',dialog=>{assert.match(dialog.message(),/덮어쓰시겠습니까/);return dialog.dismiss();});
 await page.locator('#saveScenario').click();
 assert.equal(await page.evaluate(()=>localStorage.getItem('investlab_simulator_saved_scenarios_v1')),originalSaved,'Declining overwrite must preserve saved data');
 assert.equal(await nameField.inputValue(),'덮어쓰기 확인용 수정','Declining overwrite must preserve editor changes');
 page.once('dialog',dialog=>dialog.accept());
 await page.locator('#saveScenario').click();
 const overwritten=await page.evaluate(()=>JSON.parse(localStorage.getItem('investlab_simulator_saved_scenarios_v1')));
 assert.equal(overwritten['TSLA 재매수 검증'][0].name,'덮어쓰기 확인용 수정','Accepting overwrite must save edited strategy');
 assert.equal(Object.keys(overwritten).length,1,'Overwrite must not create a duplicate saved entry');
 await nameField.fill(beforeOverwriteName);
 page.once('dialog',dialog=>dialog.accept());
 await page.locator('#saveScenario').click();
 assert.equal(await page.evaluate(()=>localStorage.getItem('investlab_holdings')),holdingsBeforeSave);
 // A saved scenario can be appended to the current comparison without modifying portfolio data.
 await page.locator('#appendScenario').click();
 assert.equal(await page.locator('#strategyEditor .strategy-card').count(),2);
 await calculateAndWait();
 assert.match(await page.locator('#status').innerText(),/계산 완료/);
 assert.equal(await page.locator('#allStrategyTitle').isVisible(),true);
 assert.equal(await page.locator('#strategyRanking').isVisible(),true);
 assert.match(await page.locator('#strategyRanking').innerText(),/세전 평가총액 1위.*추가 예상세액 반영 1위.*두 기준의 1위가 (같습니다|다릅니다)/);
 const overview=await page.locator('#allStrategySummary').innerText();
 for(const label of ['최종 현금 USD','최종 평가총액 USD','누적 실현손익 USD','추가 예상 양도세 KRW'])assert.ok(overview.includes(label));
 assert.match(overview,/보유 대비 차이 \(%\)/);
 for(const label of ['추가 예상세액 환산 USD','세금 반영 추정 평가총액 USD','세금 반영 보유 대비 차이 USD'])assert.ok(overview.includes(label));
 assert.match(overview,/세액은 가상 현금에서 실제 차감하지 않으며/);
 assert.match(overview,/추가 예상세액이 음수이면 기존 연간 예상세액 감소를 뜻할 뿐 즉시 환급되는 현금이 아닙니다/);
 assert.equal(await page.locator('#allStrategySummary .strategy-overview-table').count(),1);
 assert.match(await page.locator('#scenarioStorageStatus').innerText(),/비교 목록에 추가했습니다/);
 assert.equal(await page.evaluate(()=>localStorage.getItem('investlab_holdings')),holdingsBeforeSave);
 // Appending the same saved strategy creates identical alternatives: both
 // pretax and incremental-tax-adjusted rankings must report a shared first place.
 const tiedRanking=await page.locator('#strategyRanking').innerText();
 assert.match(tiedRanking,/세전 평가총액 1위 \(공동 2개\)/);
 assert.match(tiedRanking,/추가 예상세액 반영 1위 \(공동 2개\)/);
 assert.match(tiedRanking,/두 기준의 1위가 같습니다/);
 // Editing any strategy assumption invalidates the previously calculated ranks.
 const originalName=await page.locator('#strategyEditor .strategy-card').first().locator('.strategy-name').inputValue();
 await page.locator('#strategyEditor .strategy-card').first().locator('.strategy-name').fill(originalName+' 변경');
 assert.equal(await page.locator('#strategyRanking').isVisible(),false);
 assert.equal(await page.locator('#strategyRanking').innerText(),'');
 await page.locator('#strategyEditor .strategy-card').first().locator('.strategy-name').fill(originalName);
 await calculateAndWait();
 assert.match(await page.locator('#status').innerText(),/계산 완료/);
 // Ranking inversion: strategy B has $5 more pretax value but realizes an extra
 // $500 gain, so its estimated incremental tax makes strategy A the net leader.
 const firstStrategyName=await page.locator('#strategyEditor .strategy-card').first().locator('.strategy-name').inputValue();
 const secondStrategy=page.locator('#strategyEditor .strategy-card').nth(1);
 await secondStrategy.locator('.strategy-name').fill('세전 우세·세후 열세');
 for(const [side,ticker,quantity,price] of [
  ['sell','TSLA','5','200'],
  ['buy','TSLA','5','199']
 ]){
  await page.locator('#strategyEditor .strategy-card').nth(1).getByRole('button',{name:'+ 거래 추가'}).click();
  const newTrade=page.locator('#strategyEditor .strategy-card').nth(1).locator('.trade-grid').last();
  await newTrade.locator('[data-field="side"]').selectOption(side);
  await newTrade.locator('[data-field="ticker"]').fill(ticker);
  await newTrade.locator('[data-field="quantity"]').fill(quantity);
  await newTrade.locator('[data-field="price"]').fill(price);
 }
 await calculateAndWait();
 assert.match(await page.locator('#status').innerText(),/계산 완료/);
 const invertedRanking=await page.locator('#strategyRanking').innerText();
 assert.match(invertedRanking,/세전 평가총액 1위.*세전 우세·세후 열세/);
 assert.ok(invertedRanking.split('추가 예상세액 반영 1위')[1]?.includes(firstStrategyName),'Net valuation leader should be the first strategy');
 assert.match(invertedRanking,/두 기준의 1위가 다릅니다/);
 // Check numerical consistency across the rendered strategy overview, tax and FX.
 const comparisonCells=await page.locator('#allStrategySummary .strategy-overview-table tr').evaluateAll(rows=>
  rows.map(row=>[...row.querySelectorAll('th,td')].map(cell=>cell.textContent.trim()))
 );
 const comparisonRow=label=>{
  const found=comparisonCells.find(cells=>cells[0]===label);
  assert.ok(found,'Missing comparison row: '+label);
  return found;
 };
 const numeric=value=>Number(value.replaceAll(',','').replaceAll('+','').replaceAll('%',''));
 const pretax=comparisonRow('최종 평가총액 USD');
 const incrementalKrw=comparisonRow('추가 예상 양도세 KRW');
 const incrementalUsd=comparisonRow('추가 예상세액 환산 USD');
 const adjusted=comparisonRow('세금 반영 추정 평가총액 USD');
 const difference=comparisonRow('보유 대비 차이 USD');
 const adjustedDifference=comparisonRow('세금 반영 보유 대비 차이 USD');
 const fxRate=Number((await page.locator('#taxFx').inputValue()).replaceAll(',',''));
 assert.ok(Number.isFinite(fxRate)&&fxRate>0);
 for(let col=2;col<pretax.length;col++){
  assert.ok(Math.abs(numeric(incrementalKrw[col])/fxRate-numeric(incrementalUsd[col]))<1.1,'USD tax conversion mismatch for strategy '+col);
  assert.ok(Math.abs(numeric(pretax[col])-numeric(incrementalKrw[col])/fxRate-numeric(adjusted[col]))<1.1,'Net valuation mismatch for strategy '+col);
  assert.ok(Math.abs(numeric(difference[col])-numeric(incrementalKrw[col])/fxRate-numeric(adjustedDifference[col]))<1.1,'Net delta mismatch for strategy '+col);
 }
 assert.ok(numeric(pretax[3])>numeric(pretax[2]),'Second strategy should win pretax valuation');
 assert.ok(numeric(adjusted[3])<numeric(adjusted[2]),'First strategy should win tax-adjusted valuation');
 // A loss-making disposal can reduce the estimated annual tax, but cannot
 // deposit a cash refund into the virtual account.
 await page.locator('#priorTax').fill('5,000,000');
 await page.locator('#strategyEditor .strategy-card').first().locator('.trade-grid').first().locator('[data-field="price"]').fill('50');
 await calculateAndWait();
 assert.match(await page.locator('#status').innerText(),/계산 완료/);
 const lossRows=await page.locator('#allStrategySummary .strategy-overview-table tr').evaluateAll(rows=>
  rows.map(row=>[...row.querySelectorAll('th,td')].map(cell=>cell.textContent.trim()))
 );
 const lossRow=label=>{
  const row=lossRows.find(cells=>cells[0]===label);
  assert.ok(row,'Missing loss scenario row: '+label);
  return row;
 };
 const lossTax=numeric(lossRow('추가 예상 양도세 KRW')[2]);
 const lossPretax=numeric(lossRow('최종 평가총액 USD')[2]);
 const lossAdjusted=numeric(lossRow('세금 반영 추정 평가총액 USD')[2]);
 const lossCash=numeric(lossRow('최종 현금 USD')[2]);
 assert.ok(lossTax<0,'Loss sale must lower prior annual estimated tax');
 assert.ok(lossAdjusted>lossPretax,'Negative incremental tax must raise comparison-only adjusted valuation');
 assert.ok(Math.abs(lossCash-170)<0.01,'Virtual cash must reflect trades only, without any tax refund');
 assert.match(await page.locator('#allStrategySummary').innerText(),/즉시 환급되는 현금이 아닙니다/);
 // With no prior realized gains and a deduction above these hypothetical gains,
 // all strategies must show zero incremental tax and unchanged adjusted values.
 await page.locator('#priorTax').fill('0');
 await page.locator('#deduction').fill('2,500,000');
 await calculateAndWait();
 assert.match(await page.locator('#status').innerText(),/계산 완료/);
 const zeroRows=await page.locator('#allStrategySummary .strategy-overview-table tr').evaluateAll(rows=>
  rows.map(row=>[...row.querySelectorAll('th,td')].map(cell=>cell.textContent.trim()))
 );
 const zeroRow=label=>{
  const row=zeroRows.find(cells=>cells[0]===label);
  assert.ok(row,'Missing zero-tax row: '+label);
  return row;
 };
 const zeroTax=zeroRow('추가 예상 양도세 KRW');
 const zeroPretax=zeroRow('최종 평가총액 USD');
 const zeroAdjusted=zeroRow('세금 반영 추정 평가총액 USD');
 for(let col=2;col<zeroTax.length;col++){
  assert.equal(numeric(zeroTax[col]),0,'Zero-tax scenario must have no incremental tax');
  assert.ok(Math.abs(numeric(zeroPretax[col])-numeric(zeroAdjusted[col]))<0.01,'Zero tax must leave adjusted valuation unchanged');
 }
 // Crossing the deduction with a positive disposal must create a different
 // incremental tax across strategies without changing the starting portfolio.
 await page.locator('#deduction').fill('0');
 await calculateAndWait();
 assert.match(await page.locator('#status').innerText(),/계산 완료/);
 const mixedRows=await page.locator('#allStrategySummary .strategy-overview-table tr').evaluateAll(rows=>
  rows.map(row=>[...row.querySelectorAll('th,td')].map(cell=>cell.textContent.trim()))
 );
 const mixedTax=mixedRows.find(cells=>cells[0]==='추가 예상 양도세 KRW');
 assert.ok(mixedTax,'Missing mixed tax row');
 assert.notEqual(numeric(mixedTax[2]),numeric(mixedTax[3]),'Distinct realized gains should produce different incremental taxes');
 assert.equal(await page.evaluate(()=>localStorage.getItem('investlab_holdings')),holdingsBeforeSave);
 // Removing a comparison alternative must clear both rankings and the table;
 // recalculating with only one alternative must not resurrect stale comparisons.
 await page.locator('#strategyEditor .strategy-card').last().getByRole('button',{name:'전략 삭제'}).click();
 assert.equal(await page.locator('#strategyEditor .strategy-card').count(),1);
 assert.equal(await page.locator('#strategyRanking').isVisible(),false);
 assert.equal(await page.locator('#strategyRanking').innerText(),'');
 assert.equal(await page.locator('#allStrategySummary').innerText(),'');
 assert.equal(await page.locator('#allStrategyTitle').isVisible(),false);
 await calculateAndWait();
 assert.match(await page.locator('#status').innerText(),/계산 완료/);
 assert.equal(await page.locator('#strategyRanking').isVisible(),false);
 assert.equal(await page.locator('#allStrategySummary .strategy-overview-table').count(),0);
 assert.equal(await page.locator('#allStrategyTitle').isVisible(),false);
 assert.equal(await page.evaluate(()=>localStorage.getItem('investlab_holdings')),holdingsBeforeSave);
 await page.reload();
 await page.locator('#savedScenarioList').selectOption('TSLA 재매수 검증');
 const originalEditorName=await page.locator('#strategyEditor .strategy-card').first().locator('.strategy-name').inputValue();
 await page.locator('#strategyEditor .strategy-card').first().locator('.strategy-name').fill('저장하지 않은 변경');
 page.once('dialog',dialog=>{assert.match(dialog.message(),/현재 편집 중인 전략이 교체됩니다/);return dialog.dismiss();});
 await page.locator('#loadScenario').click();
 assert.match(await page.locator('#scenarioStorageStatus').innerText(),/불러오기를 취소했습니다/);
 assert.equal(await page.locator('#strategyEditor .strategy-card').first().locator('.strategy-name').inputValue(),'저장하지 않은 변경');
 page.once('dialog',dialog=>dialog.accept());
 await page.locator('#loadScenario').click();
 assert.match(await page.locator('#scenarioStorageStatus').innerText(),/불러왔습니다/);
 assert.notEqual(await page.locator('#strategyEditor .strategy-card').first().locator('.strategy-name').inputValue(),'저장하지 않은 변경');
 assert.equal(await page.locator('#strategyEditor .strategy-card').count(),1);
 // Saved scenarios deliberately exclude terminal price assumptions: re-enter after reload.
 for(const row of await page.locator('#priceEditor .simple-row').all()){
  const symbol=await row.locator('input[aria-label="종목"]').inputValue();
  if(symbol==='TSLA')await row.locator('input[aria-label="최종가격"]').fill('150');
  if(symbol==='SOXL')await row.locator('input[aria-label="최종가격"]').fill('40');
 }
 await calculateAndWait();
 assert.match(await page.locator('#status').innerText(),/계산 완료/);
 const savedBeforeDelete=await page.evaluate(()=>localStorage.getItem('investlab_simulator_saved_scenarios_v1'));
 const editorBeforeDelete=await page.locator('#strategyEditor .strategy-card').first().locator('.strategy-name').inputValue();
 page.once('dialog',dialog=>{assert.match(dialog.message(),/저장된 전략을 삭제하시겠습니까/);return dialog.dismiss();});
 await page.locator('#deleteScenario').click();
 assert.equal(await page.evaluate(()=>localStorage.getItem('investlab_simulator_saved_scenarios_v1')),savedBeforeDelete,'Cancelling deletion must preserve saved strategies');
 assert.equal(await page.locator('#savedScenarioList option').count(),1);
 assert.equal(await page.locator('#strategyEditor .strategy-card').first().locator('.strategy-name').inputValue(),editorBeforeDelete);
 page.once('dialog',dialog=>dialog.accept());
 await page.locator('#deleteScenario').click();
 assert.match(await page.locator('#scenarioStorageStatus').innerText(),/삭제했습니다/);
 assert.equal(await page.locator('#strategyEditor .strategy-card').first().locator('.strategy-name').inputValue(),editorBeforeDelete,'Deleting saved scenario must not remove active editor strategy');
 assert.equal(await page.locator('#savedScenarioList option').count(),0);
 for(const id of ['savedScenarioList','loadScenario','appendScenario','deleteScenario'])assert.equal(await page.locator('#'+id).isDisabled(),true,'Deleting last saved scenario must disable '+id);
 assert.equal(await page.evaluate(()=>localStorage.getItem('investlab_holdings')),holdingsBeforeSave);
 assert.deepEqual(remoteRequests,[],'Simulation must not contact Supabase');
 assert.deepEqual(errors,[]);
 console.log('Simulator browser smoke passed: real holdings, cash, sell, valuation, no writes.');
}finally{
 await browser.close();
 await new Promise(done=>server.close(done));
}
