import {NextResponse} from 'next/server';
import {z} from 'zod';
import {createClient} from '@/lib/supabase/server';
import {getPublicSurvey} from '@/lib/data';
import {validateAnswers} from '@/lib/survey';
import {evaluateCompletionRules} from '@/lib/completion';
import {evaluateGoogleReviewEligibility} from '@/lib/google-review';
import {buildGoogleSheetsPayload,sendGoogleSheetsPayload} from '@/lib/google-sheets-sync';

const schema=z.object({slug:z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),versionId:z.string().uuid(),answers:z.record(z.string(),z.union([z.string().max(5000),z.number().min(1).max(10),z.array(z.string().max(300)).max(50)]))});

export async function POST(request:Request){
  try{
    const length=Number(request.headers.get('content-length')||0);
    if(length>100_000)return NextResponse.json({error:'送信内容が大きすぎます。'},{status:413});

    const input=schema.parse(await request.json());
    const publicSurvey=await getPublicSurvey(input.slug);
    if(!publicSurvey||publicSurvey.version.id!==input.versionId)return NextResponse.json({error:'このアンケートは公開されていません。'},{status:404});

    const validation=validateAnswers(publicSurvey.version.questions,input.answers);
    if(Object.keys(validation).length)return NextResponse.json({error:Object.values(validation)[0]},{status:400});

    const config=publicSurvey.version.config;
    const completion=evaluateCompletionRules(config,input.answers);
    const reviewEligible=evaluateGoogleReviewEligibility(config,publicSurvey.version.questions,input.answers);
    const syncToken=crypto.randomUUID();
    const submittedAt=new Date().toISOString();
    const s=await createClient();
    const {data,error}=await s.rpc('submit_survey_response',{
      p_slug:input.slug,
      p_version_id:input.versionId,
      p_answers:input.answers,
      p_metadata:{
        user_agent:request.headers.get('user-agent')?.slice(0,300),
        needsFollowUp:completion.needsFollowUp,
        matchedRuleId:completion.matchedRuleId,
        reviewEligible,
        googleSheetsSyncToken:syncToken,
      },
    });
    if(error)return NextResponse.json({error:error.message},{status:400});

    const responseId=String(data);
    const payload=buildGoogleSheetsPayload({
      publicSurvey,
      answers:input.answers,
      responseId,
      submittedAt,
      completion,
      reviewEligible,
    });
    const syncResult=await sendGoogleSheetsPayload(payload);

    if(syncResult.attempted){
      const {error:syncStateError}=await s.rpc('mark_google_sheets_sync_result',{
        p_response_id:responseId,
        p_sync_token:syncToken,
        p_status:syncResult.ok?'synced':'failed',
        p_error:syncResult.error??null,
      });
      if(syncStateError)console.error('Google Sheets sync status update failed:',syncStateError.message);
    }
    if(syncResult.attempted&&!syncResult.ok)console.error('Google Sheets sync failed:',syncResult.error);

    return NextResponse.json({id:responseId,...completion,reviewEligible},{status:201});
  }catch{
    return NextResponse.json({error:'入力内容を確認してください。'},{status:400});
  }
}
