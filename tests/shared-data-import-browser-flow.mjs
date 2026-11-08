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
await page.addInitScript(()=>{
  localStorage.setItem('investlab_shared_data_connection_v1',JSON.stringify({url:'https://gopofxyezhwpfbxebcrxd.supabase.co',key:'sb_publishable_mock'}));
  window.confirm=()=>true;
});
await page.route('https://cdn.jsdelivr.net/**',route=>route.fulfill({status:200,contentType:'text/javascript',body:`
window.__writes=[];
window.supabase={createClient:()=>({
  auth:{getUser:async()=>({data:{user:{id:'owner-test'}},error:null})},
  from:(name)=>({
    select:()=>name==='companies'
      ?Promise.resolve({data:[{id:1,ticker:'TSLA'}],error:null})
      :{eq:()=>({in:async()=>({data:[],error:null})})}
  }),
  rpc:async(name,args)=>{window.__writes.push({name,args});return {data:{status:'committed',accepted_count:args.p_rows.length,batch_id:42},error:null};}
})};`}));
try{
  await page.goto('http://127.0.0.1:'+server.address().port+'/shared-data-import.html');
  await page.waitForFunction(() => document.getElementById('authState').textContent.includes('로그인 확인됨'));
  await page.locator('#file').setInputFiles({name:'prices.csv',mimeType:'text/csv',buffer:Buffer.from('date,ticker,close\n2026-11-06,TSLA,299.12\n')});
  await page.locator('#validate').click();
  await page.waitForFunction(() => document.getElementById('result').textContent.includes('사전 검증 성공'));
  assert.equal(await page.evaluate(()=>window.__writes.length),0,'dry-run must not write');
  assert.equal(await page.locator('#commit').isDisabled(),true);
  await page.locator('#confirm').check();
  assert.equal(await page.locator('#commit').isEnabled(),true);
  await page.locator('#commit').click();
  await page.waitForFunction(() => document.getElementById('result').textContent.includes('저장 완료: 1행'));
  const writes=await page.evaluate(()=>window.__writes);
  assert.equal(writes.length,1);
  assert.equal(writes[0].name,'import_shared_observations');
  assert.equal(writes[0].args.p_rows[0].ticker,'TSLA');
  assert.equal(await page.locator('#commit').isDisabled(),true);
  assert.deepEqual(errors,[]);
  console.log('Mocked authenticated browser flow passed: dry-run zero writes, confirmation gate, single atomic RPC call.');
}finally{await browser.close();await new Promise(done=>server.close(done));}
