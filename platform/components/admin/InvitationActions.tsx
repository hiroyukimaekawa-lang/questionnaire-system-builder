'use client';
import {useActionState} from 'react';
import {deleteInvitationAction,resendInvitationAction,suspendInvitationAction} from '@/app/admin/invitation-actions';

function ActionButton({id,kind}:{id:string;kind:'resend'|'suspend'|'delete'}){const action=kind==='resend'?resendInvitationAction:kind==='suspend'?suspendInvitationAction:deleteInvitationAction;const [state,submit,pending]=useActionState(async()=>action(id),null);const label=kind==='resend'?'再送':kind==='suspend'?'アクセス停止':'削除';return <form action={submit}><button className={kind==='delete'?'link-action danger-link':'link-action'} disabled={pending}>{pending?'処理中…':label}</button>{state?.error?<small className="error">{state.error}</small>:null}{state?.success?<small>{state.success}</small>:null}</form>}
export function InvitationActions({id,status}:{id:string;status:string}){return <div className="row">{status==='pending'||status==='expired'?<ActionButton id={id} kind="resend"/>:null}{status!=='suspended'?<ActionButton id={id} kind="suspend"/>:null}<ActionButton id={id} kind="delete"/></div>}
