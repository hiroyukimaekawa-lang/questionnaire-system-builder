import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import {publishedQuestionCopyUpdates} from '../lib/question-live-sync';
import type {SurveyQuestion} from '../types/database';

const make=(id:string,title:string,sortOrder:number):SurveyQuestion=>({
 id,type:'rating_10',title,description:'',required:true,sortOrder,
 settings:{maxScore:5,minLabel:'不満',maxLabel:'満足'},options:[],
});
const original=[make('published-1','見え方について\n2．中間：パソコン',0),make('published-2','見え方について\n3．近方: スマートフォン',1)];
const draft=[make('draft-1','見え方について\n2．中間：パソコン',0),make('draft-2','見え方について\n3．近方：スマートフォン',1)];

test('半角コロンを全角に直した質問文だけ公開版に反映対象となる',()=>{
 assert.deepEqual(publishedQuestionCopyUpdates(original,draft),[
   {id:'published-2',title:'見え方について\n3．近方：スマートフォン',description:''}
 ]);
});
test('補足説明の変更も反映されるが必須・回答形式・評価段階は対象外',()=>{
 const changed=draft.map(q=>({...q}));
 changed[0]={...changed[0],description:'新しい説明'};
 assert.equal(publishedQuestionCopyUpdates(original,changed)?.length,2);
 assert.equal(publishedQuestionCopyUpdates(original,[{...changed[0],required:false},changed[1]]),null);
 assert.equal(publishedQuestionCopyUpdates(original,[{...changed[0],type:'text'},changed[1]]),null);
 assert.equal(publishedQuestionCopyUpdates(original,[{...changed[0],settings:{maxScore:10}},changed[1]]),null);
});
test('質問の追加・削除・選択肢変更時は自動公開しない',()=>{
 assert.equal(publishedQuestionCopyUpdates(original,draft.slice(0,1)),null);
 assert.equal(publishedQuestionCopyUpdates(original,[...draft,make('new','質問を追加',2)]),null);
 const choices=[{...make('p','質問',0),type:'single_choice' as const,options:[{label:'はい',value:'yes',sortOrder:0}]}];
 assert.equal(publishedQuestionCopyUpdates(choices,[{...choices[0],id:'d',options:[{label:'いいえ',value:'yes',sortOrder:0}]}]),null);
});
test('公開中の質問文だけを更新し、公開ルートのキャッシュを再検証する',()=>{
 const src=readFileSync(new URL('../app/actions.ts',import.meta.url),'utf8');
 const start=src.indexOf('export async function saveQuestionsAction');
 const end=src.indexOf('export async function publishAction',start);
 const action=src.slice(start,end);
 assert.match(action,/publishedQuestionCopyUpdates\(live\.questions,draft\.questions\)/);
 assert.match(action,/\.eq\('survey_version_id',live\.id\)/);
 assert.match(action,/revalidatePath\(`\/s\/\$\{survey\.slug\}`\)/);
 assert.doesNotMatch(action,/publish_survey/);
});
