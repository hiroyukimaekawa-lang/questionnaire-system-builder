'use client';

import Link from 'next/link';
import {useEffect,useRef,useState} from 'react';
import {ActionForm} from '@/components/admin/ActionForm';
import {archiveAction,publishAction,unpublishAction} from '@/app/actions';
import type {Role} from '@/types/database';

export function SurveyActionsMenu({surveyId,status,role}:{surveyId:string;status:string;role:Role}){
  const [open,setOpen]=useState(false),[position,setPosition]=useState({top:0,left:0});
  const rootRef=useRef<HTMLDivElement>(null),buttonRef=useRef<HTMLButtonElement>(null);

  useEffect(()=>{
    if(!open)return;
    const close=(event:MouseEvent)=>{if(!rootRef.current?.contains(event.target as Node))setOpen(false)};
    const escape=(event:KeyboardEvent)=>{if(event.key==='Escape'){setOpen(false);buttonRef.current?.focus()}};
    const closeForViewportChange=()=>setOpen(false);
    document.addEventListener('pointerdown',close);document.addEventListener('keydown',escape);window.addEventListener('resize',closeForViewportChange);window.addEventListener('scroll',closeForViewportChange,true);
    return()=>{document.removeEventListener('pointerdown',close);document.removeEventListener('keydown',escape);window.removeEventListener('resize',closeForViewportChange);window.removeEventListener('scroll',closeForViewportChange,true)};
  },[open]);

  const toggle=()=>{
    if(!open&&buttonRef.current){const rect=buttonRef.current.getBoundingClientRect(),menuHeight=268,menuWidth=196,spaceBelow=window.innerHeight-rect.bottom;setPosition({top:spaceBelow>=menuHeight?rect.bottom+6:Math.max(8,rect.top-menuHeight-6),left:Math.min(window.innerWidth-menuWidth-8,Math.max(8,rect.right-menuWidth))})}
    setOpen(value=>!value);
  };

  return <div className="row-actions" ref={rootRef}><button ref={buttonRef} type="button" aria-haspopup="menu" aria-expanded={open} onClick={toggle}>操作 <span aria-hidden="true">⌄</span></button>{open?<div className="actions-popover" role="menu" style={position}><Link role="menuitem" href={`/admin/surveys/${surveyId}`}>編集</Link><Link role="menuitem" href={`/admin/surveys/${surveyId}/preview`}>プレビュー</Link><Link role="menuitem" href={`/admin/surveys/${surveyId}/responses`}>回答を見る</Link><Link role="menuitem" href={`/admin/surveys/new?duplicate=${surveyId}`}>複製する</Link>{status==='published'?<ActionForm action={unpublishAction.bind(null,surveyId)} label="非公開にする" className="link-action"/>:<ActionForm action={publishAction.bind(null,surveyId)} label="この内容で公開" className="link-action"/>}{role==='admin'&&<ActionForm action={archiveAction.bind(null,surveyId)} label="削除する" className="link-action danger-action" confirmText={'このアンケートを削除しますか？\n公開中の場合も公開URLからアクセスできなくなります。\n回答データは削除されません。'}/>}</div>:null}</div>;
}
