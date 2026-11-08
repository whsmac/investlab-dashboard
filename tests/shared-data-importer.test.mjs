import test from 'node:test';
import assert from 'node:assert/strict';
import {prepareSharedImport,importSharedCsv} from '../src/shared-data/shared-importer.mjs';
const csv='date,ticker,close\n2026-11-06,TSLA,299.12\n';
function mock({existing=[],signedIn=true}={}) {
  const calls=[];
  const client={
    auth:{getUser:async()=>({data:{user:signedIn?{id:'owner'}:null},error:null})},
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
test('commit is blocked until atomic RPC exists',async()=>{
  const {client}=mock();
  await assert.rejects(()=>importSharedCsv(client,csv,'price',{commit:true}),/Commit disabled/);
});
test('existing observations are rejected',async()=>{
  const {client}=mock({existing:[{trading_date:'2026-11-06'}]});
  await assert.rejects(()=>prepareSharedImport(client,csv,'price'),/Existing TSLA/);
});
test('anonymous sessions cannot import',async()=>{
  const {client}=mock({signedIn:false});
  await assert.rejects(()=>prepareSharedImport(client,csv,'price'),/Sign in/);
});
