'use client';

import { useCallback, useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { completeBuilderAction, saveBuilderSessionAction } from '@/app/actions';
import { SurveyPreviewModal } from '@/components/builder/SurveyPreviewModal';
import { defaultCompletionText, defaultIntroText, ruleBasedBuilderEngine } from '@/lib/builder/engine';
import { defaultConfig } from '@/lib/survey';
import { getThemeTemplate, themeIdForBusiness } from '@/lib/theme/templates';
import type { BuilderContext, BuilderStep, SurveyVersion } from '@/types/database';

type HistoryEntry={step:BuilderStep;value:unknown;label:string};
type SaveStatus='idle'|'saving'|'saved'|'error';
const labels:Record<string,string>={satisfaction:'顧客満足度',improvement:'店舗改善',patient:'患者アンケート',google_review:'Google口コミ導線',other:'その他',clinic:'クリニック',restaurant:'飲食店',salon:'美容室',decided:'ほぼ決まっている',partial:'一部だけ決まっている',none:'何も決まっていない',clinic_standard:'クリニック標準',restaurant_standard:'飲食店標準',salon_standard:'美容室標準',custom:'自分で作る'};

export function BuilderWorkspace({initial={},initialSessionId=null}:{initial?:BuilderContext;initialSessionId?:string|null}){
  const [context,setContext]=useState<BuilderContext>(initial);
  const [history,setHistory]=useState<HistoryEntry[]>([]);
  const [sessionId,setSessionId]=useState(initialSessionId);
  const [message,setMessage]=useState('');
  const [saveStatus,setSaveStatus]=useState<SaveStatus>('idle');
  const [previewOpen,setPreviewOpen]=useState(false);
  const [pending,startTransition]=useTransition();
  const router=useRouter();
  const step=useMemo(()=>ruleBasedBuilderEngine.getNextStep(context),[context]);

  const answer=(value:unknown,label?:string)=>{if(!step)return;let actual=value;if(step.id==='introText'&&!value)actual=defaultIntroText(context.anonymous??true);if(step.id==='completionText'&&!value)actual=defaultCompletionText;setContext(ruleBasedBuilderEngine.applyAnswer(context,step.id,actual));setHistory(entries=>[...entries,{step,value:actual,label:label??labels[String(actual)]??String(actual)}]);setMessage('');setSaveStatus('idle');};
  const edit=(index:number)=>{const entry=history[index],preserved={...context};delete (preserved as Record<string,unknown>)[entry.step.id];if(entry.step.id==='businessType'){delete preserved.template;delete preserved.questions;delete preserved.questionsConfirmed;}if(entry.step.id==='template'||entry.step.id==='questions')delete preserved.questionsConfirmed;setContext(preserved);setHistory(entries=>entries.slice(0,index));setSaveStatus('idle');};
  const save=()=>{setSaveStatus('saving');setMessage('');startTransition(async()=>{const result=await saveBuilderSessionAction(sessionId,context,step?.id??'summary');if(result.sessionId)setSessionId(result.sessionId);if(result.error){setSaveStatus('error');setMessage('保存できませんでした。入力内容は保持されています。');}else{setSaveStatus('saved');setMessage('保存しました');}});};
  const complete=()=>startTransition(async()=>{const result=await completeBuilderAction(sessionId,context);if(result.surveyId)router.push(`/admin/surveys/${result.surveyId}`);else setMessage(result.error??'作成できませんでした。');});
  const closePreview=useCallback(()=>setPreviewOpen(false),[]);
  const previewTheme=getThemeTemplate(context.themeId??themeIdForBusiness(context.businessType??'other'));
  const version:SurveyVersion={id:'builder-preview',surveyId:'builder-preview',version:1,status:'draft',config:{...defaultConfig,...previewTheme.config,themeId:previewTheme.id,title:context.storeName?`${context.storeName} お客様アンケート`:previewTheme.config.heroTitle,heroTitle:previewTheme.config.heroTitle,heroSubtitle:previewTheme.config.heroSubtitle,introText:context.introText??defaultIntroText(context.anonymous??true),anonymousText:context.anonymous===false?'回答内容は運営者が確認します。':defaultConfig.anonymousText,completionText:context.completionText??defaultCompletionText,primaryColor:context.mainColor??previewTheme.config.primaryColor,logoMode:context.logoMode??previewTheme.config.logoMode,logoUrl:context.logoUrl??null,googleReviewUrl:context.googleReviewUrl??null},questions:context.questions??[]};

  return <div className="builder-page"><header className="builder-page-header"><p className="eyebrow">アンケート設計</p><h1>新しいアンケートを作成</h1><p>お客様から聞いた内容を選ぶだけで、構成を整理します。</p></header><div className="builder-action-bar" aria-label="作成操作"><div className="builder-progress"><span className="status-dot" aria-hidden="true"/><div><strong>{ruleBasedBuilderEngine.isComplete(context)?'作成内容が確定しました':'作成途中'}</strong><small>{context.storeName||'店舗・医院名はまだ未入力です'}</small></div></div><div className="builder-actions"><button className="btn secondary" type="button" disabled={pending||saveStatus==='saving'} onClick={save}>{saveStatus==='saving'?'保存しています...':'下書き保存'}</button><button className="btn preview-button" type="button" onClick={()=>setPreviewOpen(true)}><span aria-hidden="true">👁</span> プレビュー</button></div></div>{message&&<p className={saveStatus==='error'?'save-message error':'save-message notice'} role={saveStatus==='error'?'alert':'status'}>{message}</p>}<main className="builder-chat"><div className="chat-log" aria-live="polite">{history.map((entry,index)=><div key={`${entry.step.id}-${index}`} className="history-block"><div className="history-label">過去の質問</div><div className="chat-bubble system">{entry.step.question}</div><div className="chat-answer"><div><small>回答</small><span>{entry.label}</span></div><button type="button" onClick={()=>edit(index)}>変更</button></div></div>)}{step&&<section className="current-step" aria-labelledby="current-builder-question"><p className="current-label">現在の質問</p><div className="current-question-card"><h2 id="current-builder-question">{step.question}</h2><details><summary>この質問について</summary><p>{step.reason}</p></details><StepInput step={step} context={context} answer={answer} complete={complete} pending={pending}/></div></section>}</div></main><SurveyPreviewModal open={previewOpen} onClose={closePreview} name={context.storeName??'店舗・医院名'} version={version}/></div>;
}

function StepInput({step,context,answer,complete,pending}:{step:BuilderStep;context:BuilderContext;answer:(value:unknown,label?:string)=>void;complete:()=>void;pending:boolean}){
  const [text,setText]=useState('');
  if(step.inputType==='choice')return <div className="builder-options">{step.options?.map(o=><button className="option-card" type="button" key={o.value} onClick={()=>answer(o.value,o.label)}><strong>{o.label}</strong>{o.description&&<small>{o.description}</small>}<span className="option-arrow" aria-hidden="true">›</span></button>)}</div>;
  if(step.inputType==='question_review')return <div className="stack question-review-list">{context.questions?.map((q,i)=><div className="question-review" key={q.id}><strong>Q{i+1} {q.title}</strong><span>{q.type==='rating_10'?'1〜10評価':q.type==='textarea'?'自由記述':q.type.includes('choice')?'選択式':'短文入力'} · {q.required?'必須':'任意'}</span></div>)}<button className="btn" type="button" onClick={()=>answer('confirmed','全質問を確認しました')}>この構成で進む</button></div>;
  if(step.inputType==='summary')return <div className="summary-card"><dl><dt>店舗名</dt><dd>{context.storeName}</dd><dt>業種</dt><dd>{labels[context.businessType??'']}</dd><dt>目的</dt><dd>{labels[context.purpose??'']??context.purposeDetail}</dd><dt>匿名</dt><dd>{context.anonymous?'はい':'いいえ'}</dd><dt>質問数</dt><dd>{context.questions?.length}問</dd>{context.questions?.map((q,i)=><div key={q.id} className="summary-question"><dt>Q{i+1}</dt><dd>{q.title}{q.type==='rating_10'?'（1〜10）':''}</dd></div>)}<dt>Google口コミ</dt><dd>{context.googleReviewEnabled?'設定あり':'未設定'}</dd><dt>メインカラー</dt><dd>{context.mainColor}</dd></dl><button className="btn" type="button" disabled={pending} onClick={complete}>{pending?'作成中…':'この内容で作成'}</button></div>;
  const suggested=step.id==='introText'?defaultIntroText(context.anonymous??true):step.id==='completionText'?defaultCompletionText:step.id==='mainColor'?'#5E969E':'';
  return <form className="answer-form" onSubmit={event=>{event.preventDefault();answer(text||suggested,text||suggested)}}>{step.inputType==='color'?<input aria-label="メインカラー" type="color" value={text||suggested} onChange={event=>setText(event.target.value)}/>:<textarea aria-label={step.question} rows={step.id==='introText'||step.id==='completionText'?4:2} value={text||suggested} onChange={event=>setText(event.target.value)} placeholder={step.inputType==='url'?'https://...':'入力してください'}/>}<button className="btn" type="submit">{suggested&&text===''?'おすすめのまま':'回答する'}</button></form>;
}
