'use client';

import {useCallback,useState} from 'react';
import {BasicForm,ConfigForm} from '@/components/admin/SurveyForms';
import {CompletionSettingsForm} from '@/components/admin/CompletionSettingsForm';
import {QuestionBuilder} from '@/components/admin/QuestionBuilder';
import {LiveSurveyPreview} from '@/components/admin/LiveSurveyPreview';
import {PublishSection} from '@/components/admin/PublishSection';
import type {SurveyQuestion,SurveyVersion} from '@/types/database';

type PublishFormAction=(state:any,form:FormData)=>Promise<any>;

export function SurveyEditorWorkspace({survey,draft,publicUrl,publishAction,unpublishAction}:{survey:any;draft:SurveyVersion;publicUrl:string;publishAction:PublishFormAction;unpublishAction:PublishFormAction}){
  const [name,setName]=useState(survey.name as string),[config,setConfig]=useState(draft.config),[questions,setQuestions]=useState(draft.questions);
  const syncForm=(event:React.FormEvent<HTMLElement>)=>{const input=event.target as HTMLInputElement|HTMLTextAreaElement|HTMLSelectElement;if(!input.name)return;if(input.name==='name'){setName(input.value);return;}if(['primaryColor','backgroundColor','secondaryColor','accentColor','heroOverlayColor','heroTextColor','buttonBackground','buttonTextColor','cardBackground','logoBadgeBackground','title','heroLabel','heroTitle','questionFontSize','heroSubtitle','description','introText','anonymousText','completionText','submitLabel','logoUrl','iconUrl','logoMode','heroBackgroundType','themeId','googleReviewMode','googleReviewUrl'].includes(input.name))setConfig(current=>input.name==='submitLabel'?{...current,submitLabel:input.value,buttonLabel:input.value}:{...current,[input.name]:input.name==='questionFontSize'?Number(input.value):input.value});};
  const questionsChanged=useCallback((next:SurveyQuestion[])=>setQuestions(next),[]);
  const focusTarget=(target:string)=>{if(target.startsWith('question-')){const index=questions.findIndex(q=>q.id===target.slice(9));const card=document.querySelectorAll<HTMLElement>('.editor-questions .question-builder-card')[index];card?.scrollIntoView({behavior:'smooth',block:'center'});card?.querySelector<HTMLInputElement>('input')?.focus();return;}const element=document.querySelector<HTMLElement>(`[name="${target}"]`)??document.getElementById(target);element?.scrollIntoView({behavior:'smooth',block:'center'});element?.focus();element?.classList.add('edit-target-flash');window.setTimeout(()=>element?.classList.remove('edit-target-flash'),1000);};
  const version={...draft,config,questions};
  return <div className="preview-first-layout"><div className="editor-panel" onInput={syncForm} onChange={syncForm}>
    <nav className="editor-section-nav" aria-label="編集セクション"><a href="#basic-information">基本情報</a><a href="#design-copy">デザイン・文章</a><a href="#questions">質問</a><a href="#completion-settings">口コミ・完了条件</a><a href="#publish-settings">公開設定</a></nav>
    <section id="basic-information" className="editor-section"><BasicForm survey={survey}/></section>
    <section id="design-copy" className="editor-section"><ConfigForm surveyId={survey.id} versionId={draft.id} config={draft.config}/></section>
    <section id="questions" className="editor-section editor-questions"><QuestionBuilder surveyId={survey.id} versionId={draft.id} initial={draft.questions} onChange={questionsChanged}/></section>
    <section id="completion-settings" className="editor-section"><CompletionSettingsForm surveyId={survey.id} versionId={draft.id} config={draft.config} questions={questions}/></section>
    <section id="publish-settings" className="editor-section card publish-help"><PublishSection variant="full" status={survey.status} hasPublishedBefore={Boolean(survey.current_published_version_id)} publicUrl={publicUrl} slug={survey.slug} publishAction={publishAction} unpublishAction={unpublishAction}/></section>
  </div><LiveSurveyPreview name={name||'店舗・医院名'} version={version} onEdit={focusTarget}/></div>;
}
