'use server';
import {revalidatePath} from 'next/cache';
import {createClient} from '@/lib/supabase/server';
import {createAdminClient} from '@/lib/supabase/admin';
import {appUrl} from '@/lib/env';

async function actor(){
  const supabase=await createClient();
  const {data:{user}}=await supabase.auth.getUser();
  if(!user)throw new Error('ログインが必要です。');
  return {supabase,user};
}

export async function inviteViewerAction(surveyId:string,_:unknown,formData:FormData){
  try{
    const {supabase,user}=await actor();
    const email=String(formData.get('email')??'').trim().toLowerCase();
    if(!/^\S+@\S+\.\S+$/.test(email))return {error:'メールアドレスを確認してください。'};
    const {data:survey}=await supabase.from('surveys').select('id').eq('id',surveyId).maybeSingle();
    if(!survey)return {error:'この案件を共有する権限がありません。'};
    const {data:invitation,error}=await supabase.from('survey_invitations').insert({survey_id:surveyId,email,permission:'viewer',invited_by:user.id}).select('id').single();
    if(error||!invitation)return {error:error?.code==='23505'?'このメールアドレスは招待済みです。':'招待を登録できませんでした。'};
    const admin=createAdminClient();
    const {data:existing}=await admin.from('profiles').select('id').eq('email',email).maybeSingle();
    if(existing){
      await admin.from('survey_members').upsert({survey_id:surveyId,user_id:existing.id,permission:'viewer',invited_by:user.id},{onConflict:'survey_id,user_id'});
      await admin.from('survey_invitations').update({status:'accepted',invited_user_id:existing.id,accepted_at:new Date().toISOString()}).eq('id',invitation.id);
      revalidatePath(`/admin/surveys/${surveyId}/sharing`);revalidatePath('/admin/invitations');
      return {success:'既存ユーザーへ閲覧権限を付与しました。'};
    }
    const {error:inviteError}=await admin.auth.admin.inviteUserByEmail(email,{redirectTo:`${appUrl()}/auth/confirm?next=/admin`});
    if(inviteError){await supabase.from('survey_invitations').delete().eq('id',invitation.id);return {error:'招待メールを送信できませんでした。設定を確認してください。'};}
    revalidatePath(`/admin/surveys/${surveyId}/sharing`);revalidatePath('/admin/invitations');
    return {success:'招待メールを送信しました。'};
  }catch(error){return {error:error instanceof Error?error.message:'招待に失敗しました。'};}
}

export async function suspendInvitationAction(invitationId:string){
  try{const {supabase}=await actor();const {data,error}=await supabase.from('survey_invitations').update({status:'suspended'}).eq('id',invitationId).select('survey_id,invited_user_id').single();if(error||!data)return {error:'アクセスを停止できませんでした。'};if(data.invited_user_id)await supabase.from('survey_members').delete().eq('survey_id',data.survey_id).eq('user_id',data.invited_user_id);revalidatePath('/admin/invitations');revalidatePath(`/admin/surveys/${data.survey_id}/sharing`);return {success:'アクセスを停止しました。'};}catch{return {error:'アクセスを停止できませんでした。'};}
}

export async function deleteInvitationAction(invitationId:string){
  try{const {supabase}=await actor();const {data}=await supabase.from('survey_invitations').select('survey_id,invited_user_id').eq('id',invitationId).single();if(!data)return {error:'招待が見つかりません。'};if(data.invited_user_id)await supabase.from('survey_members').delete().eq('survey_id',data.survey_id).eq('user_id',data.invited_user_id);const {error}=await supabase.from('survey_invitations').delete().eq('id',invitationId);if(error)return {error:'招待を削除できませんでした。'};revalidatePath('/admin/invitations');revalidatePath(`/admin/surveys/${data.survey_id}/sharing`);return {success:'招待とアクセス権を削除しました。'};}catch{return {error:'招待を削除できませんでした。'};}
}
