import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {requireQueryData} from '../lib/query-result';
import {isVerifiedPublication} from '../lib/publication';

test('query errors and null data never masquerade as an empty list',t=>{
  t.mock.method(console,'error',()=>{});
  assert.deepEqual(requireQueryData([],null,'test'),[]);
  assert.throws(()=>requireQueryData(null,{code:'PGRST200'},'test'),/一覧の取得に失敗/);
  assert.throws(()=>requireQueryData(null,null,'test'),/一覧の取得に失敗/);
  assert.throws(()=>requireQueryData([],{code:'42501'},'test'),/一覧の取得に失敗/);
});
const survey={id:'survey-id',status:'published',slug:'sample',current_published_version_id:'published-id',current_draft_version_id:'draft-id',published_at:'2026-09-11T00:00:00Z'};
test('publication requires a persisted survey with matching publication and timestamp',()=>{
  assert.equal(isVerifiedPublication(survey,'survey-id','published-id'),true);
  assert.equal(isVerifiedPublication(null,'survey-id','published-id'),false);
  for(const patch of [{id:'other'},{status:'draft'},{slug:''},{current_published_version_id:null},{current_published_version_id:'other'},{current_draft_version_id:null},{published_at:null},{published_at:'invalid'}]){
    assert.equal(isVerifiedPublication({...survey,...patch},'survey-id','published-id'),false);
  }
});
test('list join matches the constraint defined by the migration',()=>{
  const migration=readFileSync(new URL('../supabase/migrations/202608310001_initial_platform.sql',import.meta.url),'utf8');
  const data=readFileSync(new URL('../lib/data.ts',import.meta.url),'utf8');
  const constraint=migration.match(/add constraint (\w+) foreign key\(current_draft_version_id\)/)?.[1];
  assert.ok(constraint);
  assert.ok(data.includes(`survey_versions!${constraint}(config)`));
});
