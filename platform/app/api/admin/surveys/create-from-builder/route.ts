import {NextResponse} from 'next/server';
import {ruleBasedBuilderEngine} from '@/lib/builder/engine';
import {defaultConfig,normalizeQuestionFontSize,slugify,validateQuestion} from '@/lib/survey';
import {createClient} from '@/lib/supabase/server';
import {getThemeTemplate,themeIdForBusiness} from '@/lib/theme/templates';
import type {BuilderContext,SurveyQuestion} from '@/types/database';

const genericError='アンケートを作成できませんでした。もう一度お試しください。';

function jsonError(error:string,status:number){return NextResponse.json({error},{status})}
function errorCode(error:unknown){return typeof error==='object'&&error!==null&&'code' in error&&typeof error.code==='string'?error.code:undefined}
function logFailure(stage:string,error:unknown,surveyId:string|null,sessionId:string|null){
  console.error('[builder-create]',{stage,code:errorCode(error),surveyId,sessionIdPresent:Boolean(sessionId)});
}
function isQuestion(value:unknown):value is SurveyQuestion{
  if(!value||typeof value!=='object')return false;
  const question=value as Partial<SurveyQuestion>;
  return typeof question.id==='string'&&['single_choice','multiple_choice','rating_10','textarea','text'].includes(String(question.type))&&typeof question.title==='string'&&typeof question.description==='string'&&typeof question.required==='boolean'&&Boolean(question.settings)&&typeof question.settings==='object'&&Array.isArray(question.options)&&question.options.every(option=>Boolean(option)&&typeof option.label==='string'&&typeof option.value==='string');
}

export async function POST(request:Request){
  const s=await createClient();
  const {data:{user},error:authError}=await s.auth.getUser();
  if(authError||!user)return jsonError('ログインが必要です。',401);
  const {data:profile,error:profileError}=await s.from('profiles').select('role,is_active').eq('id',user.id).single();
  if(profileError||!profile||!profile.is_active||(profile.role!=='admin'&&profile.role!=='sales'))return jsonError('権限がありません。',403);

  let input:unknown;
  try{input=await request.json();}catch{return jsonError('入力内容を確認してください。',400)}
  if(!input||typeof input!=='object')return jsonError('入力内容を確認してください。',400);
  const body=input as {sessionId?:unknown;context?:unknown};
  if(body.sessionId!==null&&typeof body.sessionId!=='string')return jsonError('入力内容を確認してください。',400);
  if(!body.context||typeof body.context!=='object'||Array.isArray(body.context))return jsonError('入力内容を確認してください。',400);
  const sessionId=body.sessionId as string|null;
  const context=body.context as BuilderContext;
  let missing:string[];
  try{missing=ruleBasedBuilderEngine.getMissingFields(context);}catch{return jsonError('入力内容を確認してください。',400)}
  if(missing.length||!Array.isArray(context.questions)||context.questions.length===0)return jsonError('未確定の項目があります。',400);
  try{for(const question of context.questions){if(!isQuestion(question))return jsonError('質問内容を確認してください。',400);const validation=validateQuestion(question);if(validation)return jsonError('質問内容を確認してください。',400)}}catch{return jsonError('質問内容を確認してください。',400)}

  let surveyId:string|null=null;
  try{
    const name=context.storeName!.trim(),base=slugify(name)||`survey-${Date.now()}`;let slug=base;
    for(let n=2;n<100;n++){
      const {data,error}=await s.from('surveys').select('id').eq('slug',slug).maybeSingle();
      if(error){logFailure('surveys.slug-check',error,surveyId,sessionId);return jsonError(genericError,500)}
      if(!data)break;
      slug=`${base}-${n}`;
    }
    const {data:survey,error:surveyError}=await s.from('surveys').insert({name,slug,industry:context.businessType,owner_user_id:user.id,created_by:user.id,updated_by:user.id}).select('id').single();
    if(surveyError||!survey){logFailure('surveys.insert',surveyError,surveyId,sessionId);return jsonError(genericError,500)}
    surveyId=survey.id as string;

    const themeId=context.themeId??themeIdForBusiness(context.businessType!);const theme=getThemeTemplate(themeId);
    const heroLabel=context.heroLabel?.trim()||'QUESTIONNAIRE';
    const heroTitle=context.heroTitle?.trim()||theme.config.heroTitle;
    const heroSubtitle=context.heroSubtitle?.trim()||theme.config.heroSubtitle;
    const reviewUrl=context.googleReviewEnabled===true&&context.googleReviewUrl?.trim()?context.googleReviewUrl.trim():null;
    const config={...defaultConfig,...theme.config,themeId,title:heroTitle,heroLabel,heroTitle,heroSubtitle,introText:context.introText!,anonymousText:context.anonymous?'こちらのアンケートは匿名です。':'回答内容は運営者が確認します。',completionText:context.completionText!,questionFontSize:normalizeQuestionFontSize(context.questionFontSize),primaryColor:context.mainColor!,logoMode:context.logoMode,logoUrl:context.logoUrl??null,googleReviewMode:reviewUrl?'all' as const:'disabled' as const,googleReviewUrl:reviewUrl};
    const {data:version,error:versionError}=await s.from('survey_versions').insert({survey_id:surveyId,version:1,status:'draft',config,created_by:user.id}).select('id').single();
    if(versionError||!version){logFailure('survey_versions.insert',versionError,surveyId,sessionId);return jsonError(genericError,500)}

    for(const [index,q] of context.questions.entries()){
      const {data:created,error:questionError}=await s.from('questions').insert({survey_version_id:version.id,type:q.type,title:q.title.trim(),description:q.description.trim(),required:q.required,sort_order:index,settings:q.settings}).select('id').single();
      if(questionError||!created){logFailure('questions.insert',questionError,surveyId,sessionId);return jsonError(genericError,500)}
      if(q.options.length){
        const options=q.options.filter(option=>option.label.trim()).map((option,n)=>({question_id:created.id,label:option.label.trim(),value:option.value.trim()||`option-${n+1}`,sort_order:n}));
        const {error:optionError}=await s.from('question_options').insert(options);
        if(optionError){logFailure('question_options.insert',optionError,surveyId,sessionId);return jsonError(genericError,500)}
      }
    }
    const {error:draftError}=await s.from('surveys').update({current_draft_version_id:version.id}).eq('id',surveyId);
    if(draftError){logFailure('surveys.current_draft_version_id.update',draftError,surveyId,sessionId);return jsonError(genericError,500)}
    if(sessionId){
      const {data:completedSession,error:sessionError}=await s.from('builder_sessions').update({status:'completed',survey_id:surveyId,context,current_step:'completed',updated_at:new Date().toISOString()}).eq('id',sessionId).eq('user_id',user.id).eq('status','in_progress').select('id').maybeSingle();
      if(sessionError||!completedSession){logFailure('builder_sessions.completed.update',sessionError,surveyId,sessionId);return jsonError(genericError,500)}
    }
    return NextResponse.json({surveyId},{status:200});
  }catch(error){logFailure('unexpected',error,surveyId,sessionId);return jsonError(genericError,500)}
}
