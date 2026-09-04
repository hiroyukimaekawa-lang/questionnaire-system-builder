'use client';
import {useActionState} from 'react';
import {PublicUrlActions} from '@/components/admin/PublicUrlActions';

type PublishFormAction=(state:any,form:FormData)=>Promise<any>;

function openPreview(){
  const trigger=document.querySelector<HTMLButtonElement>('.mobile-preview-trigger');
  if(trigger&&getComputedStyle(trigger).display!=='none'){trigger.click();return;}
  document.querySelector('.live-preview-column')?.scrollIntoView({behavior:'smooth',block:'start'});
}

export function PublishSection({status,hasPublishedBefore,publicUrl,slug,publishAction,unpublishAction,variant='full'}:{
  status:string;
  hasPublishedBefore:boolean;
  publicUrl:string;
  slug:string;
  publishAction:PublishFormAction;
  unpublishAction:PublishFormAction;
  variant?:'full'|'compact';
}){
  const [publishState,publishFormAction,publishPending]=useActionState<any,FormData>(publishAction,null);
  const [unpublishState,unpublishFormAction,unpublishPending]=useActionState<any,FormData>(unpublishAction,null);
  const published=status==='published';
  const publishLabel=hasPublishedBefore?'変更内容を公開する':'アンケートを公開する';
  const justPublished=Boolean(publishState?.success);

  if(published){
    return <div className={`publish-panel publish-panel-live${variant==='compact'?' publish-panel-compact':''}`}>
      <div className="publish-panel-status">
        <strong>{justPublished?'公開しました ✓':'公開中 ✓'}</strong>
        {variant==='full'&&<p className="muted">{justPublished?'店舗へ公開URLを共有できます。':'このアンケートは現在公開されています。'}</p>}
      </div>
      <PublicUrlActions url={publicUrl} slug={slug} compact={variant==='compact'}/>
      <form action={unpublishFormAction}><button className="btn secondary" disabled={unpublishPending}>{unpublishPending?'処理中…':'非公開にする'}</button>{unpublishState?.error&&<span className="error" role="alert"> {unpublishState.error}</span>}</form>
    </div>;
  }

  return <div className={`publish-panel publish-panel-pending${variant==='compact'?' publish-panel-compact':''}`}>
    {variant==='full'&&<><p className="form-kicker">公開設定</p><h2>公開前の最終確認</h2><p className="muted">プレビューを確認して問題なければ、アンケートを公開できます。保存した内容だけが公開されます。</p></>}
    <div className="publish-panel-actions">
      {variant==='full'&&<button type="button" className="btn secondary" onClick={openPreview}>プレビューを確認</button>}
      <form action={publishFormAction}><button className="btn" disabled={publishPending}>{publishPending?'公開中…':publishLabel}</button></form>
    </div>
    {publishState?.error&&<span className="error" role="alert">{publishState.error}</span>}
  </div>;
}
