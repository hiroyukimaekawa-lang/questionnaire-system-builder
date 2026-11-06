'use client';
import {useActionState,useState} from 'react';
import {saveCompletionSettingsAction} from '@/app/completion-actions';
import {ReviewSettings} from './ReviewSettings';
import {CompletionRuleSettings} from './CompletionRuleSettings';
import {resolvedCompletionRules} from '@/lib/completion';
import type {SurveyConfig,SurveyQuestion} from '@/types/database';

export function CompletionSettingsForm({surveyId,versionId,config,questions,onChange}:{surveyId:string;versionId:string;config:SurveyConfig;questions:SurveyQuestion[];onChange?:(patch:Partial<SurveyConfig>)=>void}) {
  const [state,action,pending]=useActionState(saveCompletionSettingsAction.bind(null,surveyId,versionId),null);
  const [review,setReview]=useState(()=>({...config,completionRules:resolvedCompletionRules(config)}));
  const conditional=review.googleReviewMode==='score'||String(review.googleReviewMode)==='conditional';
  return <form action={action} className="card stack admin-form-card">
    <div><h2>STEP3 Google口コミ・評価分類</h2><p className="muted">旧アンケートに保存されている点数条件は内部評価分類として引き継ぎます。Google口コミの案内は評価点で選別せず、すべての回答者へ公平に行ってください。</p></div>
    <ReviewSettings config={review} questions={questions} onChange={patch=>{setReview(current=>({...current,...patch}));onChange?.(patch)}}/>
    {conditional&&<CompletionRuleSettings rules={review.completionRules??[]} questions={questions} completionText={review.completionText} onChange={completionRules=>{setReview(current=>({...current,completionRules}));onChange?.({completionRules})}}/>}
    <input type="hidden" name="googleReviewRule" value={JSON.stringify(review.googleReviewRule??null)}/>
    <input type="hidden" name="scoreGatesGoogleReview" value={String(review.scoreGatesGoogleReview===true)}/>
    <input type="hidden" name="completionRules" value={JSON.stringify(review.completionRules??[])}/>
    {state?.error&&<p className="error" role="alert">{state.error}</p>}
    {state?.success&&<p className="notice" role="status">{state.success}</p>}
    <button className="btn" disabled={pending}>{pending?'保存中…':'回答後設定を保存'}</button>
  </form>;
}
