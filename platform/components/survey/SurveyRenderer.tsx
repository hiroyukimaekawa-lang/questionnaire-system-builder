'use client';

import Image from 'next/image';
import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { AnswerValue, SurveyVersion } from '@/types/database';
import { validateAnswers } from '@/lib/survey';
import { resolveSurveyTheme } from '@/lib/theme/templates';

function heroTextUnits(value:string){
  return Array.from(value.trim()).reduce((total,char)=>{
    if(char===' ')return total+.35;
    return total+(/[\u0000-\u00ff]/.test(char)?0.58:1);
  },0);
}

function heroFontSize(value:string,max:number,availableWidth:number){
  const units=Math.max(heroTextUnits(value),1);
  return Math.max(6,Math.min(max,availableWidth/units));
}

function questionNumber(index:number){
  return index<20?String.fromCodePoint(0x2460+index):`${index+1}.`;
}

export function SurveyRenderer({name,slug,version,preview=false}:{name:string;slug:string;version:SurveyVersion;preview?:boolean}){
  const config=resolveSurveyTheme(version.config),router=useRouter();
  const [answers,setAnswers]=useState<Record<string,AnswerValue>>({});
  const [errors,setErrors]=useState<Record<string,string>>({});
  const [pending,setPending]=useState(false);
  const [submitError,setSubmitError]=useState('');
  const refs=useRef<Record<string,HTMLElement|null>>({});
  const set=(id:string,value:AnswerValue)=>{setAnswers(current=>({...current,[id]:value}));setErrors(current=>({...current,[id]:''}));};
  async function submit(event:React.FormEvent){event.preventDefault();if(preview)return;const found=validateAnswers(version.questions,answers);setErrors(found);const first=Object.keys(found)[0];if(first){refs.current[first]?.scrollIntoView({behavior:'smooth',block:'center'});refs.current[first]?.focus();return;}setPending(true);setSubmitError('');try{const response=await fetch('/api/responses',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({slug,versionId:version.id,answers})});const json=await response.json();if(!response.ok)throw new Error(json.error||'送信できませんでした。');const comment=version.questions.filter(question=>question.type==='textarea').map(question=>answers[question.id]).find(Boolean);if(comment)sessionStorage.setItem(`survey-comment:${slug}`,String(comment));router.push(`/${slug}/thanks`);}catch(error){setSubmitError(error instanceof Error?error.message:'通信エラーが発生しました。');setPending(false);}}

  const heroTitle=config.heroTitle||config.title||name;
  const heroSubtitle=config.heroSubtitle||config.description;
  const heroBackground=config.heroBackgroundType==='solid'?config.heroOverlayColor:`linear-gradient(145deg, ${config.heroOverlayColor}, ${config.primaryColor} 62%, ${config.accentColor})`;
  const themeStyle={background:config.backgroundColor,'--survey-brand':config.primaryColor,'--survey-secondary':config.secondaryColor,'--survey-accent':config.accentColor,'--survey-hero-text':config.heroTextColor,'--survey-button':config.buttonBackground,'--survey-button-text':config.buttonTextColor,'--survey-card':config.cardBackground,'--survey-logo-badge':config.logoBadgeBackground,'--survey-radius':`${config.cardRadius}px`} as React.CSSProperties;
  const heroTitleStyle={fontSize:`${heroFontSize(heroTitle,32,308)}px`} as React.CSSProperties;
  const heroSubtitleStyle={fontSize:`${heroFontSize(heroSubtitle,14,308)}px`} as React.CSSProperties;

  return <div className={`survey-phone survey-theme survey-theme-${config.themeId}`} style={themeStyle}>
    <header className="survey-brand-header">
      {config.logoMode==='upload'&&config.logoUrl?<Image unoptimized src={config.logoUrl} width={168} height={72} alt={`${name} ロゴ`} className="survey-logo"/>:<div className="survey-brand-lockup">{config.logoMode!=='none'&&(config.iconUrl?<Image unoptimized src={config.iconUrl} width={44} height={44} alt="" className="survey-icon-image"/>:<span className="survey-icon-fallback" aria-hidden="true">{name.slice(0,1)}</span>)}<span><small>YOUR VOICE MATTERS</small><strong>{name}</strong></span></div>}
    </header>
    <section className="survey-hero" style={{background:heroBackground}}>
      <div className="survey-hero-inner">
        <p className="survey-hero-label">QUESTIONNAIRE</p>
        <h1 style={heroTitleStyle}>{heroTitle}</h1>
        <span className="survey-hero-rule" aria-hidden="true"/>
        <p className="survey-hero-subtitle" style={heroSubtitleStyle}>{heroSubtitle}</p>
      </div>
    </section>
    <main className="survey-content">
      <div className="survey-intro">
        <p className="survey-anonymous-note"><span aria-hidden="true">※</span>{config.anonymousText}</p>
        {config.introText&&config.introText!==config.anonymousText&&<p className="survey-intro-note">{config.introText}</p>}
      </div>
      <form onSubmit={submit} noValidate>
        {version.questions.map((question,index)=><fieldset className="question-card" key={question.id} ref={element=>{refs.current[question.id]=element;}} tabIndex={-1}>
          <legend className="question-legend"><span className="question-title"><span className="question-number" aria-hidden="true">{questionNumber(index)}</span><span>{question.title}</span>{question.required&&<span className="required-badge">※必須</span>}</span></legend>
          {question.description&&<p className="muted question-description">{question.description}</p>}
          {question.type==='rating_10'&&<><div className="rating-grid" role="radiogroup" aria-label={question.title}>{Array.from({length:10},(_,number)=>number+1).map(number=><button type="button" className="rating-button" key={number} role="radio" aria-checked={answers[question.id]===number} onClick={()=>set(question.id,number)}>{number}</button>)}</div><div className="rating-scale" aria-hidden="true"><span>→</span><span>←</span></div><div className="rating-labels"><span>{question.settings.minLabel||'非常に不満'}</span><span>{question.settings.maxLabel||'非常に満足'}</span></div></>}
          {question.type==='single_choice'&&question.options.map(option=><label className="choice" key={option.value}><input type="radio" name={question.id} checked={answers[question.id]===option.value} onChange={()=>set(question.id,option.value)}/><span>{option.label}</span></label>)}
          {question.type==='multiple_choice'&&question.options.map(option=>{const selected=Array.isArray(answers[question.id])?answers[question.id] as string[]:[];return <label className="choice" key={option.value}><input type="checkbox" checked={selected.includes(option.value)} onChange={event=>set(question.id,event.target.checked?[...selected,option.value]:selected.filter(value=>value!==option.value))}/><span>{option.label}</span></label>;})}
          {question.type==='textarea'&&<textarea aria-label={question.title} rows={5} placeholder={question.settings.placeholder} value={String(answers[question.id]??'')} onChange={event=>set(question.id,event.target.value)} className="survey-text-input survey-textarea"/>}
          {question.type==='text'&&<input aria-label={question.title} placeholder={question.settings.placeholder} value={String(answers[question.id]??'')} onChange={event=>set(question.id,event.target.value)} className="survey-text-input"/>}
          {errors[question.id]&&<p className="error" role="alert">{errors[question.id]}</p>}
        </fieldset>)}
        {submitError&&<p className="error" role="alert">{submitError}</p>}
        <button className="btn survey-submit" disabled={pending||preview}>{preview?'プレビューでは送信できません':pending?'送信中…':config.buttonLabel}</button>
      </form>
      <p className="survey-footer">ご協力ありがとうございます</p>
    </main>
  </div>;
}
