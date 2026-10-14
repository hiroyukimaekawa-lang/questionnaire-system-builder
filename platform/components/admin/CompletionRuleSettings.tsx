'use client';
import {useMemo,useState} from 'react';
import type {AnswerValue,CompletionRule,SurveyQuestion} from '@/types/database';
import {evaluateCompletionRules} from '@/lib/completion';
import {scoreMax} from '@/lib/survey';

export function CompletionRuleSettings({rules,questions,completionText,onChange}:{rules:CompletionRule[];questions:SurveyQuestion[];completionText:string;onChange:(rules:CompletionRule[])=>void}){
  const ratings=useMemo(()=>questions.filter(q=>q.type==='rating_10'),[questions]);
  const [answers,setAnswers]=useState<Record<string,AnswerValue>>({});
  const update=(index:number,rule:CompletionRule)=>onChange(rules.map((current,i)=>i===index?rule:current));
  const add=()=>onChange([...rules,{id:crypto.randomUUID(),conditionType:'individual',logic:'and',conditions:[],completionMessage:'',needsFollowUp:false}]);
  return <section className="stack completion-rule-settings">
    <div><h2>回答の評価分類</h2><p className="muted">Google口コミの表示とは独立して、回答を個別条件または合計点で分類します。</p></div>
    {!ratings.length&&<p className="muted">評価分類を設定するには、点数評価の質問を追加してください。</p>}
    {rules.map((rule,index)=>{
      const type=rule.conditionType??'individual';
      const selected=rule.aggregate?.questionIds??[];
      const maxTotal=selected.reduce((sum,id)=>{const question=ratings.find(q=>q.id===id);return sum+(question?scoreMax(question):0)},0);
      const setType=(next:'individual'|'aggregate')=>update(index,next==='aggregate'?{...rule,conditionType:'aggregate',logic:'and',conditions:[],aggregate:{questionIds:[],operator:'gte',value:1}}:{...rule,conditionType:'individual',aggregate:undefined});
      return <div className="completion-rule stack" key={rule.id}>
        <div className="row"><strong>分類条件 {index+1}</strong><button type="button" className="btn secondary" onClick={()=>onChange(rules.filter((_,i)=>i!==index))}>削除</button></div>
        <fieldset className="stack"><legend>判定方式</legend><div className="row" role="group" aria-label={`分類条件${index+1}の判定方式`}><button type="button" className={type==='individual'?'btn':'btn secondary'} aria-pressed={type==='individual'} onClick={()=>setType('individual')}>個別条件</button><button type="button" className={type==='aggregate'?'btn':'btn secondary'} aria-pressed={type==='aggregate'} onClick={()=>setType('aggregate')}>合計点条件</button></div></fieldset>
        {type==='individual'?<>
          <fieldset className="stack"><legend>AND / OR</legend><div className="row"><button type="button" className={rule.logic==='and'?'btn':'btn secondary'} onClick={()=>update(index,{...rule,logic:'and'})}>すべて満たす（AND）</button><button type="button" className={rule.logic==='or'?'btn':'btn secondary'} onClick={()=>update(index,{...rule,logic:'or'})}>どれか満たす（OR）</button></div></fieldset>
          {ratings.map(q=>{const condition=rule.conditions.find(c=>c.questionId===q.id);return <div className="row" key={q.id}><label><input type="checkbox" checked={Boolean(condition)} onChange={e=>update(index,{...rule,conditions:e.target.checked?[...rule.conditions,{questionId:q.id,operator:'gte',value:1}]:rule.conditions.filter(c=>c.questionId!==q.id)})}/> Q{questions.indexOf(q)+1} {q.title}</label>{condition&&<select aria-label={`${q.title}の基準点`} value={condition.value} onChange={e=>update(index,{...rule,conditions:rule.conditions.map(c=>c.questionId===q.id?{...c,value:Number(e.target.value)}:c)})}>{Array.from({length:scoreMax(q)},(_,i)=>i+1).map(n=><option key={n} value={n}>{n}点以上</option>)}</select>}</div>})}
        </>:<>
          <fieldset className="stack"><legend>合計対象（複数選択）</legend>{ratings.map(q=><label key={q.id}><input type="checkbox" checked={selected.includes(q.id)} onChange={e=>{const questionIds=e.target.checked?[...selected,q.id]:selected.filter(id=>id!==q.id);update(index,{...rule,aggregate:{questionIds,operator:'gte',value:Math.min(rule.aggregate?.value??1,Math.max(1,questionIds.reduce((sum,id)=>sum+scoreMax(ratings.find(item=>item.id===id)!),0)))}})}}/> Q{questions.indexOf(q)+1} {q.title}（最大{scoreMax(q)}点）</label>)}</fieldset>
          <p className="notice">最大合計点：{maxTotal}点</p>
          <label className="field">合計点の閾値<input type="number" min={1} max={Math.max(1,maxTotal)} step={1} value={rule.aggregate?.value??1} onChange={e=>update(index,{...rule,aggregate:{questionIds:selected,operator:'gte',value:Number(e.target.value)}})}/><span className="muted">以上（gte）</span></label>
        </>}
        <label className="field">条件達成時の完了メッセージ（任意）<textarea value={rule.completionMessage??''} onChange={e=>update(index,{...rule,completionMessage:e.target.value})}/></label>
        <label><input type="checkbox" checked={Boolean(rule.needsFollowUp)} onChange={e=>update(index,{...rule,needsFollowUp:e.target.checked})}/> 要フォローとして分類する</label>
      </div>;
    })}
    <button type="button" className="btn secondary" disabled={!ratings.length} onClick={add}>＋ 評価分類を追加</button>
    {rules.length>0&&<div className="stack"><strong>判定結果のプレビュー</strong>{ratings.map(q=><label className="field" key={q.id}>Q{questions.indexOf(q)+1} {q.title}<select value={typeof answers[q.id]==='number'?String(answers[q.id]):''} onChange={e=>setAnswers(current=>({...current,[q.id]:e.target.value===''?'':Number(e.target.value)}))}><option value="">未回答</option>{Array.from({length:scoreMax(q)},(_,i)=>i+1).map(n=><option key={n} value={n}>{n}点</option>)}</select></label>)}<p className="notice" role="status">{(()=>{const result=evaluateCompletionRules({completionText,completionRules:rules} as never,answers,questions);return result.matchedRuleId?`条件達成：${rules.findIndex(r=>r.id===result.matchedRuleId)+1}番の分類条件`:'条件未達';})()}</p></div>}
  </section>;
}
