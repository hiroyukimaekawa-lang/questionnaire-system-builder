import { cache } from 'react';
import { createClient } from '@/lib/supabase/server';
import type { SurveyConfig, SurveyVersion } from '@/types/database';

export const getAuthState = cache(async()=>{
  const supabase=await createClient();
  const {data:{user},error:authError}=await supabase.auth.getUser();
  if(!user)return {user:null,profile:null,error:authError?.message??null};
  const {data:profile,error:profileError}=await supabase.from('profiles').select('id,name,email,role,is_active').eq('id',user.id).maybeSingle();
  return {user,profile,error:profileError?.message??(!profile?'プロフィールが登録されていません。':null)};
});
export const getUser = cache(async()=>{const state=await getAuthState();return state.profile;});
function mapVersion(row:any):SurveyVersion { return {id:row.id,surveyId:row.survey_id,version:row.version,status:row.status,config:row.config as SurveyConfig,questions:(row.questions??[]).sort((a:any,b:any)=>a.sort_order-b.sort_order).map((q:any)=>({id:q.id,type:q.type,title:q.title,description:q.description,required:q.required,sortOrder:q.sort_order,settings:q.settings??{},options:(q.question_options??[]).sort((a:any,b:any)=>a.sort_order-b.sort_order).map((o:any)=>({id:o.id,label:o.label,value:o.value,sortOrder:o.sort_order}))}))}; }
export async function getSurvey(id:string){ const supabase=await createClient(); const {data,error}=await supabase.from('surveys').select('*, owner:profiles!surveys_owner_user_id_fkey(name)').eq('id',id).single(); if(error)return null; return data; }
export async function getVersion(id:string){ const supabase=await createClient(); const {data,error}=await supabase.from('survey_versions').select('*,questions(*,question_options(*))').eq('id',id).single(); if(error)return null; return mapVersion(data); }
export async function getDraftForSurvey(id:string){ const survey=await getSurvey(id); if(!survey?.current_draft_version_id)return null; return getVersion(survey.current_draft_version_id); }
export async function getPublicSurvey(slug:string){ const supabase=await createClient(); const {data:survey}=await supabase.from('surveys').select('id,name,slug,industry,status,current_published_version_id').eq('slug',slug).eq('status','published').maybeSingle(); if(!survey?.current_published_version_id)return null; const version=await getVersion(survey.current_published_version_id); return version?{survey,version}:null; }
