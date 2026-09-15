'use client';
import {useActionState,useState} from 'react';
import {saveCompletionSettingsAction} from '@/app/completion-actions';
import {ReviewSettings} from './ReviewSettings';
import type {SurveyConfig,SurveyQuestion} from '@/types/database';

export function CompletionSettingsForm({surveyId,versionId,config,questions,onChange}:{surveyId:string;versionId:string;config:SurveyConfig;questions:SurveyQuestion[];onChange?:(patch:Partial<SurveyConfig>)=>void}) {
  const [state,action,pending]=useActionState(saveCompletionSettingsAction.bind(null,surveyId,versionId),null);
  const [review,setReview]=useState(config);
  return <form action={action} className="card stack admin-form-card">
    <div><h2>Google口コミ設定</h2><p className="muted">口コミを案内する対象と基準点だけを設定します。</p></div>
    <ReviewSettings config={review} questions={questions} onChange={patch=>{setReview(current=>({...current,...patch}));onChange?.(patch)}}/>
    <input type="hidden" name="googleReviewRule" value={JSON.stringify(review.googleReviewRule??null)}/>
    <input type="hidden" name="completionRules" value={JSON.stringify(config.completionRules??[])}/>
    {state?.error&&<p className="error" role="alert">{state.error}</p>}
    {state?.success&&<p className="notice" role="status">{state.success}</p>}
    <button className="btn" disabled={pending}>{pending?'保存中…':'口コミ設定を保存'}</button>
  </form>;
}
