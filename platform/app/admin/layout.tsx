import {redirect} from 'next/navigation';
import {getAuthState} from '@/lib/data';
import {createClient} from '@/lib/supabase/server';
import {logoutAction} from '@/app/actions';
import {AdminSidebar} from '@/components/admin/AdminSidebar';

export default async function AdminLayout({children}:{children:React.ReactNode}){
  const {user,profile,error}=await getAuthState();if(!user)redirect('/login');
  if(!profile)return <main className="shell" style={{maxWidth:640,padding:'10vh 0'}}><section className="card stack" style={{padding:28}}><div><p className="muted">Questionnaire Platform</p><h1>アカウント設定を確認してください</h1></div><p>ログインには成功しましたが、管理プロフィールを確認できませんでした。</p><p className="error" role="alert">{error||'プロフィールが登録されていません。'}</p><form action={logoutAction}><button className="btn secondary" type="submit">ログアウトして戻る</button></form></section></main>;
  const supabase=await createClient();const [surveyResult,sessionResult]=await Promise.all([supabase.from('surveys').select('id,name,status,responses(count)').neq('status','archived').order('updated_at',{ascending:false}).limit(20),supabase.from('builder_sessions').select('id').eq('status','in_progress')]);const surveys=surveyResult.data??[],sessionCount=sessionResult.data?.length??0;const counts={inProgress:sessionCount,draft:surveys.filter(item=>item.status==='draft'||item.status==='unpublished').length,published:surveys.filter(item=>item.status==='published').length,withResponses:surveys.filter(item=>(item.responses?.[0]?.count??0)>0).length};
  return <div className="crm-shell"><AdminSidebar role={profile.role} counts={counts} recent={surveys.slice(0,4)}/><div className="crm-workspace"><header className="crm-topbar"><div className="topbar-identity"><span className="topbar-avatar" aria-hidden="true">{(profile.name||profile.email).slice(0,1).toUpperCase()}</span><span><strong>{profile.name||profile.email}</strong><small>{profile.role==='admin'?'管理者':'営業'}</small></span></div><form action={logoutAction}><button className="topbar-logout" type="submit">ログアウト</button></form></header><main className="crm-main"><div className="crm-main-inner">{children}</div></main></div></div>;
}
