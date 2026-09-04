'use client';

import Link from 'next/link';
import {FormEvent,useState} from 'react';
import {createClient} from '@/lib/supabase/client';

const successMessage='登録を受け付けました。メール確認が必要な場合は確認後、管理者の承認をお待ちください。';
const genericError='登録を受け付けられませんでした。入力内容を確認し、時間をおいて再度お試しください。';

export function SignupForm({disabled=false}:{disabled?:boolean}){
  const [pending,setPending]=useState(false),[message,setMessage]=useState(''),[error,setError]=useState(false);
  async function submit(event:FormEvent<HTMLFormElement>){event.preventDefault();if(pending||disabled)return;const form=new FormData(event.currentTarget),name=String(form.get('name')||'').trim(),email=String(form.get('email')||'').trim(),password=String(form.get('password')||''),confirmation=String(form.get('passwordConfirmation')||'');if(password.length<8){setError(true);setMessage('パスワードは8文字以上で入力してください。');return}if(password!==confirmation){setError(true);setMessage('パスワードが一致しません。');return}setPending(true);setMessage('');try{const {error:signUpError}=await createClient().auth.signUp({email,password,options:{data:{name}}});if(signUpError)throw signUpError;event.currentTarget.reset();setError(false);setMessage(successMessage)}catch{setError(true);setMessage(genericError)}finally{setPending(false)}}
  return <form className="stack" onSubmit={submit}><label className="field">名前<input name="name" autoComplete="name" required disabled={disabled||pending}/></label><label className="field">メールアドレス<input name="email" type="email" autoComplete="email" required disabled={disabled||pending}/></label><label className="field">パスワード<input name="password" type="password" autoComplete="new-password" minLength={8} required disabled={disabled||pending}/></label><label className="field">パスワード確認<input name="passwordConfirmation" type="password" autoComplete="new-password" minLength={8} required disabled={disabled||pending}/></label>{message&&<p className={error?'error':'notice'} role="status">{message}</p>}<button className="btn" disabled={disabled||pending}>{pending?'登録中…':'新規登録'}</button><Link className="link-action" href="/login">ログインへ戻る</Link></form>
}
