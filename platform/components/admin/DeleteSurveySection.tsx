'use client';
import {useActionState,useEffect,useState} from 'react';
import {useRouter} from 'next/navigation';
import {archiveAction} from '@/app/actions';

export function DeleteSurveySection({id,name,slug,status,baseUrl}:{id:string;name:string;slug:string;status:string;baseUrl:string}){
  const [open,setOpen]=useState(false),router=useRouter();
  const [state,action,pending]=useActionState(archiveAction.bind(null,id),null);
  useEffect(()=>{if(state?.success)router.push('/admin?status=archived')},[state,router]);
  return <section className="danger-zone" aria-labelledby="delete-survey-heading"><div><h2 id="delete-survey-heading">その他の操作</h2><p>回答データを残したまま、管理画面と公開URLからアンケートを取り下げます。</p></div><button className="danger-outline" type="button" onClick={()=>setOpen(true)}>アンケートを削除</button>{open?<div className="modal-backdrop" role="presentation" onMouseDown={event=>{if(event.target===event.currentTarget)setOpen(false)}}><div className="confirm-modal" role="dialog" aria-modal="true" aria-labelledby="delete-confirm-title"><h2 id="delete-confirm-title">このアンケートを削除しますか？</h2><dl><div><dt>店舗・医院名:</dt><dd>{name}</dd></div><div><dt>公開URL:</dt><dd>{baseUrl}/{slug}</dd></div><div><dt>現在の状態:</dt><dd>{status}</dd></div></dl><p>削除後は公開URLからアクセスできなくなります。<br/>回答データは削除されません。</p>{state?.error?<p className="error" role="alert">{state.error}</p>:null}<form action={action} className="modal-actions"><button type="button" className="btn secondary" onClick={()=>setOpen(false)} disabled={pending}>キャンセル</button><button type="submit" className="btn danger-button" disabled={pending}>{pending?'削除中…':'削除する'}</button></form></div></div>:null}</section>;
}
