import {NextResponse} from 'next/server';
import {z} from 'zod';
import {createClient} from '@/lib/supabase/server';
import {getPublicSurvey} from '@/lib/data';
import {validateAnswers} from '@/lib/survey';
import {evaluateCompletionRules} from '@/lib/completion';
import {evaluateGoogleReviewEligibility} from '@/lib/google-review';
import {buildGoogleSheetsPayload,sendGoogleSheetsPayload} from '@/lib/google-sheets-sync';
import {parseLimitedJson,rateLimitSurveyResponse} from '@/lib/request-security';

const schema=z.object({slug:z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),versionId:z.string().uuid(),answers:z.record(z.string(),z.union([z.string().max(5000),z.number().min(1).max(10),z.array(z.string().max(300)).max(50)]))});

export async function POST(request:Request){
  try{
    const limited=await rateLimitSurveyResponse(request);
    if(!limited)return NextResponse.json({error:'送信回数が多すぎます。少し時間をおいて再度お試しください。'},{status:429});
    const input=schema.parse(await parseLimitedJson(request,100_000));
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
    if(error)return NextResponse.json({error:'回答を保存できませんでした。入力内容をご確認ください。'},{status:400});

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
  }catch(error){
    if(error instanceof Error&&error.message==='REQUEST_BODY_TOO_LARGE')return NextResponse.json({error:'送信内容が大きすぎます。'},{status:413});
    return NextResponse.json({error:'入力内容を確認してください。'},{status:400});
  }
}
