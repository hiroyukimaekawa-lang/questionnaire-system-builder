'use client';
import {useActionState,useState} from 'react';
import {saveCompletionSettingsAction} from '@/app/completion-actions';
import {scoreMax} from '@/lib/survey';
import {ReviewSettings} from './ReviewSettings';
import type {CompletionRule,RuleCondition,SurveyConfig,SurveyQuestion} from '@/types/database';
const MAX_RULES=20,MAX_CONDITIONS=10;
export function CompletionSettingsForm({surveyId,versionId,config,questions,onChange}:{surveyId:string;versionId:string;config:SurveyConfig;questions:SurveyQuestion[];onChange?:(patch:Partial<SurveyConfig>)=>void}) {
 const [state,action,pending]=useActionState(saveCompletionSettingsAction.bind(null,surveyId,versionId),null);
 const [review,setReview]=useState(config),[rules,setRules]=useState<CompletionRule[]>(config.completionRules??[]);
 const scores=questions.filter(q=>q.type==='rating_10');
 const patchRule=(i:number,value:Partial<CompletionRule>)=>setRules(xs=>xs.map((x,n)=>n===i?{...x,...value}:x));
 const patchCondition=(ri:number,ci:number,value:Partial<RuleCondition>)=>setRules(xs=>xs.map((r,n)=>n!==ri?r:{...r,conditions:r.conditions.map((c,m)=>m===ci?{...c,...value}:c)}));
 const addRule=()=>setRules(xs=>[...xs,{id:crypto.randomUUID(),logic:'and',conditions:[{questionId:scores[0]?.id??'',operator:'gte',value:scores[0]?scoreMax(scores[0]):1}],completionMessage:'',needsFollowUp:false}]);
 return <form action={action} className="card stack admin-form-card"><h2>Google口コミ設定</h2><ReviewSettings config={review} questions={questions} onChange={patch=>{setReview(c=>({...c,...patch}));onChange?.(patch)}}/>
 <input type="hidden" name="googleReviewRule" value={JSON.stringify(review.googleReviewRule??null)}/>
    <div className="stack conditional-settings"><div><h3>条件別の回答後処理</h3><p className="muted">サンクスメッセージや要フォロー判定を変更するための条件です。口コミ表示条件は上の「口コミを表示するスコア条件」で設定してください。</p></div>
      {rules.map((rule,ri)=><section className="completion-rule" key={rule.id}><label className="field">条件のつなぎ方<select value={rule.logic} onChange={e=>patchRule(ri,{logic:e.target.value as 'and'|'or'})}><option value="and">AND（すべて満たす）</option><option value="or">OR（どれか1つ満たす）</option></select></label>
        {rule.conditions.map((condition,ci)=>{const question=scores.find(q=>q.id===condition.questionId),max=question?scoreMax(question):10;return <div className="condition-row" key={`${rule.id}-${ci}`}><strong>条件 {ci+1}</strong><label className="field">対象質問<select value={condition.questionId} onChange={e=>patchCondition(ri,ci,{questionId:e.target.value})}>{scores.map((q,index)=><option key={q.id} value={q.id}>Q{index+1} {q.title}</option>)}</select></label><label className="field">比較<select value={condition.operator} onChange={e=>patchCondition(ri,ci,{operator:e.target.value as RuleCondition['operator']})}><option value="gte">以上</option><option value="lte">以下</option><option value="eq">等しい</option></select></label><label className="field">条件値<input type="number" min="1" max={max} value={Math.min(condition.value,max)} onChange={e=>patchCondition(ri,ci,{value:Number(e.target.value)})}/></label><button className="btn danger" type="button" disabled={rule.conditions.length<=1} onClick={()=>patchRule(ri,{conditions:rule.conditions.filter((_,n)=>n!==ci)})}>削除</button></div>})}
        <label className="field">条件一致時のサンクスメッセージ<textarea rows={3} value={rule.completionMessage??''} onChange={e=>patchRule(ri,{completionMessage:e.target.value})}/></label><label><input type="checkbox" checked={Boolean(rule.needsFollowUp)} onChange={e=>patchRule(ri,{needsFollowUp:e.target.checked})}/> 管理画面で要フォローとして扱う</label>
        <div className="row"><button className="btn secondary" type="button" disabled={rule.conditions.length>=MAX_CONDITIONS||!scores.length} onClick={()=>patchRule(ri,{conditions:[...rule.conditions,{questionId:scores[0]?.id??'',operator:'gte',value:scores[0]?scoreMax(scores[0]):1}]})}>＋ 条件を追加</button><button className="btn danger" type="button" onClick={()=>setRules(xs=>xs.filter((_,n)=>n!==ri))}>ルールを削除</button></div></section>)}
      <button className="btn secondary" type="button" disabled={!scores.length||rules.length>=MAX_RULES} onClick={addRule}>＋ 完了条件ルールを追加</button>{!scores.length&&<small className="muted">スコア質問を追加すると条件を設定できます。</small>}</div>
    <input type="hidden" name="completionRules" value={JSON.stringify(rules)}/>{state?.error&&<p className="error" role="alert">{state.error}</p>}{state?.success&&<p className="notice" role="status">{state.success}</p>}<button className="btn" disabled={pending}>{pending?'保存中…':'口コミ・完了条件を保存'}</button>
  </form>;
}
