'use client';
import {useActionState} from 'react';
import {inviteViewerAction} from '@/app/admin/invitation-actions';

export function InviteUserForm({surveyId}:{surveyId:string}){
  const [state,action,pending]=useActionState(inviteViewerAction.bind(null,surveyId),null);
  return <form action={action} className="card invite-form stack"><div><h2>共有・招待</h2><p className="muted">招待された方は、この案件の回答と分析だけを閲覧できます。</p></div><label className="field"><span>メールアドレス</span><input name="email" type="email" placeholder="doctor@example.com" autoComplete="email" required/></label><label className="field"><span>権限</span><select name="permission" defaultValue="viewer" disabled><option value="viewer">分析閲覧のみ</option></select></label>{state?.error?<p className="error" role="alert">{state.error}</p>:null}{state?.success?<p className="notice" role="status">{state.success}</p>:null}<button className="btn" disabled={pending}>{pending?'送信中…':'招待する'}</button></form>;
}
