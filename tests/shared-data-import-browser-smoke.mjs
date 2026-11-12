import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,stat} from 'node:fs/promises';
import {extname,resolve,sep} from 'node:path';
import {chromium} from 'playwright';
const root=resolve(process.cwd());
const server=createServer(async(req,res)=>{
  try{
    const pathname=decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname);
    const file=resolve(root,'.'+pathname);
    if(file!==root&&!file.startsWith(root+sep))throw Error('Forbidden');
    if(!(await stat(file)).isFile())throw Error('Not found');
    res.writeHead(200,{'content-type':extname(file)==='.html'?'text/html; charset=utf-8':'text/javascript; charset=utf-8'});
    res.end(await readFile(file));
  }catch{res.writeHead(404);res.end('Not found');}
});
await new Promise(done=>server.listen(0,'127.0.0.1',done));
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
const page=await browser.newPage();
const errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.route('https://cdn.jsdelivr.net/**',route=>route.abort());
try{
  await page.goto('http://127.0.0.1:'+server.address().port+'/shared-data-import.html');
  await page.locator('h1').getByText('TEST 데이터 CSV 가져오기').waitFor();
  assert.equal(await page.locator('#commit').isDisabled(),true);
  await page.locator('#file').setInputFiles({name:'sample.csv',mimeType:'text/csv',buffer:Buffer.from('date,ticker,close\n2026-11-06,TSLA,299.12\n')});
  await page.locator('#validate').click();
  assert.match(await page.locator('#result').innerText(),/먼저 연결/);
  assert.equal(await page.locator('#commit').isDisabled(),true);
  assert.match(await page.locator('#authState').innerText(),/연결 실패/);
  assert.deepEqual(errors,[]);
  console.log('TEST CSV import UI browser smoke passed: no credentials, no writes, no JS errors.');
}finally{await browser.close();await new Promise(done=>server.close(done));}
