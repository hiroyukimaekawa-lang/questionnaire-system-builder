'use client';
import {useState} from 'react';
import type {SurveyConfig,SurveyQuestion,RuleCondition} from '@/types/database';
import {scoreMax} from '@/lib/survey';
import {evaluateGoogleReviewEligibility,safeGoogleReviewUrl} from '@/lib/google-review';
import {recommendedReviewRule,reviewRuleDescription} from '@/lib/builder/settings';

function defaultCondition(question:SurveyQuestion):RuleCondition{return {questionId:question.id,operator:'gte',value:Math.min(9,scoreMax(question))};}

export function ReviewSettings({config,questions,onChange}:{config:SurveyConfig;questions:SurveyQuestion[];onChange:(patch:Partial<SurveyConfig>)=>void}) {
  const scores=questions.filter(q=>q.type==='rating_10');
  const mode=config.googleReviewMode??(config.googleReviewUrl?'all':'disabled');
  const rule=config.googleReviewRule??{logic:'and' as const,conditions:[]};
  const [answers,setAnswers]=useState<Record<string,number>>({});
  const patchCondition=(index:number,patch:Partial<RuleCondition>)=>onChange({googleReviewRule:{...rule,conditions:rule.conditions.map((c,i)=>i===index?{...c,...patch}:c)}});
  const link=safeGoogleReviewUrl(config.googleReviewUrl);
  const changeMode=(value:'disabled'|'all'|'score')=>{
    if(value==='score'&&!rule.conditions.length&&scores[0]){onChange({googleReviewMode:value,googleReviewRule:{logic:'and',conditions:[defaultCondition(scores[0])]}});return;}
    onChange({googleReviewMode:value});
  };
  const addCondition=()=>{
    if(!scores.length||rule.conditions.length>=10)return;
    const next=scores.find(q=>!rule.conditions.some(c=>c.questionId===q.id))??scores[0];
    onChange({googleReviewRule:{...rule,conditions:[...rule.conditions,defaultCondition(next)]}});
  };
  return <div className="stack review-settings"><fieldset><legend>Google口コミへの案内</legend>{([['disabled','使用しない'],['all','全回答者へ表示'],['score','条件を満たした人だけ表示']] as const).map(([value,label])=><label className="choice" key={value}><input type="radio" name="googleReviewMode" checked={mode===value} value={value} disabled={value==='score'&&!scores.length} onChange={()=>changeMode(value)}/>{label}</label>)}</fieldset>
    {!scores.length&&<small className="muted">「条件を満たした人だけ表示」を使うには、先にスコアリング質問を1つ以上追加してください。</small>}
    {mode!=='disabled'&&<><label className="field">Google口コミURL<input name="googleReviewUrl" type="url" value={config.googleReviewUrl??''} onChange={e=>onChange({googleReviewUrl:e.target.value})} placeholder="https://g.page/r/…/review"/></label>{link&&<a className="btn secondary" href={link} target="_blank" rel="noopener noreferrer">口コミページを確認</a>}</>}
    {mode==='score'&&<section className="completion-rule stack"><div><h3>口コミを表示する条件</h3><p className="muted">評価質問ごとに条件を設定します。複数条件では「すべて満たす（AND）」または「いずれかを満たす（OR）」を選べます。</p></div>{scores.length>=2&&<><button type="button" className="btn secondary" onClick={()=>onChange({googleReviewRule:recommendedReviewRule(questions)})}>おすすめ設定を使う</button><small className="muted">最初の2つのスコア質問を両方9点以上に設定します。5段階の質問は5点以上になります。</small></>}
      {rule.conditions.map((c,i)=>{const q=scores.find(q=>q.id===c.questionId);return <div className="condition-row" key={`${c.questionId}-${i}`}><strong>条件 {i+1}</strong><label className="field">対象質問<select value={c.questionId} onChange={e=>{const selected=scores.find(q=>q.id===e.target.value);if(selected)patchCondition(i,{questionId:selected.id,value:Math.min(9,scoreMax(selected))});}}><option value="" disabled>質問を選択してください</option>{!q&&c.questionId&&<option value={c.questionId}>質問を選び直してください</option>}{scores.map(q=><option key={q.id} value={q.id}>Q{questions.indexOf(q)+1} {q.title}</option>)}</select></label><label className="field">判定方法<select aria-label={`条件${i+1}の比較方法`} value={c.operator} onChange={e=>patchCondition(i,{operator:e.target.value as RuleCondition['operator']})}><option value="gte">以上</option><option value="lte">以下</option><option value="eq">と等しい</option></select></label><label className="field">基準点<select value={c.value} onChange={e=>patchCondition(i,{value:Number(e.target.value)})}>{Array.from({length:q?scoreMax(q):10},(_,n)=>n+1).map(n=><option key={n} value={n}>{n}点</option>)}</select></label><button type="button" className="btn danger" onClick={()=>onChange({googleReviewRule:{...rule,conditions:rule.conditions.filter((_,n)=>i!==n)}})}>条件を削除</button></div>})}
      <button type="button" className="btn secondary" disabled={!scores.length||rule.conditions.length>=10} onClick={addCondition}>＋ 条件を追加</button>
      {rule.conditions.length>1&&<label className="field">条件のつなぎ方<select value={rule.logic} onChange={e=>onChange({googleReviewRule:{...rule,logic:e.target.value as 'and'|'or'}})}><option value="and">すべて満たす（AND）</option><option value="or">いずれかを満たす（OR）</option></select></label>}
      {rule.conditions.length===0&&<p className="error" role="alert">口コミを条件付きで表示する場合は、条件を1つ以上設定してください。</p>}
      <p className="notice" aria-live="polite">{reviewRuleDescription(rule,questions)}</p>
    </section>}
    {mode!=='disabled'&&<label className="field">口コミ用文章として使用する質問<select name="reviewTextQuestionId" value={config.reviewTextQuestionId===undefined?'__legacy':config.reviewTextQuestionId??''} onChange={e=>onChange({reviewTextQuestionId:e.target.value||null})}>{config.reviewTextQuestionId===undefined&&<option value="__legacy">既存設定：最初の入力済み長文</option>}<option value="">使用しない</option>{questions.filter(q=>q.type==='textarea').map(q=><option key={q.id} value={q.id}>Q{questions.indexOf(q)+1} {q.title}</option>)}</select></label>}
    <details className="completion-rule" open><summary>Google口コミ条件をテスト</summary><div className="stack">{scores.map(q=><label className="field" key={q.id}>Q{questions.indexOf(q)+1} {q.title}<select aria-label={`テスト ${q.title}`} value={answers[q.id]??''} onChange={e=>setAnswers(a=>({...a,[q.id]:Number(e.target.value)}))}><option value="">未回答</option>{Array.from({length:scoreMax(q)},(_,i)=>i+1).map(n=><option value={n} key={n}>{n}点</option>)}</select></label>)}<p role="status">{evaluateGoogleReviewEligibility(config,questions,answers)?'✓ Google口コミを表示します':'Google口コミは表示されません'}</p></div></details>
  </div>;
}
