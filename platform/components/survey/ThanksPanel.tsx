'use client';
import {useState} from 'react';
type StoredCompletion={responseId?:string;message?:string;comment?:string};
export function ThanksPanel({slug,text,reviewUrl,primaryColor}:{slug:string;text:string;reviewUrl:string|null;primaryColor:string}){
  const [stored]=useState<StoredCompletion>(()=>{if(typeof window==='undefined')return {};try{return JSON.parse(sessionStorage.getItem(`survey-completion:${slug}`)||'{}')}catch{return {}}}),[copied,setCopied]=useState(false);
  const comment=stored.comment??'';
  async function review(){if(comment){await navigator.clipboard.writeText(comment);setCopied(true)}if(reviewUrl)window.open(reviewUrl,'_blank','noopener,noreferrer')}
  return <section className="card stack" style={{padding:24,textAlign:'center',borderTop:`5px solid ${primaryColor}`}}><h1>ご回答ありがとうございました</h1><p>{stored.message||text}</p>{comment&&<div style={{textAlign:'left',background:'#f8fafc',padding:14,borderRadius:9}}><strong>ご入力いただいたご感想</strong><p style={{whiteSpace:'pre-wrap'}}>{comment}</p></div>}{reviewUrl&&<><p>よろしければ、Googleでもご感想をお聞かせください。</p><button className="btn" style={{background:primaryColor}} onClick={review}>{comment?'感想をコピーしてGoogleクチコミへ':'Googleクチコミを書く'}</button>{copied&&<p className="notice" role="status">感想をコピーしました。</p>}<small className="muted">この案内は回答内容や点数にかかわらず、すべての回答者に同じ条件で表示されます。</small></>}</section>;
}
