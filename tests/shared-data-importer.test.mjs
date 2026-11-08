import test from 'node:test';
import assert from 'node:assert/strict';
import {prepareSharedImport,importSharedCsv} from '../src/shared-data/shared-importer.mjs';
const csv='date,ticker,close\n2026-11-06,TSLA,299.12\n';
function mock({existing=[],signedIn=true}={}) {
  const calls=[];
  const client={
    auth:{getUser:async()=>({data:{user:signedIn?{id:'owner'}:null},error:null})},
    rpc:async(name,args)=>{calls.push(name);return {data:{status:'committed',accepted_count:args.p_rows.length,batch_id:7},error:null}},
    from(name) {
      calls.push(name);
      if(name==='companies') return {select:async()=>({data:[{id:5,ticker:'TSLA'}],error:null})};
      return {select:()=>({eq:()=>({in:async()=>({data:existing,error:null})})})};
    }
  };
  return {client,calls};
}
test('valid dry-run maps company id and performs no writes',async()=>{
  const {client,calls}=mock();
  const result=await prepareSharedImport(client,csv,'price');
  assert.equal(result.records[0].company_id,5);
  assert.deepEqual(calls,['companies','market_price_observations']);
  assert.deepEqual(await importSharedCsv(client,csv,'price'),{status:'validated',written:0,rows:1});
});
test('explicit commit calls only atomic RPC',async()=>{
  const {client,calls}=mock();
  const result=await importSharedCsv(client,csv,'price',{commit:true});
  assert.deepEqual(result,{status:'committed',written:1,batchId:7});
  assert.equal(calls.at(-1),'import_shared_observations');
});
test('existing observations are rejected',async()=>{
  const {client}=mock({existing:[{trading_date:'2026-11-06'}]});
  await assert.rejects(()=>prepareSharedImport(client,csv,'price'),/Existing TSLA/);
});
test('anonymous sessions cannot import',async()=>{
  const {client}=mock({signedIn:false});
  await assert.rejects(()=>prepareSharedImport(client,csv,'price'),/Sign in/);
});

test('large CSV preflight checks duplicates in bounded chunks',async()=>{
  const {client,calls}=mock();
  const rows=Array.from({length:205},(_,i)=>{
    const d=new Date(Date.UTC(2026,0,1+i)).toISOString().slice(0,10);
    return d+',TSLA,'+(100+i);
  });
  const result=await prepareSharedImport(client,'date,ticker,close\\n'.replace('\\n','\n')+rows.join('\n'),'price');
  assert.equal(result.rows,205);
  assert.equal(calls.filter(x=>x==='market_price_observations').length,3);
});
