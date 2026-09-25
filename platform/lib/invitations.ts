import {createAdminClient} from '@/lib/supabase/admin';

export async function acceptVerifiedInvitations(userId:string,email:string){
  const admin=createAdminClient(),normalized=email.trim().toLowerCase(),now=new Date().toISOString();
  await admin.from('survey_invitations').update({status:'expired'}).eq('email',normalized).eq('status','pending').lte('expires_at',now);
  const {data:invitations,error}=await admin.from('survey_invitations').select('id,survey_id,permission,invited_by').eq('email',normalized).eq('status','pending').gt('expires_at',now);
  if(error)throw error;
  for(const invitation of invitations??[]){
    const {error:memberError}=await admin.from('survey_members').upsert({survey_id:invitation.survey_id,user_id:userId,permission:invitation.permission,invited_by:invitation.invited_by},{onConflict:'survey_id,user_id'});
    if(memberError)throw memberError;
    const {error:acceptError}=await admin.from('survey_invitations').update({status:'accepted',invited_user_id:userId,accepted_at:now}).eq('id',invitation.id).eq('status','pending');
    if(acceptError){
      await admin.from('survey_members').delete().eq('survey_id',invitation.survey_id).eq('user_id',userId);
      throw acceptError;
    }
  }
}
