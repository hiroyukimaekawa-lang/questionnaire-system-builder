import {NextResponse} from 'next/server';
import {z} from 'zod';
import {createPublicClient} from '@/lib/supabase/public';
import {getPublicSurvey} from '@/lib/data';
import {validateAnswers} from '@/lib/survey';
import {evaluateCompletionRules} from '@/lib/completion';
import {evaluateGoogleReviewEligibility} from '@/lib/google-review';
import {resolveIdentityMode} from '@/lib/public-survey';
import {parseLimitedJson,rateLimitSurveyResponse} from '@/lib/request-security';

const schema=z.object({slug:z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),versionId:z.string().uuid(),answers:z.record(z.string(),z.union([z.string().max(5000),z.number().min(1).max(10),z.array(z.string().max(300)).max(50)])),identityChoice:z.enum(['anonymous','identified']).optional(),respondentName:z.string().max(100).optional()});

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
    const identityMode=resolveIdentityMode(config);
    let identityChoice:'anonymous'|'identified';
    let respondentName:string|null=null;
    if(identityMode==='anonymous_only'){
      identityChoice='anonymous';
    }else if(identityMode==='identified_only'){
      identityChoice='identified';
      const name=(input.respondentName??'').trim();
      if(!name)return NextResponse.json({error:'お名前を入力してください。'},{status:400});
      respondentName=name;
    }else{
      if(input.identityChoice!=='anonymous'&&input.identityChoice!=='identified')return NextResponse.json({error:'回答方法を選択してください。'},{status:400});
      identityChoice=input.identityChoice;
      if(identityChoice==='identified'){
        const name=(input.respondentName??'').trim();
        if(!name)return NextResponse.json({error:'お名前を入力してください。'},{status:400});
        respondentName=name;
      }
    }

    const completion=evaluateCompletionRules(config,input.answers);
    const reviewEligible=evaluateGoogleReviewEligibility(config,publicSurvey.version.questions,input.answers);
    const s=createPublicClient();
    const {data,error}=await s.rpc('submit_survey_response',{
      p_slug:input.slug,
      p_version_id:input.versionId,
      p_answers:input.answers,
      p_metadata:{
        user_agent:request.headers.get('user-agent')?.slice(0,300),
        needsFollowUp:completion.needsFollowUp,
        matchedRuleId:completion.matchedRuleId,
        reviewEligible,
        identityChoice,
        respondentName,
      },
    });
    if(error)return NextResponse.json({error:'回答を保存できませんでした。入力内容をご確認ください。'},{status:400});

    return NextResponse.json({id:String(data),...completion,reviewEligible},{status:201});
  }catch(error){
    if(error instanceof Error&&error.message==='REQUEST_BODY_TOO_LARGE')return NextResponse.json({error:'送信内容が大きすぎます。'},{status:413});
    return NextResponse.json({error:'入力内容を確認してください。'},{status:400});
  }
}
