import {createClient} from '@/lib/supabase/server';
import {requireQueryData} from '@/lib/query-result';

export type ManagementFilters={q?:string;status?:string;page?:number};

export async function getManagedSurveys(filters:ManagementFilters={}){
  const supabase=await createClient();
  const page=Math.max(1,filters.page??1),size=20,from=(page-1)*size;
  let query=supabase.from('surveys')
    .select('id,name,slug,industry,status,updated_at,published_at,responses(count),owner:profiles!surveys_owner_user_id_fkey(name,email)',{count:'exact'})
    .neq('status','archived').order('updated_at',{ascending:false}).range(from,from+size-1);
  const keyword=filters.q?.trim();
  if(keyword)query=query.or(`name.ilike.%${keyword.replaceAll('%','\\%').replaceAll(',','')}%,industry.ilike.%${keyword.replaceAll('%','\\%').replaceAll(',','')}%`);
  if(filters.status==='published')query=query.eq('status','published');
  if(filters.status==='draft')query=query.in('status',['draft','unpublished']);
  if(filters.status==='unpublished')query=query.eq('status','unpublished');
  const {data,error,count}=await query;
  return {surveys:requireQueryData(data,error,'surveys.management'),count:count??0,page,size};
}

export async function getHomeSummary(){
  const supabase=await createClient();
  const [{count:total},{count:published},{count:drafts},{data:recent,error}]=await Promise.all([
    supabase.from('surveys').select('id',{count:'exact',head:true}).neq('status','archived'),
    supabase.from('surveys').select('id',{count:'exact',head:true}).eq('status','published'),
    supabase.from('surveys').select('id',{count:'exact',head:true}).in('status',['draft','unpublished']),
    supabase.from('surveys').select('id,name,status,updated_at').neq('status','archived').order('updated_at',{ascending:false}).limit(5),
  ]);
  return {total:total??0,published:published??0,drafts:drafts??0,recent:requireQueryData(recent,error,'surveys.recent')};
}

export async function getSurveyMembers(surveyId:string){
  const supabase=await createClient();
  const {data,error}=await supabase.from('survey_members').select('id,permission,created_at,user:profiles!survey_members_user_id_fkey(id,name,email)').eq('survey_id',surveyId).order('created_at');
  return requireQueryData(data,error,'survey_members.list');
}

export async function getViewerVisibleSurveyIds(limit=2){
  const supabase=await createClient();
  const {data,error}=await supabase.from('surveys').select('id').limit(limit);
  return requireQueryData(data,error,'surveys.viewer');
}

export async function getInvitations(surveyId?:string){
  const supabase=await createClient();
  let query=supabase.from('survey_invitations').select('id,email,permission,status,expires_at,created_at,survey:surveys(id,name),inviter:profiles!survey_invitations_invited_by_fkey(name,email)').order('created_at',{ascending:false});
  if(surveyId)query=query.eq('survey_id',surveyId);
  const {data,error}=await query;
  return requireQueryData(data,error,'survey_invitations.list');
}
