'use client';
import {useActionState} from 'react';
import {deleteInvitationAction,suspendInvitationAction} from '@/app/admin/invitation-actions';

function ActionButton({id,kind}:{id:string;kind:'suspend'|'delete'}){const action=kind==='suspend'?suspendInvitationAction:deleteInvitationAction;const [state,submit,pending]=useActionState(async()=>action(id),null);return <form action={submit}><button className={kind==='delete'?'link-action danger-link':'link-action'} disabled={pending}>{pending?'処理中…':kind==='suspend'?'アクセス停止':'削除'}</button>{state?.error?<small className="error">{state.error}</small>:null}</form>}
export function InvitationActions({id,status}:{id:string;status:string}){return <div className="row">{status!=='suspended'?<ActionButton id={id} kind="suspend"/>:null}<ActionButton id={id} kind="delete"/></div>}
