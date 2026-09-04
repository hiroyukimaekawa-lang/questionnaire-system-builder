import Link from 'next/link';
import {createClient} from '@/lib/supabase/server';
import {getUser} from '@/lib/data';
import {SurveyListTable} from '@/components/admin/SurveyListTable';
import {ArchivedSurveyTable} from '@/components/admin/ArchivedSurveyTable';
import {appUrl} from '@/lib/env';

const statusTabs=[
  {status:'all',label:'すべて',href:'/admin'},
  {status:'in_progress',label:'作成途中',href:'/admin?status=in_progress'},
  {status:'draft',label:'下書き',href:'/admin?status=draft'},
  {status:'published',label:'公開中',href:'/admin?status=published'},
  {status:'responses',label:'回答あり',href:'/admin?status=responses'},
  {status:'archived',label:'削除済み',href:'/admin?status=archived'},
] as const;

export default async function AdminPage({searchParams}:{searchParams:Promise<{q?:string;status?:string;industry?:string}>}){
  const query=await searchParams,supabase=await createClient(),user=await getUser(),filter=query.status??'all';
  let surveyQuery=supabase.from('surveys').select('id,name,slug,industry,status,updated_at,published_at,responses(count),owner:profiles!surveys_owner_user_id_fkey(name,email)').order('updated_at',{ascending:false});
  surveyQuery=filter==='archived'?surveyQuery.eq('status','archived'):surveyQuery.neq('status','archived');
  const [surveyResult,activeSummaryResult,archivedCountResult,sessionResult]=await Promise.all([surveyQuery,supabase.from('surveys').select('id,status,responses(count)').neq('status','archived'),supabase.from('surveys').select('id',{count:'exact',head:true}).eq('status','archived'),supabase.from('builder_sessions').select('id,context,current_step,updated_at').eq('status','in_progress').order('updated_at',{ascending:false})]);
  const sourceSurveys=surveyResult.data??[],allSurveys=activeSummaryResult.data??[],allSessions=sessionResult.data??[],keyword=(query.q??'').trim().toLowerCase();
  const surveys=sourceSurveys.filter(item=>(!keyword||item.name.toLowerCase().includes(keyword)||item.slug.toLowerCase().includes(keyword))&&(!query.industry||item.industry===query.industry)&&(filter==='all'||filter==='archived'||filter==='responses'?(filter==='all'||filter==='archived'||(item.responses?.[0]?.count??0)>0):filter==='draft'?(item.status==='draft'||item.status==='unpublished'):item.status===filter));
  const sessions=(filter==='all'||filter==='in_progress'?allSessions:[]).filter(item=>!keyword||String(item.context?.storeName??'').toLowerCase().includes(keyword));
  const counts={all:allSurveys.length+allSessions.length,in_progress:allSessions.length,draft:allSurveys.filter(item=>item.status==='draft'||item.status==='unpublished').length,published:allSurveys.filter(item=>item.status==='published').length,responses:allSurveys.filter(item=>(item.responses?.[0]?.count??0)>0).length,archived:archivedCountResult.count??0};
  const industries=[...new Set(sourceSurveys.map(item=>item.industry).filter(Boolean))];
  return <div className="crm-dashboard compact-admin-list"><header className="dashboard-heading"><div><p>アンケート管理</p><h1>{filter==='archived'?'削除済み':'アンケート管理'}</h1><span>{filter==='archived'?'削除したアンケートの確認と復元ができます。':'店舗ごとの作成状況と回答を、ここでまとめて確認できます。'}</span></div></header><nav className="survey-status-tabs" aria-label="ステータスで絞り込む">{statusTabs.map(tab=><Link key={tab.status} href={tab.href} className={`survey-status-tab${filter===tab.status?' active':''}`} aria-current={filter===tab.status?'page':undefined}><span>{tab.label}</span><strong>{counts[tab.status]}</strong></Link>)}</nav><section className="compact-list-toolbar"><div><h2>{filter==='archived'?'削除済みアンケート':'アンケート一覧'}</h2><p>{surveys.length+sessions.length}件を表示しています</p></div><form className="crm-filters compact-filters" method="get">{filter!=='all'?<input type="hidden" name="status" value={filter}/>:null}<label className="survey-search"><span className="sr-only">店舗名・医院名で検索</span><input name="q" defaultValue={query.q} placeholder="店舗名・医院名で検索"/></label><label><span className="sr-only">業種</span><select name="industry" defaultValue={query.industry??''}><option value="">すべての業種</option>{industries.map(industry=><option value={industry} key={industry}>{industry}</option>)}</select></label><button className="filter-submit" type="submit">検索</button>{(keyword||query.industry)&&<Link href={filter==='all'?'/admin':`/admin?status=${filter}`} className="filter-reset">解除</Link>}{filter!=='archived'?<Link className="btn dashboard-create compact-create" href="/admin/surveys/new">＋ 新しいアンケート</Link>:null}</form></section>{filter==='archived'?<ArchivedSurveyTable surveys={surveys} canRestore={user?.role==='admin'}/>:<SurveyListTable surveys={surveys} sessions={sessions} role={user?.role??'sales'} baseUrl={appUrl()}/>}</div>;
}
