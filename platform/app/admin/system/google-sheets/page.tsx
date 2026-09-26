import {redirect} from 'next/navigation';
import {getUser} from '@/lib/data';
import {createAdminClient} from '@/lib/supabase/admin';
import {ActionForm} from '@/components/admin/ActionForm';
import {retryAllFailedGoogleSheetsJobsAction,retryGoogleSheetsJobAction} from './actions';

const labels:Record<string,string>={pending:'待機中',processing:'処理中',synced:'同期済み',failed:'失敗'};
const format=(value:string|null)=>value?new Intl.DateTimeFormat('ja-JP',{dateStyle:'short',timeStyle:'medium',timeZone:'Asia/Tokyo'}).format(new Date(value)):'—';

export default async function GoogleSheetsQueuePage(){
  const user=await getUser();
  if(user?.role!=='admin'||!user.is_active)redirect('/admin');
  const admin=createAdminClient();
  const statuses=Object.keys(labels);
  const [failedResult,...countResults]=await Promise.all([
    admin.from('google_sheets_sync_queue').select('response_id,status,attempts,last_error,last_http_status,last_attempt_at,next_attempt_at').eq('status','failed').order('last_attempt_at',{ascending:false}).limit(100),
    ...statuses.map(status=>admin.from('google_sheets_sync_queue').select('response_id',{count:'exact',head:true}).eq('status',status)),
  ]);
  if(failedResult.error)throw failedResult.error;
  const countError=countResults.find(result=>result.error)?.error;
  if(countError)throw countError;
  const failed=failedResult.data??[];
  const counts=Object.fromEntries(statuses.map((status,index)=>[status,countResults[index].count??0]));

  return <section className="stack queue-admin-page">
    <div className="dashboard-heading"><div><p>システム管理</p><h1>Google Sheets同期Queue</h1><span>Supabaseに保存済みの回答を非同期でSheetsへ同期します。</span></div></div>
    <section className="status-grid queue-status-grid">{Object.entries(labels).map(([status,label])=><article className="status-card" key={status}><span>{label}</span><strong>{counts[status]??0}</strong><small>{status}</small></article>)}</section>
    <div className="list-heading"><div><h2>失敗した同期</h2><p>原因を確認し、安全に再送待ちへ戻せます。</p></div>{failed.length?<ActionForm action={retryAllFailedGoogleSheetsJobsAction} label="失敗分を一括再送" className="btn danger-button" confirmText={`${failed.length}件を再送待ちへ戻します。よろしいですか？`}/>:null}</div>
    <div className="card crm-table-scroll"><table className="crm-table queue-table"><thead><tr><th>Response ID</th><th>試行</th><th>エラー</th><th>HTTP</th><th>最終試行</th><th>次回試行</th><th>操作</th></tr></thead><tbody>{failed.map(row=><tr key={row.response_id}><td data-label="Response ID"><code>{row.response_id}</code></td><td data-label="試行">{row.attempts} / 12</td><td data-label="エラー">{row.last_error||'—'}</td><td data-label="HTTP">{row.last_http_status??'—'}</td><td data-label="最終試行">{format(row.last_attempt_at)}</td><td data-label="次回試行">{format(row.next_attempt_at)}</td><td data-label="操作"><ActionForm action={retryGoogleSheetsJobAction.bind(null,row.response_id)} label="1件再送" className="btn secondary"/></td></tr>)}</tbody></table>{failed.length===0?<div className="empty-state"><span>✓</span><h3>失敗中の同期はありません</h3></div>:null}</div>
  </section>;
}
