'use client';
import {useEffect,useState} from 'react';
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
function ruleNeedsNormalization(rule:GoogleReviewRule,scores:SurveyQuestion[]){
  const scoreIds=new Set(scores.map(q=>q.id));
  const conditionIds=rule.conditions.map(c=>c.questionId);
  return rule.logic!=='and'||rule.conditions.length!==scores.length||new Set(conditionIds).size!==conditionIds.length||rule.conditions.some(c=>c.operator!=='gte'||!scoreIds.has(c.questionId))||scores.some(q=>!conditionIds.includes(q.id));
}

export function ReviewSettings({config,questions,onChange}:{config:SurveyConfig;questions:SurveyQuestion[];onChange:(patch:Partial<SurveyConfig>)=>void}) {
  const scores=questions.filter(q=>q.type==='rating_10');
  const mode=config.googleReviewMode??(config.googleReviewUrl?'all':'disabled');
  const rule=config.googleReviewRule??{logic:'and' as const,conditions:[]};
  const needsNormalization=mode==='score'&&scores.length>0&&ruleNeedsNormalization(rule,scores);
  const effectiveRule=needsNormalization?perQuestionRule(scores,rule):rule;
  const detectedCommon=commonThreshold(effectiveRule,scores);
  const [conditionStyle,setConditionStyle]=useState<'all'|'per-question'>(detectedCommon!==null||!effectiveRule.conditions.length?'all':'per-question');
  const [answers,setAnswers]=useState<Record<string,number>>({});
  const link=safeGoogleReviewUrl(config.googleReviewUrl);
  const maxScale=scores.length?Math.max(...scores.map(scoreMax)):10;
  const displayedCommonThreshold=detectedCommon??Math.min(9,maxScale);
  const scoreSignature=scores.map(q=>`${q.id}:${scoreMax(q)}`).join('|');
  const ruleSignature=JSON.stringify(rule);

  useEffect(()=>{
    if(!needsNormalization)return;
    const normalized=perQuestionRule(scores,rule);
    setConditionStyle(commonThreshold(normalized,scores)!==null?'all':'per-question');
    onChange({googleReviewRule:normalized});
  },[needsNormalization,onChange,ruleSignature,scoreSignature]);

  const changeMode=(value:'disabled'|'all'|'score')=>{
    if(value==='score'&&scores.length){
      const next=!rule.conditions.length?allRatingsRule(scores,Math.min(9,maxScale)):ruleNeedsNormalization(rule,scores)?perQuestionRule(scores,rule):rule;
      setConditionStyle(commonThreshold(next,scores)!==null?'all':'per-question');
      onChange({googleReviewMode:value,googleReviewRule:next});
      return;
    }
    onChange({googleReviewMode:value});
  };
  const changeConditionStyle=(value:'all'|'per-question')=>{
    setConditionStyle(value);
    if(value==='all')onChange({googleReviewRule:allRatingsRule(scores,displayedCommonThreshold)});
    else onChange({googleReviewRule:perQuestionRule(scores,effectiveRule)});
  };
  const changePerQuestionThreshold=(questionId:string,value:number)=>{
    const normalized=perQuestionRule(scores,effectiveRule);
    onChange({googleReviewRule:{logic:'and',conditions:normalized.conditions.map(c=>c.questionId===questionId?{...c,value}:c)}});
  };
  const previewConfig={...config,googleReviewRule:effectiveRule};

  return <div className="stack review-settings"><fieldset className="stack"><legend>Google口コミへの案内</legend><input type="hidden" name="googleReviewMode" value={mode}/><div className="row" role="group" aria-label="Google口コミへの案内方法">{([['disabled','使用しない'],['all','全回答者へ表示'],['score','評価条件を満たした人だけ表示']] as const).map(([value,label])=><button type="button" className={mode===value?'btn':'btn secondary'} key={value} aria-pressed={mode===value} disabled={value==='score'&&!scores.length} onClick={()=>changeMode(value)}>{mode===value?'✓ ':''}{label}</button>)}</div></fieldset>
    {!scores.length&&<small className="muted">評価条件を使うには、先にスコアリング質問を1つ以上追加してください。</small>}
    {mode!=='disabled'&&<><label className="field">Google口コミURL<input name="googleReviewUrl" type="url" value={config.googleReviewUrl??''} onChange={e=>onChange({googleReviewUrl:e.target.value})} placeholder="https://g.page/r/…/review"/></label>{link&&<a className="btn secondary" href={link} target="_blank" rel="noopener noreferrer">口コミページを確認</a>}</>}
    {mode==='score'&&<section className="completion-rule stack"><div><h3>口コミを表示する評価条件</h3><p className="muted">「すべての評価項目が同じ基準点以上」か、「質問ごとに基準点を設定」のどちらかを選びます。すべての評価質問を個別に確認し、全条件を満たした場合だけ口コミをご案内します。</p></div>
      <fieldset className="stack"><legend>条件の設定方法</legend><div className="row" role="group" aria-label="口コミ条件の設定方法"><button type="button" className={conditionStyle==='all'?'btn':'btn secondary'} aria-pressed={conditionStyle==='all'} onClick={()=>changeConditionStyle('all')}>{conditionStyle==='all'?'✓ ':''}すべての評価項目が基準点以上</button><button type="button" className={conditionStyle==='per-question'?'btn':'btn secondary'} aria-pressed={conditionStyle==='per-question'} onClick={()=>changeConditionStyle('per-question')}>{conditionStyle==='per-question'?'✓ ':''}質問ごとに基準点を設定</button></div></fieldset>
      {conditionStyle==='all'&&<label className="field">共通の基準点<select value={displayedCommonThreshold} onChange={e=>onChange({googleReviewRule:allRatingsRule(scores,Number(e.target.value))})}>{Array.from({length:maxScale},(_,n)=>n+1).map(n=><option key={n} value={n}>{n}点以上</option>)}</select><small className="muted">すべての評価質問がこの基準以上の場合だけ、Google口コミをご案内します。</small></label>}
      {conditionStyle==='per-question'&&<div className="stack">{scores.map(q=>{const existing=effectiveRule.conditions.find(c=>c.questionId===q.id&&c.operator==='gte');const threshold=existing?.value??defaultThreshold(q);return <label className="field" key={q.id}>Q{questions.indexOf(q)+1} {q.title}<select value={Math.min(threshold,scoreMax(q))} onChange={e=>changePerQuestionThreshold(q.id,Number(e.target.value))}>{Array.from({length:scoreMax(q)},(_,n)=>n+1).map(n=><option key={n} value={n}>{n}点以上</option>)}</select></label>})}<small className="muted">設定したすべての質問が、それぞれの基準点以上の場合に口コミをご案内します。</small></div>}
      {needsNormalization&&<p className="notice">以前の口コミ条件に重複・OR・不足質問が見つかったため、現在の評価質問を1回ずつ使うAND条件へ自動補正しました。</p>}
      {effectiveRule.conditions.length===0&&<p className="error" role="alert">口コミを条件付きで表示する場合は、評価条件を設定してください。</p>}
      <p className="notice" aria-live="polite">{reviewRuleDescription(effectiveRule,questions)}</p>
    </section>}
    {mode!=='disabled'&&<label className="field">口コミ用文章として使用する質問<select name="reviewTextQuestionId" value={config.reviewTextQuestionId===undefined?'__legacy':config.reviewTextQuestionId??''} onChange={e=>onChange({reviewTextQuestionId:e.target.value||null})}>{config.reviewTextQuestionId===undefined&&<option value="__legacy">既存設定：最初の入力済み長文</option>}<option value="">使用しない</option>{questions.filter(q=>q.type==='textarea').map(q=><option key={q.id} value={q.id}>Q{questions.indexOf(q)+1} {q.title}</option>)}</select></label>}
    <details className="completion-rule"><summary>Google口コミ条件をテスト</summary><div className="stack">{scores.map(q=><label className="field" key={q.id}>Q{questions.indexOf(q)+1} {q.title}<select aria-label={`テスト ${q.title}`} value={answers[q.id]??''} onChange={e=>setAnswers(a=>({...a,[q.id]:Number(e.target.value)}))}><option value="">未回答</option>{Array.from({length:scoreMax(q)},(_,i)=>i+1).map(n=><option value={n} key={n}>{n}点</option>)}</select></label>)}<p role="status">{evaluateGoogleReviewEligibility(previewConfig,questions,answers)?'✓ Google口コミを表示します':'Google口コミは表示されません'}</p></div></details>
  </div>;
}
