import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { ActionForm } from '@/components/admin/ActionForm';
import { archiveAction, publishAction, unpublishAction } from '@/app/actions';
import { getUser } from '@/lib/data';

export default async function AdminPage(){
  const s=await createClient(),user=await getUser();
  const [surveyResult,sessionResult]=await Promise.all([
    s.from('surveys').select('id,name,slug,industry,status,updated_at,published_at,responses(count)').neq('status','archived').order('updated_at',{ascending:false}),
    s.from('builder_sessions').select('id,context,current_step,updated_at').eq('status','in_progress').order('updated_at',{ascending:false}),
  ]);
  const surveys=surveyResult.data??[],sessions=sessionResult.data??[];
  return <div className="stack"><div className="row" style={{justifyContent:'space-between'}}><div><h1>アンケート一覧</h1><p className="muted">日常の編集・公開・回答確認をここから行えます。</p></div><Link className="btn" href="/admin/surveys/new">新規アンケート作成</Link></div>
    {sessions.length>0&&<section className="card" style={{padding:18}}><h2>作成途中</h2><div className="stack">{sessions.map((x:any)=><div className="row" key={x.id} style={{justifyContent:'space-between'}}><div><strong>{x.context?.storeName||'名称未入力のアンケート'}</strong><br/><small className="muted">最終更新 {new Date(x.updated_at).toLocaleString('ja-JP')}</small></div><Link className="btn secondary" href={`/admin/surveys/new?session=${x.id}`}>続きから作成</Link></div>)}</div></section>}
    <div className="card" style={{overflowX:'auto'}}><table><thead><tr><th>店舗・医院</th><th>業種</th><th>状態</th><th>担当営業</th><th>回答数</th><th>最終更新</th><th>公開URL</th><th>操作</th></tr></thead><tbody>{surveys.map((x:any)=><tr key={x.id}><td><strong>{x.name}</strong></td><td>{x.industry||'未設定'}</td><td>{({draft:'下書き',published:'公開中',unpublished:'非公開'} as Record<string,string>)[x.status]}</td><td>{user?.name||user?.email}</td><td>{x.responses?.[0]?.count??0}</td><td>{new Date(x.updated_at).toLocaleString('ja-JP')}</td><td>{x.status==='published'?<a href={`/s/${x.slug}`} target="_blank">/s/{x.slug}</a>:'未公開'}</td><td><div className="row"><Link className="btn secondary" href={`/admin/surveys/${x.id}`}>編集</Link><Link className="btn secondary" href={`/admin/surveys/${x.id}/preview`}>プレビュー</Link><Link className="btn secondary" href={`/admin/surveys/${x.id}/responses`}>回答を見る</Link><Link className="btn secondary" href={`/admin/surveys/new?duplicate=${x.id}`}>複製</Link>{x.status==='published'?<ActionForm action={unpublishAction.bind(null,x.id)} label="非公開"/>:<ActionForm action={publishAction.bind(null,x.id)} label="公開"/>}{user?.role==='admin'&&<ActionForm action={archiveAction.bind(null,x.id)} label="アーカイブ" className="btn danger" confirmText="回答は削除せず、このアンケートをアーカイブしますか？"/>}</div></td></tr>)}</tbody></table>{surveys.length===0&&<p style={{padding:20}}>まだアンケートがありません。</p>}</div>
  </div>;
}
