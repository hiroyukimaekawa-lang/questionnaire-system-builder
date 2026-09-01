import test from 'node:test';import assert from 'node:assert/strict';import {calculateScores,csvEscape,slugify,validateAnswers,validateQuestion,validateSlug} from '../lib/survey';import type {SurveyQuestion} from '../types/database';
const questions:SurveyQuestion[]=[{id:'a',type:'rating_10',title:'評価1',description:'',required:true,sortOrder:0,settings:{},options:[]},{id:'b',type:'rating_10',title:'評価2',description:'',required:true,sortOrder:1,settings:{},options:[]},{id:'c',type:'textarea',title:'感想',description:'',required:false,sortOrder:2,settings:{},options:[]}];
test('slugを安全な形式へ変換する',()=>{assert.equal(slugify(' My Clinic 2026 '),'my-clinic-2026');assert.equal(validateSlug('my-clinic'),true);assert.equal(validateSlug('../clinic'),false)});
test('必須回答を検証する',()=>{assert.deepEqual(validateAnswers(questions,{a:8}),{b:'この項目は必須です'});assert.deepEqual(validateAnswers(questions,{a:8,b:10}),{})});
test('評価の合計と平均を算出する',()=>assert.deepEqual(calculateScores(questions,{a:8,b:9}),{totalScore:17,averageScore:8.5}));
test('選択肢不足を拒否する',()=>assert.match(validateQuestion({...questions[0],type:'single_choice',options:[{label:'1',value:'1',sortOrder:0}]})||'',/2件以上/));
test('CSVをExcel互換にエスケープする',()=>assert.equal(csvEscape('a,"b"'),'"a,""b"""'));
