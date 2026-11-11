import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const html=readFileSync(new URL('../shared-data-import.html',import.meta.url),'utf8');
test('CSV import UI is restricted to the isolated TEST project',()=>{
  assert.match(html,/gopofxyezhwpfxbecrxd\.supabase\.co/);
  assert.doesNotMatch(html,/duffpsvaphccgxvkiobm/);
  assert.match(html,/investlab_shared_data_auth_v1/);
});
test('CSV import UI requires separate validation and explicit confirmation',()=>{
  assert.match(html,/id="validate"/);
  assert.match(html,/id="confirm"/);
  assert.match(html,/id="commit"[^>]*disabled/);
  assert.match(html,/window\.confirm/);
  assert.match(html,/commit:true/);
});

test('validated file identity is checked again before saving',()=>{
  assert.match(html,/prepared=\{csv,kind,fileName:file\.name,file\}/);
  assert.match(html,/current!==prepared\.file/);
});

test('validation result is discarded if file, dataset kind or connection changed mid-flight',()=>{
  assert.match(html,/validationClient=client/);
  assert.match(html,/\$\('file'\)\.files\?\.\[0\]!==file\|\|\$\('kind'\)\.value!==kind\|\|client!==validationClient/);
  assert.match(html,/검증 중 파일·데이터 종류·연결이 변경되었습니다/);
});
