import { BuilderWorkspace } from '@/components/builder/BuilderWorkspace';
import { createClient } from '@/lib/supabase/server';
import { getDraftForSurvey, getSurvey } from '@/lib/data';
import type { BuilderBusinessType, BuilderContext } from '@/types/database';

export default async function NewSurvey({searchParams}:{searchParams:Promise<{session?:string;duplicate?:string}>}){
  const query=await searchParams;let initial:BuilderContext={};let sessionId:string|null=null;
  if(query.session){const s=await createClient();const {data}=await s.from('builder_sessions').select('id,context').eq('id',query.session).eq('status','in_progress').maybeSingle();if(data){initial=data.context as BuilderContext;sessionId=data.id;}}
  if(query.duplicate){const [survey,draft]=await Promise.all([getSurvey(query.duplicate),getDraftForSurvey(query.duplicate)]);if(survey&&draft){const businessType=(['clinic','restaurant','salon'].includes(survey.industry)?survey.industry:'other') as BuilderBusinessType;initial={purpose:'satisfaction',storeName:`${survey.name} のコピー`,businessType,startingPoint:'decided',template:'custom',questions:draft.questions,questionsConfirmed:true,anonymous:true,introText:draft.config.introText,mainColor:draft.config.primaryColor,themeId:draft.config.themeId,logoMode:draft.config.logoMode??(draft.config.logoUrl?'upload':'none'),logoUrl:draft.config.logoUrl,googleReviewEnabled:Boolean(draft.config.googleReviewUrl),googleReviewUrl:draft.config.googleReviewUrl,completionText:draft.config.completionText,sourceSurveyId:survey.id};}}
  return <BuilderWorkspace initial={initial} initialSessionId={sessionId}/>;
}
