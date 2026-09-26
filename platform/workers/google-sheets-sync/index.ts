import {createClient} from '@supabase/supabase-js';
import {buildGoogleSheetsPayloadFromResponse} from '../../lib/google-sheets-queue';
import {sendGoogleSheetsPayload} from '../../lib/google-sheets-sync';

type Env={
  SUPABASE_URL:string;
  SUPABASE_SERVICE_ROLE_KEY:string;
  GOOGLE_SHEETS_WEBHOOK_URL:string;
  GOOGLE_SHEETS_WEBHOOK_SECRET:string;
};
type WorkerExecutionContext={waitUntil(promise:Promise<unknown>):void};

type ClaimedJob={response_id:string;lock_token:string};

export async function processNextGoogleSheetsJob(env:Env){
  const supabase=createClient(env.SUPABASE_URL,env.SUPABASE_SERVICE_ROLE_KEY,{auth:{autoRefreshToken:false,persistSession:false}});
  const {data,error}=await supabase.rpc('claim_google_sheets_sync_jobs',{p_limit:1});
  if(error)throw new Error(`Queue claim failed: ${error.message}`);
  const job=(data?.[0]??null) as ClaimedJob|null;
  if(!job)return {processed:0};

  try{
    const payload=await buildGoogleSheetsPayloadFromResponse(supabase,job.response_id);
    const result=await sendGoogleSheetsPayload(payload,{
      url:env.GOOGLE_SHEETS_WEBHOOK_URL,
      secret:env.GOOGLE_SHEETS_WEBHOOK_SECRET,
      timeoutMs:20_000,
    });
    if(!result.ok)throw Object.assign(new Error(result.error??'Google Sheets sync failed.'),{httpStatus:result.httpStatus});
    const {data:completed,error:completeError}=await supabase.rpc('complete_google_sheets_sync_job',{
      p_response_id:job.response_id,
      p_lock_token:job.lock_token,
      p_http_status:result.httpStatus??null,
    });
    if(completeError)throw new Error(`Queue completion failed: ${completeError.message}`);
    if(!completed)throw new Error('Queue lease was lost before completion.');
    return {processed:1,status:'synced'};
  }catch(error){
    const message=error instanceof Error?error.message:String(error);
    const httpStatus=typeof error==='object'&&error!==null&&'httpStatus' in error?Number((error as {httpStatus?:unknown}).httpStatus):null;
    const {data:status,error:failError}=await supabase.rpc('fail_google_sheets_sync_job',{
      p_response_id:job.response_id,
      p_lock_token:job.lock_token,
      p_error:message,
      p_http_status:Number.isFinite(httpStatus)?httpStatus:null,
    });
    if(failError)throw new Error(`Queue failure update failed: ${failError.message}; original: ${message}`);
    return {processed:1,status};
  }
}

const worker={
  async scheduled(_controller:unknown,env:Env,ctx:WorkerExecutionContext){
    ctx.waitUntil(processNextGoogleSheetsJob(env).then(result=>console.log(JSON.stringify(result))));
  },
};

export default worker;
