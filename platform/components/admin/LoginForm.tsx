'use client';
import {FormEvent,useState} from 'react';
import {useRouter} from 'next/navigation';
import {createClient} from '@/lib/supabase/client';
import Link from 'next/link';
const GENERIC_ERROR='メールアドレスまたはパスワードを確認してください。';
export function LoginForm({disabled=false}:{disabled?:boolean}){
  const router=useRouter();const [mode,setMode]=useState<'login'|'recovery'>('login');const [pending,setPending]=useState(false);const [message,setMessage]=useState('');const [messageIsError,setMessageIsError]=useState(false);const [showPassword,setShowPassword]=useState(false);
  async function submit(event:FormEvent<HTMLFormElement>){event.preventDefault();if(pending||disabled)return;setPending(true);setMessage('');const data=new FormData(event.currentTarget);const email=String(data.get('email')||'').trim();const supabase=createClient();
    if(mode==='recovery'){try{const {error}=await supabase.auth.resetPasswordForEmail(email,{redirectTo:`${window.location.origin}/auth/confirm?next=/admin/account/update-password`});setMessageIsError(Boolean(error));setMessage(error?'再設定メールを送信できませんでした。時間をおいて再度お試しください。':'アカウントが存在する場合、再設定メールを送信しました。');}catch{setMessageIsError(true);setMessage('再設定メールを送信できませんでした。時間をおいて再度お試しください。');}finally{setPending(false);}return;}
    const {error}=await supabase.auth.signInWithPassword({email,password:String(data.get('password')||'')});if(error){setMessageIsError(true);setMessage(GENERIC_ERROR);setPending(false);return;}router.replace('/admin');router.refresh();
  }
  return <form onSubmit={submit} className="stack"><label className="field">メールアドレス<input name="email" type="email" autoComplete="email" required disabled={disabled||pending}/></label>{mode==='login'&&<label className="field">パスワード<span className="password-field"><input name="password" type={showPassword?'text':'password'} autoComplete="current-password" required disabled={disabled||pending}/><button type="button" aria-label={showPassword?'パスワードを非表示にする':'パスワードを表示する'} aria-pressed={showPassword} onClick={()=>setShowPassword(v=>!v)}>{showPassword?'非表示':'表示'}</button></span></label>}{message&&<p className={messageIsError?'error':'notice'} role="status">{message}</p>}<button className="btn" disabled={disabled||pending}>{pending?'送信中…':mode==='login'?'ログイン':'再設定メールを送る'}</button><button className="link-action" type="button" disabled={pending} onClick={()=>{setMode(mode==='login'?'recovery':'login');setMessage('');setMessageIsError(false)}}>{mode==='login'?'パスワードを忘れた方':'ログインへ戻る'}</button>{mode==='login'&&<Link href="/signup" className="link-action">新規登録はこちら</Link>}</form>
}
