'use client';
import {useEffect,useMemo,useRef,useState} from 'react';
import type {GoogleReviewRule,SurveyConfig,SurveyQuestion} from '@/types/database';
import {scoreMax} from '@/lib/survey';
import {evaluateGoogleReviewEligibility,safeGoogleReviewUrl} from '@/lib/google-review';
import {reviewRuleDescription} from '@/lib/builder/settings';

const EMPTY_REVIEW_RULE:GoogleReviewRule={logic:'or',conditions:[]};
function defaultThreshold(question:SurveyQuestion){return Math.min(9,scoreMax(question));}
function normalizedRule(scores:SurveyQuestion[],current:GoogleReviewRule,logic:'and'|'or'=current.logic):GoogleReviewRule{
  return {logic,conditions:scores.map(q=>{
    const existing=current.conditions.find(c=>c.questionId===q.id&&c.operator==='gte');
    return {questionId:q.id,operator:'gte',value:existing?Math.min(Math.max(existing.value,1),scoreMax(q)):defaultThreshold(q)};
  })};
}
function ruleNeedsNormalization(rule:GoogleReviewRule,scores:SurveyQuestion[]){
  const scoreIds=new Set(scores.map(q=>q.id));
  const conditionIds=rule.conditions.map(c=>c.questionId);
  return rule.conditions.length!==scores.length||new Set(conditionIds).size!==conditionIds.length||rule.conditions.some(c=>c.operator!=='gte'||!scoreIds.has(c.questionId))||scores.some(q=>!conditionIds.includes(q.id));
}

export function ReviewSettings({config,questions,onChange}:{config:SurveyConfig;questions:SurveyQuestion[];onChange:(patch:Partial<SurveyConfig>)=>void}) {
  const scores=useMemo(()=>questions.filter(q=>q.type==='rating_10'),[questions]);
  const mode=config.googleReviewMode??(config.googleReviewUrl?'all':'disabled');
  const rule=config.googleReviewRule??EMPTY_REVIEW_RULE;
  const needsNormalization=mode==='score'&&scores.length>0&&ruleNeedsNormalization(rule,scores);
  const effectiveRule=needsNormalization?normalizedRule(scores,rule,rule.logic):rule;
  const [answers,setAnswers]=useState<Record<string,number>>({});
  const link=safeGoogleReviewUrl(config.googleReviewUrl);
  const maxScale=scores.length?Math.max(...scores.map(scoreMax)):10;
  const normalizedSignature=needsNormalization?`${rule.logic}:${scores.map(q=>q.id).join('|')}:${JSON.stringify(rule.conditions)}`:'';
  const lastNormalized=useRef('');

  useEffect(()=>{
    if(!needsNormalization||lastNormalized.current===normalizedSignature)return;
    lastNormalized.current=normalizedSignature;
    onChange({googleReviewRule:effectiveRule});
  },[effectiveRule,needsNormalization,normalizedSignature,onChange]);

  const changeMode=(value:'disabled'|'all'|'score')=>{
    if(value==='score'&&scores.length){
      const next=!rule.conditions.length||ruleNeedsNormalization(rule,scores)?normalizedRule(scores,rule,'or'):rule;
      onChange({googleReviewMode:value,googleReviewRule:next});
      return;
    }
    onChange({googleReviewMode:value});
  };
  const changeLogic=(logic:'and'|'or')=>onChange({googleReviewRule:normalizedRule(scores,effectiveRule,logic)});
  const changeThreshold=(questionId:string,value:number)=>{
    const normalized=normalizedRule(scores,effectiveRule,effectiveRule.logic);
    onChange({googleReviewRule:{...normalized,conditions:normalized.conditions.map(c=>c.questionId===questionId?{...c,value}:c)}});
  };
  const applyCommonThreshold=(value:number)=>onChange({googleReviewRule:{logic:effectiveRule.logic,conditions:scores.map(q=>({questionId:q.id,operator:'gte',value:Math.min(value,scoreMax(q))}))}});
  const previewConfig={...config,googleReviewRule:effectiveRule};
  const eligible=evaluateGoogleReviewEligibility(previewConfig,questions,answers);

  return <div className="stack review-settings">
    <fieldset className="stack"><legend>Google口コミへの案内</legend><input type="hidden" name="googleReviewMode" value={mode}/><div className="row" role="group" aria-label="Google口コミへの案内方法">{([['disabled','使用しない'],['all','全回答者へ表示'],['score','評価条件を満たした人だけ表示']] as const).map(([value,label])=><button type="button" className={mode===value?'btn':'btn secondary'} key={value} aria-pressed={mode===value} disabled={value==='score'&&!scores.length} onClick={()=>changeMode(value)}>{mode===value?'✓ ':''}{label}</button>)}</div></fieldset>
    {!scores.length&&<small className="muted">評価条件を使うには、先にスコアリング質問を1つ以上追加してください。</small>}
    {mode!=='disabled'&&<><label className="field">Google口コミURL<input name="googleReviewUrl" type="url" value={config.googleReviewUrl??''} onChange={e=>onChange({googleReviewUrl:e.target.value})} placeholder="https://g.page/r/…/review"/></label>{link&&<a className="btn secondary" href={link} target="_blank" rel="noopener noreferrer">口コミページを確認</a>}</>}
    {mode==='score'&&<section className="completion-rule stack"><div><h3>口コミを表示する条件</h3><p className="muted">各質問の基準点を決め、どれか1つを満たせば表示するか、すべて満たした場合だけ表示するかを選びます。</p></div>
      <fieldset className="stack"><legend>判定方法</legend><div className="row" role="group" aria-label="口コミ条件の判定方法"><button type="button" className={effectiveRule.logic==='or'?'btn':'btn secondary'} aria-pressed={effectiveRule.logic==='or'} onClick={()=>changeLogic('or')}>{effectiveRule.logic==='or'?'✓ ':''}どれか1つ満たしたら表示</button><button type="button" className={effectiveRule.logic==='and'?'btn':'btn secondary'} aria-pressed={effectiveRule.logic==='and'} onClick={()=>changeLogic('and')}>{effectiveRule.logic==='and'?'✓ ':''}すべて満たしたら表示</button></div></fieldset>
      <div className="stack"><div className="row"><strong>各質問の基準点</strong><label className="field" style={{minWidth:220}}>すべて同じ基準点にする<select value="" onChange={e=>{if(e.target.value)applyCommonThreshold(Number(e.target.value))}}><option value="">一括設定を選択</option>{Array.from({length:maxScale},(_,n)=>n+1).map(n=><option key={n} value={n}>{n}点以上</option>)}</select></label></div>{scores.map(q=>{const existing=effectiveRule.conditions.find(c=>c.questionId===q.id&&c.operator==='gte');const threshold=existing?.value??defaultThreshold(q);return <label className="field" key={q.id}>Q{questions.indexOf(q)+1} {q.title}<select value={Math.min(threshold,scoreMax(q))} onChange={e=>changeThreshold(q.id,Number(e.target.value))}>{Array.from({length:scoreMax(q)},(_,n)=>n+1).map(n=><option key={n} value={n}>{n}点以上</option>)}</select></label>})}</div>
      {needsNormalization&&<p className="notice">以前の口コミ条件に重複・不足・旧形式が見つかったため、現在の評価質問を1回ずつ使う条件へ自動補正しました。</p>}
      {effectiveRule.conditions.length===0&&<p className="error" role="alert">口コミを条件付きで表示する場合は、評価条件を設定してください。</p>}
      <div><strong>現在の設定</strong><p className="notice" aria-live="polite">{reviewRuleDescription(effectiveRule,questions)}</p></div>
      <div className="stack"><strong>動作確認</strong><p className="muted">実際の回答を入れて、口コミが表示されるか確認できます。</p>{scores.map(q=><label className="field" key={q.id}>Q{questions.indexOf(q)+1} {q.title}<select aria-label={`テスト ${q.title}`} value={answers[q.id]??''} onChange={e=>setAnswers(a=>({...a,[q.id]:Number(e.target.value)}))}><option value="">未回答</option>{Array.from({length:scoreMax(q)},(_,i)=>i+1).map(n=><option value={n} key={n}>{n}点</option>)}</select></label>)}<p className={eligible?'notice':'muted'} role="status">{eligible?'✓ この回答ではGoogle口コミを表示します':'この回答ではGoogle口コミを表示しません'}</p></div>
    </section>}
    {mode!=='disabled'&&<label className="field">口コミ用文章として使用する質問<select name="reviewTextQuestionId" value={config.reviewTextQuestionId===undefined?'__legacy':config.reviewTextQuestionId??''} onChange={e=>onChange({reviewTextQuestionId:e.target.value||null})}>{config.reviewTextQuestionId===undefined&&<option value="__legacy">既存設定：最初の入力済み長文</option>}<option value="">使用しない</option>{questions.filter(q=>q.type==='textarea').map(q=><option key={q.id} value={q.id}>Q{questions.indexOf(q)+1} {q.title}</option>)}</select></label>}
  </div>;
}
