'use client';
import {useState} from 'react';
import type {GoogleReviewRule,SurveyConfig,SurveyQuestion} from '@/types/database';
import {scoreMax} from '@/lib/survey';
import {evaluateGoogleReviewEligibility,safeGoogleReviewUrl} from '@/lib/google-review';
import {reviewRuleDescription} from '@/lib/builder/settings';

function defaultThreshold(question:SurveyQuestion){return Math.min(9,scoreMax(question));}
function allRatingsRule(scores:SurveyQuestion[],threshold:number):GoogleReviewRule{return {logic:'and',conditions:scores.map(q=>({questionId:q.id,operator:'gte',value:Math.min(threshold,scoreMax(q))}))};}
function perQuestionRule(scores:SurveyQuestion[],current:GoogleReviewRule):GoogleReviewRule{return {logic:'and',conditions:scores.map(q=>{const existing=current.conditions.find(c=>c.questionId===q.id&&c.operator==='gte');return {questionId:q.id,operator:'gte',value:existing?Math.min(Math.max(existing.value,1),scoreMax(q)):defaultThreshold(q)};})};}
function commonThreshold(rule:GoogleReviewRule,scores:SurveyQuestion[]):number|null{
  if(rule.logic!=='and'||!scores.length||rule.conditions.length!==scores.length)return null;
  for(let threshold=1;threshold<=10;threshold++){
    const matches=scores.every(q=>{const condition=rule.conditions.find(c=>c.questionId===q.id);return condition?.operator==='gte'&&condition.value===Math.min(threshold,scoreMax(q));});
    if(matches)return threshold;
  }
  return null;
}

export function ReviewSettings({config,questions,onChange}:{config:SurveyConfig;questions:SurveyQuestion[];onChange:(patch:Partial<SurveyConfig>)=>void}) {
  const scores=questions.filter(q=>q.type==='rating_10');
  const mode=config.googleReviewMode??(config.googleReviewUrl?'all':'disabled');
  const rule=config.googleReviewRule??{logic:'and' as const,conditions:[]};
  const detectedCommon=commonThreshold(rule,scores);
  const [conditionStyle,setConditionStyle]=useState<'all'|'per-question'>(detectedCommon!==null||!rule.conditions.length?'all':'per-question');
  const [answers,setAnswers]=useState<Record<string,number>>({});
  const link=safeGoogleReviewUrl(config.googleReviewUrl);
  const maxScale=scores.length?Math.max(...scores.map(scoreMax)):10;
  const displayedCommonThreshold=detectedCommon??Math.min(9,maxScale);
  const legacyAdvanced=rule.logic!=='and'||rule.conditions.some(c=>c.operator!=='gte');

  const changeMode=(value:'disabled'|'all'|'score')=>{
    if(value==='score'&&scores.length&&!rule.conditions.length){setConditionStyle('all');onChange({googleReviewMode:value,googleReviewRule:allRatingsRule(scores,Math.min(9,maxScale))});return;}
    onChange({googleReviewMode:value});
  };
  const changeConditionStyle=(value:'all'|'per-question')=>{
    setConditionStyle(value);
    if(value==='all')onChange({googleReviewRule:allRatingsRule(scores,displayedCommonThreshold)});
    else onChange({googleReviewRule:perQuestionRule(scores,rule)});
  };
  const changePerQuestionThreshold=(questionId:string,value:number)=>{
    const normalized=perQuestionRule(scores,rule);
    onChange({googleReviewRule:{logic:'and',conditions:normalized.conditions.map(c=>c.questionId===questionId?{...c,value}:c)}});
  };

  return <div className="stack review-settings"><fieldset><legend>Google口コミへの案内</legend>{([['disabled','使用しない'],['all','全回答者へ表示'],['score','評価条件を満たした人だけ表示']] as const).map(([value,label])=><label className="choice" key={value}><input type="radio" name="googleReviewMode" checked={mode===value} value={value} disabled={value==='score'&&!scores.length} onChange={()=>changeMode(value)}/>{label}</label>)}</fieldset>
    {!scores.length&&<small className="muted">評価条件を使うには、先にスコアリング質問を1つ以上追加してください。</small>}
    {mode!=='disabled'&&<><label className="field">Google口コミURL<input name="googleReviewUrl" type="url" value={config.googleReviewUrl??''} onChange={e=>onChange({googleReviewUrl:e.target.value})} placeholder="https://g.page/r/…/review"/></label>{link&&<a className="btn secondary" href={link} target="_blank" rel="noopener noreferrer">口コミページを確認</a>}</>}
    {mode==='score'&&<section className="completion-rule stack"><div><h3>口コミを表示する評価条件</h3><p className="muted">通常は「すべての評価項目が同じ基準点以上」か、「質問ごとに基準点を設定」のどちらかを選びます。合計点や平均点ではなく、各質問を個別に判定します。</p></div>
      <fieldset className="answer-setting"><legend>条件の設定方法</legend><label><input type="radio" checked={conditionStyle==='all'} onChange={()=>changeConditionStyle('all')}/> すべての評価項目が基準点以上</label><label><input type="radio" checked={conditionStyle==='per-question'} onChange={()=>changeConditionStyle('per-question')}/> 質問ごとに基準点を設定</label></fieldset>
      {conditionStyle==='all'&&<label className="field">共通の基準点<select value={displayedCommonThreshold} onChange={e=>onChange({googleReviewRule:allRatingsRule(scores,Number(e.target.value))})}>{Array.from({length:maxScale},(_,n)=>n+1).map(n=><option key={n} value={n}>{n}点以上</option>)}</select><small className="muted">すべての評価質問がこの基準以上の場合だけ、Google口コミをご案内します。</small></label>}
      {conditionStyle==='per-question'&&<div className="stack">{scores.map(q=>{const existing=rule.conditions.find(c=>c.questionId===q.id&&c.operator==='gte');const threshold=existing?.value??defaultThreshold(q);return <label className="field" key={q.id}>Q{questions.indexOf(q)+1} {q.title}<select value={Math.min(threshold,scoreMax(q))} onChange={e=>changePerQuestionThreshold(q.id,Number(e.target.value))}>{Array.from({length:scoreMax(q)},(_,n)=>n+1).map(n=><option key={n} value={n}>{n}点以上</option>)}</select></label>})}<small className="muted">設定したすべての質問が、それぞれの基準点以上の場合に口コミをご案内します。</small></div>}
      {legacyAdvanced&&<p className="notice">以前の詳細条件が保存されています。この画面で条件を変更すると「○点以上・すべて満たす」の方式に統一されます。</p>}
      {rule.conditions.length===0&&<p className="error" role="alert">口コミを条件付きで表示する場合は、評価条件を設定してください。</p>}
      <p className="notice" aria-live="polite">{reviewRuleDescription(rule,questions)}</p>
    </section>}
    {mode!=='disabled'&&<label className="field">口コミ用文章として使用する質問<select name="reviewTextQuestionId" value={config.reviewTextQuestionId===undefined?'__legacy':config.reviewTextQuestionId??''} onChange={e=>onChange({reviewTextQuestionId:e.target.value||null})}>{config.reviewTextQuestionId===undefined&&<option value="__legacy">既存設定：最初の入力済み長文</option>}<option value="">使用しない</option>{questions.filter(q=>q.type==='textarea').map(q=><option key={q.id} value={q.id}>Q{questions.indexOf(q)+1} {q.title}</option>)}</select></label>}
    <details className="completion-rule" open><summary>Google口コミ条件をテスト</summary><div className="stack">{scores.map(q=><label className="field" key={q.id}>Q{questions.indexOf(q)+1} {q.title}<select aria-label={`テスト ${q.title}`} value={answers[q.id]??''} onChange={e=>setAnswers(a=>({...a,[q.id]:Number(e.target.value)}))}><option value="">未回答</option>{Array.from({length:scoreMax(q)},(_,i)=>i+1).map(n=><option value={n} key={n}>{n}点</option>)}</select></label>)}<p role="status">{evaluateGoogleReviewEligibility(config,questions,answers)?'✓ Google口コミを表示します':'Google口コミは表示されません'}</p></div></details>
  </div>;
}
