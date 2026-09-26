'use server';

import {revalidatePath} from 'next/cache';
import {getAuthState} from '@/lib/data';
import {createAdminClient} from '@/lib/supabase/admin';

async function requireAdmin(){
  const {user,profile}=await getAuthState();
  if(!user||!profile?.is_active||profile.role!=='admin')throw new Error('管理者権限が必要です。');
  return createAdminClient();
}

export async function retryGoogleSheetsJobAction(responseId:string,_state:unknown,_form:FormData){
  void _state;void _form;
  try{
    const admin=await requireAdmin();
    const {data,error}=await admin.rpc('retry_google_sheets_sync_job',{p_response_id:responseId});
    if(error)throw error;
    if(!data)return {error:'failed状態の対象Queueが見つかりません。'};
    revalidatePath('/admin/system/google-sheets');
    return {success:'再送待ちへ戻しました。'};
  }catch(error){return {error:error instanceof Error?error.message:'再送設定に失敗しました。'};}
}

export async function retryAllFailedGoogleSheetsJobsAction(_state:unknown,_form:FormData){
  void _state;void _form;
  try{
    const admin=await requireAdmin();
    const {data,error}=await admin.rpc('retry_failed_google_sheets_sync_jobs');
    if(error)throw error;
    revalidatePath('/admin/system/google-sheets');
    return {success:`${Number(data??0)}件を再送待ちへ戻しました。`};
  }catch(error){return {error:error instanceof Error?error.message:'一括再送設定に失敗しました。'};}
}
