import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {buildGoogleSheetsPayloadFromResponse} from '../lib/google-sheets-queue';

const read=(path:string)=>readFileSync(new URL(path,import.meta.url),'utf8');

function fakeClient(){
  const rows:Record<string,unknown>={
    responses:{id:'r1',survey_id:'s1',survey_version_id:'v1',submitted_at:'2026-09-26T00:00:00Z',total_score:9,average_score:9,metadata:{reviewEligible:true,needsFollowUp:true}},
    surveys:{id:'s1',name:'医院',slug:'clinic',industry:'clinic',status:'published'},
    survey_versions:{id:'v1',version:2,config:{title:'受診後アンケート',googleReviewUrl:'https://example.com'}},
    questions:[
      {id:'q-choice',title:'受診目的',type:'single_choice',sort_order:1,question_options:[{value:'checkup',label:'検診',sort_order:1}]},
      {id:'q-score',title:'満足度',type:'rating_10',sort_order:2,question_options:[]},
    ],
    response_answers:[
      {question_id:'q-choice',value_text:'checkup',value_number:null,value_json:null},
      {question_id:'q-score',value_text:null,value_number:9,value_json:null},
    ],
  };
  return {from(table:string){const chain:any={select(){return chain},eq(){return chain},order(){return Promise.resolve({data:rows[table],error:null})},single(){return Promise.resolve({data:rows[table],error:null})},then(resolve:(value:unknown)=>unknown){return Promise.resolve({data:rows[table],error:null}).then(resolve)}};return chain}} as any;
}

test('保存済みDBデータからversion別質問・選択肢ラベル・metadataを復元する',async()=>{
  const payload=await buildGoogleSheetsPayloadFromResponse(fakeClient(),'r1');
  assert.equal(payload.response.version,2);
  assert.equal(payload.response.reviewEligible,true);
  assert.equal(payload.response.needsFollowUp,true);
  assert.equal(payload.answers[0].value,'検診');
  assert.equal(payload.answers[1].score,9);
  assert.equal(payload.events[0].id,'r1:response_submitted');
});

test('Scheduled Workerは1件claim・20秒timeout・lease token付き完了/失敗を使う',()=>{
  const worker=read('../workers/google-sheets-sync/index.ts');
  const config=read('../wrangler.google-sheets-sync.jsonc');
  assert.match(worker,/claim_google_sheets_sync_jobs/);
  assert.match(worker,/p_limit:1/);
  assert.match(worker,/timeoutMs:20_000/);
  assert.match(worker,/p_lock_token:job\.lock_token/);
  assert.match(config,/"crons": \["\* \* \* \* \*"\]/);
  assert.doesNotMatch(config,/NEXT_PUBLIC_/);
});

test('Queue管理操作はadmin session確認後のserver actionからservice role RPCを呼ぶ',()=>{
  const actions=read('../app/admin/system/google-sheets/actions.ts');
  const page=read('../app/admin/system/google-sheets/page.tsx');
  assert.match(actions,/'use server'/);
  assert.match(actions,/profile\.role!=='admin'/);
  assert.match(actions,/createAdminClient\(\)/);
  assert.match(page,/retryAllFailedGoogleSheetsJobsAction/);
  assert.match(page,/confirmText=/);
});
