'use client';

import {useCallback,useState} from 'react';
import {BasicForm,ConfigForm} from '@/components/admin/SurveyForms';
import {CompletionSettingsForm} from '@/components/admin/CompletionSettingsForm';
import {QuestionBuilder} from '@/components/admin/QuestionBuilder';
import {LiveSurveyPreview} from '@/components/admin/LiveSurveyPreview';
import {PublishSection} from '@/components/admin/PublishSection';
import type {SurveyQuestion,SurveyVersion} from '@/types/database';

type PublishFormAction=(state:any,form:FormData)=>Promise<any>;

export function SurveyEditorWorkspace({survey,draft,publicUrl,publishAction,unpublishAction,fiveStep=false}:{survey:any;draft:SurveyVersion;fiveStep?:boolean;publicUrl:string;publishAction:PublishFormAction;unpublishAction:PublishFormAction}){
  const [step,setStep]=useState(0);
  const steps=[{id:'basic-information',label:'1. 基本情報'},{id:'questions',label:'2. 質問作成'},{id:'completion-settings',label:'3. Google口コミ設定'},{id:'design-copy',label:'4. デザイン設定'},{id:'publish-settings',label:'5. プレビュー・公開'}] as const;
  const showSection=(id:string)=>!fiveStep||steps[step].id===id;
  const [name,setName]=useState(survey.name as string),[config,setConfig]=useState(draft.config),[questions,setQuestions]=useState(draft.questions);
  // identityMode is intentionally not handled here: ConfigForm owns its own
  // legacy | IdentityMode select state and already calls its onChange prop (which
  // updates this config state) exactly once, only on an explicit non-legacy choice.
  // A second, unconditional write from this native-event listener raced that
  // controlled <select> and could revert the visible selection back to legacy.
  const syncForm=(event:React.FormEvent<HTMLElement>)=>{const input=event.target as HTMLInputElement|HTMLTextAreaElement|HTMLSelectElement;if(!input.name||input.name==='identityMode')return;if(input.name==='anonymous'){setConfig(current=>({...current,anonymous:input.value==='true'}));return;}if(input.name==='name'){setName(input.value);return;}if(['primaryColor','backgroundColor','secondaryColor','accentColor','heroOverlayColor','heroTextColor','buttonBackground','buttonTextColor','cardBackground','logoBadgeBackground','title','heroLabel','heroTitle','questionFontSize','heroSubtitle','description','introText','anonymousText','completionText','submitLabel','logoUrl','iconUrl','logoMode','heroBackgroundType','themeId','googleReviewMode','googleReviewUrl'].includes(input.name))setConfig(current=>input.name==='submitLabel'?{...current,submitLabel:input.value,buttonLabel:input.value}:{...current,[input.name]:input.name==='questionFontSize'?Number(input.value):input.value});};
  const questionsChanged=useCallback((next:SurveyQuestion[])=>setQuestions(next),[]);

  const revealTarget=(container:HTMLElement|null,focusable?:HTMLElement|null)=>{
    if(!container)return;
    container.scrollIntoView({behavior:'smooth',block:'center'});
    const target=focusable??container.querySelector<HTMLElement>('input,textarea,select,button');
    window.setTimeout(()=>target?.focus({preventScroll:true}),250);
    container.classList.add('edit-target-flash');
    window.setTimeout(()=>container.classList.remove('edit-target-flash'),1200);
  };

  const focusTarget=(target:string)=>{
    if(fiveStep){if(target.startsWith('question-'))setStep(1);else if(target==='googleReview'||['completionText','googleReviewUrl','googleReviewMode'].includes(target))setStep(2);else if(['logoUrl','iconUrl','primaryColor','backgroundColor','themeId','heroLabel','heroTitle','heroSubtitle','questionFontSize','description','introText'].includes(target))setStep(3);else setStep(0);}
    if(target.startsWith('question-')){
      const questionId=target.slice(9);
      const card=Array.from(document.querySelectorAll<HTMLElement>('.editor-questions .question-builder-card')).find(element=>element.dataset.questionId===questionId)??null;
      revealTarget(card,card?.querySelector<HTMLElement>('[data-question-title]'));
      return;
    }

    const named=document.querySelector<HTMLElement>(`[name="${target}"]`);
    if(named){revealTarget(named.closest<HTMLElement>('.field')??named,named);return;}

    if(target==='googleReview'){
      const section=document.getElementById('completion-settings');
      revealTarget(section,section?.querySelector<HTMLElement>('input[name="googleReviewMode"],input[name="googleReviewUrl"],select,button'));
      return;
    }

    const byId=document.getElementById(target);
    revealTarget(byId);
  };

  const version={...draft,config,questions};
  return <div className="preview-first-layout"><div className="editor-panel" onChange={syncForm}>
    {fiveStep?<nav className="editor-section-nav" aria-label="編集ステップ">{steps.map((item,index)=><button key={item.id} type="button" className={index===step?"btn":"btn secondary"} aria-current={index===step?"step":undefined} onClick={()=>setStep(index)}>{item.label}</button>)}</nav>:<nav className="editor-section-nav" aria-label="編集セクション"><a href="#basic-information">基本情報</a><a href="#design-copy">文章・ロゴ</a><a href="#questions">質問</a><a href="#completion-settings">口コミ・完了条件</a><a href="#publish-settings">公開設定</a></nav>}
    <section id="basic-information" style={{display:showSection('basic-information')?undefined:'none'}} className="editor-section"><BasicForm survey={survey}/></section>
    <section id="design-copy" style={{display:showSection('design-copy')?undefined:'none'}} className="editor-section"><ConfigForm surveyId={survey.id} versionId={draft.id} config={draft.config} onChange={patch=>setConfig(c=>({...c,...patch}))}/></section>
    <section id="questions" style={{display:showSection('questions')?undefined:'none'}} className="editor-section editor-questions"><QuestionBuilder surveyId={survey.id} versionId={draft.id} initial={draft.questions} onChange={questionsChanged}/></section>
    <section id="completion-settings" style={{display:showSection('completion-settings')?undefined:'none'}} className="editor-section"><CompletionSettingsForm surveyId={survey.id} versionId={draft.id} config={draft.config} questions={questions} onChange={patch=>setConfig(c=>({...c,...patch}))}/></section>
    <section id="publish-settings" style={{display:showSection('publish-settings')?undefined:'none'}} className="editor-section card publish-help"><PublishSection variant="full" status={survey.status} hasPublishedBefore={Boolean(survey.current_published_version_id)} publicUrl={publicUrl} slug={survey.slug} publishAction={publishAction} unpublishAction={unpublishAction}/></section>
    {fiveStep?<div className="row"><button className="btn secondary" type="button" disabled={step===0} onClick={()=>setStep(s=>Math.max(0,s-1))}>前へ</button><button className="btn" type="button" disabled={step===4} onClick={()=>setStep(s=>Math.min(4,s+1))}>次へ</button></div>:null}
  </div><LiveSurveyPreview name={name||'店舗・医院名'} version={version} onEdit={focusTarget}/></div>;
}
