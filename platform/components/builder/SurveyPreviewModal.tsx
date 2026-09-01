'use client';

import { useEffect, useRef } from 'react';
import { SurveyRenderer } from '@/components/survey/SurveyRenderer';
import type { SurveyVersion } from '@/types/database';

export function SurveyPreviewModal({open,onClose,name,version}:{open:boolean;onClose:()=>void;name:string;version:SurveyVersion}){
  const closeRef=useRef<HTMLButtonElement>(null);
  useEffect(()=>{
    if(!open)return;
    const previous=document.body.style.overflow;
    document.body.style.overflow='hidden';
    closeRef.current?.focus();
    const onKeyDown=(event:KeyboardEvent)=>{if(event.key==='Escape')onClose();};
    document.addEventListener('keydown',onKeyDown);
    return()=>{document.body.style.overflow=previous;document.removeEventListener('keydown',onKeyDown);};
  },[open,onClose]);
  if(!open)return null;
  return <div className="preview-overlay" role="presentation" onMouseDown={event=>{if(event.target===event.currentTarget)onClose();}}><section className="preview-dialog" role="dialog" aria-modal="true" aria-labelledby="preview-title"><header className="preview-dialog-header"><div><p className="eyebrow">表示確認</p><h2 id="preview-title">アンケートプレビュー</h2></div><button ref={closeRef} className="preview-close" type="button" onClick={onClose} aria-label="プレビューを閉じる">× <span>閉じる</span></button></header><div className="preview-dialog-scroll"><div className="preview-phone"><SurveyRenderer name={name} slug="preview" version={version} preview/></div></div></section></div>;
}
